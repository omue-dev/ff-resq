# app/models/concerns/ai_processable.rb
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

  AI_SUMMARY_PROMPT = <<~PROMPT
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

  # from InatkesController > intake.generate_ai_summary_async(pending_message_id: pending_message.id)
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

    prompt = format(
      AI_SUMMARY_PROMPT,
      species: @intake.species.presence || "unknown",
      description: @intake.description
    )

    # send request to gemini
    Rails.logger.info "Sending request to Gemini..."
    client = GeminiClient.new
    ai_data = client.generate_content(prompt, image_url: @intake.foto_url.presence)
    Rails.logger.info "Received response from Gemini"

    # Extract the text response
    ai_text = ai_data.dig("candidates", 0, "content", "parts", 0, "text")

    # Strip markdown code blocks before parsing
    cleaned_text = ai_text.to_s
                         .gsub(/^```json\s*\n?/, "")
                         .gsub(/\n?```\s*$/, "")
                         .strip

    # Parse the JSON response (turn string into hash)
    # before:  cleaned_text = '{"species":"fox","condition":"injured","user_message":"Please keep the fox warm"}'
    # after: {"species"=>"fox", "condition"=>"injured", "user_message"=>"Please keep the fox warm"}
    parsed = JSON.parse(cleaned_text)

    # Extract user message with fallback
    user_message = parsed["user_message"].presence ||
                   "I've analyzed your submission but couldn't generate a response message."

    # Update the placeholder message (or create one if we couldn't find it)
    response_message = @intake.chat_messages.find_by(id: pending_message_id)

    if response_message
      Rails.logger.info "Found message: #{response_message.id}"
    else
      Rails.logger.warn "Message #{pending_message_id} not found! Creating new one..."
      response_message = @intake.chat_messages.create!(role: "assistant", pending: true)
    end

    Rails.logger.info "Updating message..."
    update_result = response_message.update!(content: user_message, pending: false)

    # Save the full AI payload for later reference
    Rails.logger.info "Saving raw payload to Intake..."
    @intake.update!(status: "responded", raw_payload: ai_data.to_json)

    Rails.logger.info "=" * 40
    Rails.logger.info "GEMINI CALL SUCCESS"
    Rails.logger.info "  Intake status: #{@intake.status}"
    Rails.logger.info "  Message pending: #{response_message.pending?}"
    Rails.logger.info "=" * 40

    # ExceptionHandler for parsed = JSON.parse(cleaned_text)
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

      # ExceptionHandler for all other errors
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

  # called in generate_Ai_summary_async
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
