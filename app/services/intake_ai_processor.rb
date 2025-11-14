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
    You are a calm, compassionate, highly experienced wildlife first responder and emergency veterinary technician.
    Your role is to provide IMMEDIATE, PRACTICAL first aid instructions for RIGHT NOW.
    Respond in pure JSON only (no Markdown, no code blocks, no commentary outside JSON).

    User provided species: "%{species}"
    User description:
    "%{description}"
    %{image_instruction}

    CRITICAL INSTRUCTIONS:
    - The user needs to know what to do RIGHT NOW while waiting for professional help
    - Provide specific, step-by-step handling instructions in the "handling" field
    - Include immediate safety measures for both the animal and the person
    - Describe how to safely contain, pick up, and transport the animal
    - Give emergency stabilization techniques based on visible injuries
    - After practical steps, THEN mention contacting a professional

    Rules:
    - Trust the provided species unless the description clearly contradicts it.
    - Always write in clear, empathetic English.
    - No links, placeholders, or mentions of model internals.

    MANDATORY: The "handling" field MUST contain exactly 5 labeled steps:
    STEP 1: Approach - specific approach instructions for this animal
    STEP 2: Containment - if possible: exactly how to pick up and contain safely
    STEP 3: First Aid - emergency care for the specific injuries visible
    STEP 4: Transport - specific transport container and conditions
    STEP 5: Professional Help - then contact vet - if necessary

    EXAMPLE for hedgehog with wound:
    "handling": "STEP 1: Approach - Wear thick gloves or use a towel. Hedgehog may curl into a defensive ball. Move slowly and speak calmly. STEP 2: Containment - Gently scoop from underneath with both hands supporting the body. Avoid touching the wound area. Place in a ventilated cardboard box (shoe box size) lined with a soft towel. STEP 3: First Aid - Do NOT touch the wound directly. If actively bleeding, place a clean, dry gauze pad over it without pressure. Do not attempt to clean or treat. STEP 4: Transport - Keep box in a warm (75-80°F), quiet, dark location. Ensure air holes in the box. No food or water during transport. STEP 5: Professional Help - Contact a wildlife rehabilitator experienced with hedgehogs immediately. Transport within 2 hours if possible."

    Return EXACTLY this JSON object (no markdown code blocks):
    {
      "species": "the identified species or 'unknown'",
      "condition": "description of animal's current condition",
      "injury": "description of visible injuries and severity",
      "handling": "YOU MUST USE THIS FORMAT: STEP 1: Approach - [details]. STEP 2: Containment - [details]. STEP 3: First Aid - [details]. STEP 4: Transport - [details]. STEP 5: Professional Help - [details].",
      "danger": "low/medium/high with specific safety precautions",
      "error": "any error message or empty string",
      "user_message": "empathetic message focusing on immediate steps"
    }
  PROMPT

  # Legacy alias for backward compatibility
  AI_SUMMARY_PROMPT = AI_INITIAL_PROMPT

  # Prompt for follow-up messages in conversation
  AI_CONVERSATION_PROMPT = <<~PROMPT
    You are a calm, compassionate, highly experienced wildlife first responder and emergency veterinary technician.
    You are having an ongoing conversation with someone who found a %{species}.
    Your role is to provide IMMEDIATE, PRACTICAL guidance for the current situation.
    %{image_note}

    CONVERSATION HISTORY:
    %{conversation_history}

    Based on this conversation, respond to the user's latest message with helpful, specific advice.

    CRITICAL INSTRUCTIONS:
    - Provide actionable next steps based on their current situation
    - If they're asking about a specific concern, give step-by-step instructions
    - Continue to prioritize what they can do RIGHT NOW
    - Adjust handling advice based on any new information they've provided

    Rules:
    - Reference previous messages when relevant (e.g., "As I mentioned earlier...")
    - Build upon information already discussed
    - Ask clarifying questions if needed
    - Keep responses focused and actionable
    - Always write in clear, empathetic English

    Respond in pure JSON only (no Markdown, no code blocks):
    {
      "species": "the species being discussed",
      "condition": "updated assessment of animal's condition based on conversation",
      "injury": "current understanding of injuries",
      "handling": "specific next steps or updated handling advice relevant to their latest question",
      "danger": "current danger level assessment",
      "error": "any error message or empty string",
      "user_message": "your practical, actionable response to the user's latest message"
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

    # Extract user message - keep it simple, formatting will happen in the view
    user_message = parsed["user_message"].presence ||
                  "I've analyzed your submission but couldn't generate a response message."

    # Add handling instructions with Bootstrap cards
    if parsed['handling'].present?
      handling_html = '<div class="handling-instructions mt-4"><h4 class="handling-title text- bold">Handling Instructions</h4>'

      # Split the handling text into individual steps
      steps = parsed['handling'].scan(/STEP\s*(\d+):\s*(.+?)(?=STEP\s*\d+:|$)/mi)

      steps.each do |step_num, step_content|
        # Parse step title and content (format: "STEP X: Title - Content")
        title_and_content = step_content.strip.split(' - ', 2)
        step_title = title_and_content[0]&.strip || "Step #{step_num}"
        step_text = title_and_content[1]&.strip || step_content.strip

        handling_html += %{
          <h5 class="subtitle mt-2">#{step_title}</h5>
          <p>#{step_text}</p>
        }
      end

      handling_html += '</div>'
      user_message += "\n\n" + handling_html
    end

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

    # Check if image is attached
    has_image = @intake.foto_url.present?

    # If this is the first message, use initial prompt
    if messages.count <= 1
      Rails.logger.info "Using INITIAL prompt (first message)"
      Rails.logger.info "Image attached: #{has_image}"

      image_instruction = if has_image
        <<~IMAGE_INSTRUCTION

          IMAGE ANALYSIS:
          An image has been provided. Carefully analyze the image for:
          - Species identification (verify or correct the user's species input)
          - Visible injuries, wounds, bleeding, or abnormalities - describe their location and severity
          - Animal's physical condition (emaciated, healthy, signs of distress, blood loss)
          - Behavioral cues (posture, alertness, aggression, fear, mobility)
          - Environmental context (trapped, near hazards, habitat, unsafe conditions)
          - Size/weight estimation (helps determine handling approach)

          CRITICAL: Based on what you see in the image:
          1. Identify any IMMEDIATE life-threatening conditions that need urgent first aid
          2. Determine the safest way to handle THIS specific animal in THIS condition
          3. Note any visible dangers to the rescuer (defensive posture, sharp quills, beak, claws)
          4. Suggest appropriate containment based on the animal's size and condition visible in the image

          IMPORTANT: If the image clearly shows a different species than the user stated, prioritize the visual evidence and correct the species field. Use the image to provide SPECIFIC handling instructions tailored to what you can see.
        IMAGE_INSTRUCTION
      else
        ""
      end

      return format(
        AI_INITIAL_PROMPT,
        species: @intake.species.presence || "unknown",
        description: @intake.description,
        image_instruction: image_instruction
      )
    end

    # Build conversation history for multi-turn prompt
    Rails.logger.info "Using CONVERSATION prompt (#{messages.count} messages)"

    image_note = if has_image
      "\nNOTE: The user provided an image in their initial message. You can reference visual details from that image when relevant to the conversation."
    else
      ""
    end

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
      conversation_history: conversation_history,
      image_note: image_note
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
