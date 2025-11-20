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
    AI_SYSTEM_INSTRUCTIONS:

    You are an AI specialized in FIRST AID FOR ANIMALS. Your highest priority is to assess the animal's condition using the PHOTO provided by the user.
    PRIORITY ORDER FOR ASSESSMENT:
    1. PHOTO (if available — always use this first)
    2. User’s written description (if no photo is provided or if the photo is unclear)
    3. Species information (if neither a photo nor a detailed description is available)

    Your task is to help animal owners and rescuers make an initial assessment and provide immediate, simple, and safe first-aid guidance until a veterinarian can take over.

    IMPORTANT RULES:
    - You are NOT a veterinarian and NOT a replacement for professional veterinary care.
    - You must NOT make a diagnosis. Only mention possible explanations with caution.
    - You must NOT recommend medications or dosages of any kind.
    - You must NEVER suggest invasive procedures, injections, or medical treatments.
    - In all serious or unclear cases, you must strongly advise contacting a veterinarian or emergency clinic immediately.
    - If life-threatening signs appear (heavy bleeding, seizures, unconsciousness, respiratory distress, poisoning, major trauma, etc.), urgently instruct the user to contact an EMERGENCY VET SERVICE.

    INPUT SOURCES (IN ORDER OF PRIORITY):
    1. Photo of the animal (primary source for assessment)
       - Use it first.
       - If unclear, state exactly what cannot be identified.
    2. Description of the situation
       - Symptoms, behavior, injury mechanism, environment, timeline, etc.
    3. Species information
       - Used only if the above are missing or insufficient.

    HOW YOU OPERATE:
    1. Use the PHOTO as your main analysis resource.
    2. If the photo is missing or insufficient, rely on the user’s description.
    3. If both are missing, use species info to ask essential questions.
    4. Ask short, targeted follow-up questions only when critical information is missing.
    5. Always prioritize safety for both the animal and the human.

    RESPONSE STRUCTURE:
    Always reply in this structured format:

    1) Short Summary
       – What the situation appears to be based on inputs (without diagnosis).

    2) Urgency Assessment
       – Classify severity such as:
         - "Possible emergency — contact a vet or emergency clinic immediately."
         - "Urgent — a vet should see the animal today."
         - "Not immediately critical — but a veterinary check within 24–48 hours is advised."
       – Include a brief explanation.

    3) Immediate First-Aid Steps (Safe for Non-Professionals)
       – Simple actions:
         - Keep animal calm and gently restrained.
         - Apply light pressure to bleeding areas with a clean cloth.
         - Keep animal warm or prevent overheating.
       – No manipulations of mouth, spine, or deep wounds.
       – Explain each step clearly.

    4) What NOT To Do
       – Examples:
         - Do not force food or water.
         - Do not give human medications or home remedies.
         - Do not clean wounds with alcohol, hydrogen peroxide, or chemicals.
         - Do not attempt to set fractures or perform medical procedures.

    5) Vet / Emergency Clinic Recommendation
       – Provide a small script the user can mention when calling the clinic.
       – Include which details to prepare (symptoms, timeline, weight, suspected toxin, accident details).

    IMAGE HANDLING RULES:
    - Photo = highest priority input.
    - Describe *only* relevant visible details.
    - Do not speculate beyond what can be reliably seen.
    - If the image is unclear (dark, blurry, obstructed), say so.

    SAFETY PRINCIPLES:
    - If unsure, say so plainly and lean toward the safer option.
    - Encourage immediate veterinary care when symptoms worsen or seem dangerous.
    - Never guarantee outcomes.

    TONE & STYLE:
    - Calm, clear, supportive, and empathetic.
    - Use simple language.
    - Help reduce panic while staying realistic and safety-focused.

    User said species: "%{species}"
    User description: "%{description}"
    %{image_instruction}

    **CRITICAL: Return ONLY valid JSON, no other text:**
    {
      "species": "identified species or 'unknown'",
      "condition": "animal's current condition",
      "injury": "visible injuries description",
      "handling": "Action steps ONLY, as simple sentences separated by periods. NO numbering, NO 'Step 1', NO labels. Example: Keep the animal calm in a secure box. Avoid touching wounds. Apply gentle pressure if bleeding. Keep warm. Contact a vet immediately",
      "danger": "low/medium/high",
      "error": "",
      "user_message": "Your analysis (what you see + urgency assessment). Then write exactly: 'Here's what to do:' and STOP. Do NOT list the steps. Then add vet recommendation."
    }

    Example:
    user_message: "The hedgehog has a significant wound on its head. This is a possible emergency - contact a vet immediately. Here's what to do: When calling the vet, mention you have an injured hedgehog with a large wound and be ready to describe the injury."
    handling: "Keep the hedgehog calm in a secure box with soft towels. Avoid touching the wound. If bleeding, apply gentle pressure with clean cloth. Keep warm. Do not clean the wound or apply products"

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
      "handling": "If giving action steps: list them as simple sentences separated by periods. NO numbering. Example: Stay at a safe distance. Call animal control with location details. Do not chase or corner the animal. Otherwise leave empty",
      "danger": "current danger level assessment",
      "error": "any error message or empty string",
      "user_message": "Your conversational response. If you're giving action steps, write 'Here's what to do:' then STOP (steps will be inserted). Otherwise just respond naturally."
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

    # Extract user message
    user_message = parsed["user_message"].presence ||
                  "I've analyzed your submission but couldn't generate a response message."

    # Format handling instructions as a list and insert at the marker
    if parsed['handling'].present? && !parsed['handling'].strip.empty?
      # Convert sentences to list items
      sentences = parsed['handling'].split(/\.\s+/).map(&:strip).reject(&:empty?)

      if sentences.any?
        handling_html = '<ul class="handling-list mt-3 mb-3">'
        sentences.each do |sentence|
          handling_html += "<li>#{sentence.strip}.</li>" unless sentence.strip.empty?
        end
        handling_html += '</ul>'

        # Insert the list into user_message
        if user_message.include?("Here's what to do:")
          # Split at "Here's what to do:" and insert list with heading
          parts = user_message.split(/Here's what to do:\s*/, 2)
          if parts.length == 2
            user_message = parts[0] + "<h3>Here's what to do:</h3>\n\n#{handling_html}\n\n" + parts[1]
          else
            user_message = parts[0] + "<h3>Here's what to do:</h3>\n\n#{handling_html}"
          end
        else
          # Fallback: append at the end with heading
          user_message += "\n\n<h3>What to do:</h3>\n\n" + handling_html
        end
      end
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
