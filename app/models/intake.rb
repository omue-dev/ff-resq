require "net/http"
require "json"
require "securerandom"

class Intake < ApplicationRecord
  # --- Validations ---
  validates :species, presence: true
  validates :description, presence: true, length: { maximum: 2000 }

  # --- Associations ---
  has_many :chat_messages, dependent: :destroy

  # --- Callbacks ---
  before_create :assign_conversation_uuid

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

  # --- Helpers ---
  def parsed_payload
    JSON.parse(raw_payload) rescue {}
  end

  def analysis
    parsed_payload["analysis"] || {}
  end

  def user_message
    parsed_payload["user_message"]
  end

  def error_message
    data = parsed_payload
    return unless data.is_a?(Hash)

    data.dig("error", "message") ||
      data["error"] ||
      data.dig(:error, :message)
  end

  # --- Main AI processing ---
  def generate_ai_summary_async(pending_message_id: nil)
    Rails.logger.info "🎬 Starting async Gemini call for Intake #{id}, Message #{pending_message_id}"

    Concurrent::Future.execute do
      begin
        ActiveRecord::Base.connection_pool.with_connection do
          Timeout.timeout(20) do
            Rails.logger.info "⏰ Timeout wrapper started (20s max)"
            generate_ai_summary(pending_message_id: pending_message_id)
            Rails.logger.info "✅ Timeout wrapper completed successfully"
          end
        end
      rescue Timeout::Error => e
        Rails.logger.error "⏱️ TIMEOUT ERROR for Intake #{id}: #{e.message}"
        handle_ai_failure(
          message_id: pending_message_id,
          fallback_text: "The analysis took too long. Please try again later.",
          status_value: "timeout",
          payload: { error: "AI request timed out" }
        )
      rescue => e
        Rails.logger.error "❌ EXCEPTION in async for Intake #{id}: #{e.class} - #{e.message}"
        Rails.logger.error "   Backtrace: #{e.backtrace.first(10).join("\n   ")}"
        handle_ai_failure(
          message_id: pending_message_id,
          fallback_text: "Sorry, something went wrong: #{e.message}",
          status_value: "error",
          payload: { error: e.message, class: e.class.to_s, backtrace: e.backtrace.first(5) }
        )
      end
    end
  end

  def generate_ai_summary(pending_message_id: nil)
    Rails.logger.info "=" * 80
    Rails.logger.info "🚀 GEMINI CALL START"
    Rails.logger.info "   Intake ID: #{id}"
    Rails.logger.info "   Message ID: #{pending_message_id}"
    Rails.logger.info "=" * 80

    prompt = format(
      AI_SUMMARY_PROMPT,
      species: species.presence || "unknown",
      description: description
    )

    Rails.logger.info "📤 Sending request to Gemini..."
    client = GeminiClient.new
    ai_data = client.generate_content(prompt, image_url: foto_url.presence)
    Rails.logger.info "📥 Received response from Gemini"

    # Extract the text response
    ai_text = ai_data.dig("candidates", 0, "content", "parts", 0, "text")
    Rails.logger.info "Gemini raw response: #{ai_data.inspect}"
    Rails.logger.info "Extracted text: #{ai_text}"

    # Strip markdown code blocks before parsing
    cleaned_text = ai_text.to_s
                         .gsub(/^```json\s*\n?/, "")
                         .gsub(/\n?```\s*$/, "")
                         .strip
    Rails.logger.info "Cleaned text: #{cleaned_text}"

    # Parse the JSON response
    parsed = JSON.parse(cleaned_text)

    # Extract user message with fallback
    user_message = parsed["user_message"].presence ||
                   "I've analyzed your submission but couldn't generate a response message."

    Rails.logger.info "🔍 Finding message #{pending_message_id}..."
    # Update the placeholder message (or create one if we couldn't find it)
    response_message = chat_messages.find_by(id: pending_message_id)

    if response_message
      Rails.logger.info "   Found message: #{response_message.id}"
      Rails.logger.info "   Current pending status: #{response_message.pending?}"
      Rails.logger.info "   Current content: #{response_message.content}"
    else
      Rails.logger.warn "   ⚠️ Message #{pending_message_id} not found! Creating new one..."
      response_message = chat_messages.create!(role: "assistant", pending: true)
    end

    Rails.logger.info "📝 Updating message..."
    update_result = response_message.update!(content: user_message, pending: false)

    Rails.logger.info "   Update successful: #{update_result}"
    Rails.logger.info "   New content: #{response_message.content}"
    Rails.logger.info "   New pending status: #{response_message.pending?}"

    # Double-check by reloading from DB
    response_message.reload
    Rails.logger.info "   After reload - pending: #{response_message.pending?}"

    # Save the full AI payload for later reference
    Rails.logger.info "💾 Saving raw payload to Intake..."
    update!(status: "responded", raw_payload: ai_data.to_json)

    Rails.logger.info "=" * 80
    Rails.logger.info "✅ GEMINI CALL SUCCESS"
    Rails.logger.info "   Intake status: #{status}"
    Rails.logger.info "   Message pending: #{response_message.pending?}"
    Rails.logger.info "=" * 80

  rescue JSON::ParserError => e
    Rails.logger.error "❌ JSON PARSE ERROR for Intake #{id}: #{e.message}"
    Rails.logger.error "   Raw text was: #{ai_text}"
    Rails.logger.error "   Cleaned text was: #{cleaned_text}"

    handle_ai_failure(
      message_id: pending_message_id,
      fallback_text: "I received a response but couldn't parse it properly. Please try again.",
      status_value: "error",
      payload: { error: "JSON parse error: #{e.message}", raw_text: ai_text }
    )

  rescue => e
    Rails.logger.error "❌ GENERAL ERROR in generate_ai_summary for Intake #{id}: #{e.message}"
    Rails.logger.error "   Backtrace: #{e.backtrace.join("\n   ")}"

    handle_ai_failure(
      message_id: pending_message_id,
      fallback_text: "Sorry, I'm having trouble analyzing that right now.",
      status_value: "error",
      payload: { error: e.message, class: e.class.to_s }
    )
  end

  private

  def assign_conversation_uuid
    self.conversation_uuid ||= SecureRandom.uuid
  end

  def handle_ai_failure(message_id:, fallback_text:, status_value:, payload:)
    Rails.logger.error "🚨 HANDLING AI FAILURE"
    Rails.logger.error "   Message ID: #{message_id}"
    Rails.logger.error "   Status: #{status_value}"
    Rails.logger.error "   Payload: #{payload.inspect}"

    response_message = chat_messages.find_by(id: message_id)

    if response_message
      Rails.logger.info "   Found message, updating to error state..."
      response_message.update!(content: fallback_text, pending: false)
      Rails.logger.info "   Message pending after error: #{response_message.reload.pending?}"
    else
      Rails.logger.warn "   ⚠️ Message #{message_id} not found, creating error message..."
      response_message = chat_messages.create!(
        role: "assistant",
        content: fallback_text,
        pending: false
      )
    end

    update!(
      status: status_value,
      raw_payload: payload.to_json
    )

    Rails.logger.info "   Intake status updated to: #{status}"
  end
end
