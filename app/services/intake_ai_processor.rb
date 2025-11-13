# app/services/intake_ai_processor.rb
class IntakeAiProcessor
  def initialize(intake)
    @intake = intake
  end

  # --- AI Config ---
  AI_SUMMARY_SCHEMA = {
    type: "OBJECT",
    properties: {
      "species" => { type: "STRING" },
      "condition" => { type: "STRING" },
      "injury" => { type: "STRING" },
      "handling" => { type: "STRING" },
      "danger" => { type: "STRING" },
      "error" => { type: "STRING" },
      "user_message" => { type: "STRING" }
    },
    required: %w[species condition injury handling danger error user_message]
  }

  # Prompt for initial/first message
  AI_INITIAL_PROMPT = <<~PROMPT
    You are a calm, compassionate, highly experienced wildlife first responder.
    Respond in pure JSON only (no Markdown, no code blocks, no commentary outside JSON).

    User provided species: "%{species}"
    User description:
    "%{description}"

    Rules:
    - Trust the provided species unless the description clearly contradicts it. Only return "unknown" if the information is insufficient or conflicting.
    - Always write every field, including "user_message", in clear, empathetic English regardless of the input language.
    - No links, placeholders, or mentions of model internals or images.
    - If species is unknown, set "species":"unknown" and explain in "error".
    - ALWAYS provide a "user_message" - never leave it empty.

    Return EXACTLY this JSON object (no markdown code blocks):
    {
      "species": "the identified species or 'unknown'",
      "condition": "description of animal's condition",
      "injury": "description of injuries",
      "handling": "safe handling instructions",
      "danger": "danger level assessment",
      "error": "any error message or empty string",
      "user_message": "a helpful message to the user in English"
    }
  PROMPT

  # Legacy alias for backward compatibility
  AI_SUMMARY_PROMPT = AI_INITIAL_PROMPT

  # Prompt for follow-up messages in conversation
  AI_CONVERSATION_PROMPT = <<~PROMPT
    You are a calm, compassionate, highly experienced wildlife first responder.
    You are having an ongoing conversation with someone who found a %{species}.

    CONVERSATION HISTORY:
    %{conversation_history}

    Based on this conversation, respond to the user's latest message with helpful, specific advice.

    Rules:
    - Reference previous messages when relevant (e.g., "As I mentioned earlier...")
    - Build upon information already discussed
    - Ask clarifying questions if needed
    - Keep responses focused and actionable
    - Always write in clear, empathetic English

    Respond in pure JSON only (no Markdown, no code blocks):
    {
      "species": "the species being discussed",
      "condition": "updated assessment of animal's condition",
      "injury": "current understanding of injuries",
      "handling": "relevant handling advice for this stage",
      "danger": "current danger level assessment",
      "error": "any error message or empty string",
      "user_message": "your response to the user's latest message"
    }
  PROMPT

  # from IntakesController > intake.generate_ai_summary_async(pending_message_id: pending_message.id)
  # from Intake > def generate_ai_summary_async(pending_message_id:)
  def process_async(pending_message_id:)
    ProcessIntakeWithAiJob.perform_later(@intake.id, pending_message_id)
  end

  # from jobs > ProcessIntakeWithAiJob > IntakeAiProcessor.new(intake).generate_ai_summary
  def generate_ai_summary(pending_message_id: nil)
    Rails.logger.info "=" * 80
    Rails.logger.info "🚀 GEMINI CALL START"
    Rails.logger.info "   Intake ID: #{@intake.id}"
    Rails.logger.info "   Message ID: #{pending_message_id}"
    Rails.logger.info "=" * 80

    # ══════════════════════════════════════════════════════════════════════════
    # WORKFLOW PART 1: Get the pending message from DB (chat_messages table)
    # ══════════════════════════════════════════════════════════════════════════
    response_message = @intake.chat_messages.find_by(id: pending_message_id)

    if response_message
      Rails.logger.info "✅ Found message: #{response_message.id}"
    else
      Rails.logger.warn "⚠️ Message #{pending_message_id} not found! Creating new one..."
      response_message = @intake.chat_messages.create!(role: "assistant", pending: true)
    end

    # ══════════════════════════════════════════════════════════════════════════
    # WORKFLOW PART 2: Build context-aware prompt
    # ══════════════════════════════════════════════════════════════════════════
    prompt = build_prompt_with_context  # Calls private method below

    Rails.logger.info "Prompt length: #{prompt.length} characters"
    Rails.logger.info "Total messages in conversation: #{@intake.chat_messages.count}"

    # ══════════════════════════════════════════════════════════════════════════
    # WORKFLOW PART 3: Call Gemini API
    # ══════════════════════════════════════════════════════════════════════════
    Rails.logger.info "Sending request to Gemini..."
    client = GeminiClient.new
    ai_data = client.generate_content(prompt, image_url: @intake.foto_url.presence)
    Rails.logger.info "Received response from Gemini"

    # ══════════════════════════════════════════════════════════════════════════
    # WORKFLOW PART 4: Parse AI response
    # ══════════════════════════════════════════════════════════════════════════
    ai_text = ai_data.dig("candidates", 0, "content", "parts", 0, "text")

    # Strip markdown code blocks before parsing
    cleaned_text = ai_text.to_s
                        .gsub(/^```json\s*\n?/, "")
                        .gsub(/\n?```\s*$/, "")
                        .strip

    # Parse the JSON response
    parsed = JSON.parse(cleaned_text)

    # Extract user message with fallback
    user_message = parsed["user_message"].presence ||
                  "I've analyzed your submission but couldn't generate a response message."

    # ══════════════════════════════════════════════════════════════════════════
    # WORKFLOW PART 5: Update ChatMessage in DB (chat_messages table)
    # ══════════════════════════════════════════════════════════════════════════
    Rails.logger.info "Updating message..."
    response_message.update!(content: user_message, pending: false)

    # ══════════════════════════════════════════════════════════════════════════
    # WORKFLOW PART 6: Update Intake in DB (intakes table)
    # ══════════════════════════════════════════════════════════════════════════
    Rails.logger.info "Saving raw payload to Intake..."
    @intake.update!(status: "responded", raw_payload: ai_data.to_json)

    Rails.logger.info "=" * 80
    Rails.logger.info "✅ GEMINI CALL SUCCESS"
    Rails.logger.info "   Intake status: #{@intake.status}"
    Rails.logger.info "   Message pending: #{response_message.pending?}"
    Rails.logger.info "=" * 80

    rescue JSON::ParserError => e
      Rails.logger.error "❌ JSON PARSE ERROR for Intake #{@intake.id}: #{e.message}"
      Rails.logger.error "   Raw text was: #{ai_text}"
      Rails.logger.error "   Cleaned text was: #{cleaned_text}"

      handle_ai_failure(
        message_id: pending_message_id,
        fallback_text: "I received a response but couldn't parse it properly. Please try again.",
        status_value: "error",
        payload: { error: "JSON parse error: #{e.message}", raw_text: ai_text }
      )

    rescue => e
      Rails.logger.error "❌ GENERAL ERROR in generate_ai_summary for Intake #{@intake.id}: #{e.message}"
      Rails.logger.error "   Backtrace: #{e.backtrace.join("\n   ")}"

      handle_ai_failure(
        message_id: pending_message_id,
        fallback_text: "Sorry, I'm having trouble analyzing that right now.",
        status_value: "error",
        payload: { error: e.message, class: e.class.to_s }
      )
  end

  private

  # ══════════════════════════════════════════════════════════════════════════
  # Called in WORKFLOW PART 2
  # Builds either initial prompt or conversation prompt with full history
  # ══════════════════════════════════════════════════════════════════════════
  def build_prompt_with_context
    # Get all non-pending messages in chronological order
    messages = @intake.chat_messages
                      .where(pending: false)
                      .order(:created_at)

    # If this is the first message, use initial prompt
    if messages.count <= 1
      Rails.logger.info "Using INITIAL prompt (first message)"
      return format(
        AI_INITIAL_PROMPT,
        species: @intake.species.presence || "unknown",
        description: @intake.description
      )
    end

    # Build conversation history for multi-turn prompt
    Rails.logger.info "Using CONVERSATION prompt (#{messages.count} messages)"

    conversation_history = messages.map do |msg|
      # Safe role handling with fallback
      role_label = msg.role&.upcase || "UNKNOWN"
      role_label = "USER" if role_label == "USER"
      role_label = "ASSISTANT" if role_label == "ASSISTANT"

      "#{role_label}: #{msg.content}"
    end.join("\n\n")

    format(
      AI_CONVERSATION_PROMPT,
      species: @intake.species.presence || "unknown",
      conversation_history: conversation_history
    )
  end

  # Handle AI failures
  def handle_ai_failure(message_id:, fallback_text:, status_value:, payload:)
    Rails.logger.error "HANDLING AI FAILURE"
    Rails.logger.error "   Message ID: #{message_id}"
    Rails.logger.error "   Status: #{status_value}"
    Rails.logger.error "   Payload: #{payload.inspect}"

    response_message = @intake.chat_messages.find_by(id: message_id)

    if response_message
      Rails.logger.info "   Found message, updating to error state..."
      response_message.update!(content: fallback_text, pending: false)
      Rails.logger.info "   Message pending after error: #{response_message.reload.pending?}"
    else
      Rails.logger.warn "   Message #{message_id} not found, creating error message..."
      response_message = @intake.chat_messages.create!(
        role: "assistant",
        content: fallback_text,
        pending: false
      )
    end

    @intake.update!(
      status: status_value,
      raw_payload: payload.to_json
    )

    Rails.logger.info "   Intake status updated to: #{@intake.status}"
  end
end
