require "net/http"
require "json"
require "securerandom"

class Intake < ApplicationRecord
  # --- Validations ---
  # Ensure form inputs are not empty before saving
  validates :species, presence: true
  validates :description, presence: true, length: { maximum: 2000 }

  # --- Associations ---
  # One intake can have many chat messages (user + AI)
  has_many :chat_messages, dependent: :destroy

  # --- Callbacks ---
  before_create :assign_conversation_uuid   # gives every intake a unique ID
  after_create_commit :generate_ai_summary_async      # triggers AI once record is saved

  # --- AI Config ---
  # Schema of what we expect Gemini to return
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

# Main AI prompt — defines tone, structure, and output
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
  # Parse and extract AI response for controller/view
  def parsed_payload
    JSON.parse(raw_payload) rescue {}
  end

  def analysis
    parsed_payload["analysis"] || {}
  end

  def user_message
    parsed_payload["user_message"]
  end

  # Extract error message if available
  def error_message
    data = parsed_payload
    return unless data.is_a?(Hash)

    data.dig("error", "message") ||
      data["error"] ||
      data.dig(:error, :message)
  end

  private

  # Assigns a UUID for conversation tracking
  def assign_conversation_uuid
    self.conversation_uuid ||= SecureRandom.uuid
  end

  # --- Main AI processing ---
  def generate_ai_summary_async
    Thread.new do
      Rails.application.executor.wrap do  # This is critical!
        ActiveRecord::Base.connection_pool.with_connection do
          generate_ai_summary
        end
      end
    end
  end

def generate_ai_summary
  prompt = format(
    AI_SUMMARY_PROMPT,
    species: species.presence || "unknown",
    description: description
  )
  client = GeminiClient.new

  ai_data = client.generate_content(prompt, image_url: foto_url.presence)

  # Extract the text response
  ai_text = ai_data.dig("candidates", 0, "content", "parts", 0, "text")

  # Log the raw response for debugging
  Rails.logger.info "Gemini raw response: #{ai_data.inspect}"
  Rails.logger.info "Extracted text: #{ai_text}"

  # Strip markdown code blocks before parsing
  cleaned_text = ai_text.to_s
    .gsub(/^```json\s*\n?/, '')  # Remove opening ```json
    .gsub(/\n?```\s*$/, '')      # Remove closing ```
    .strip

  Rails.logger.info "Cleaned text: #{cleaned_text}"

  # Parse the JSON response
  parsed = JSON.parse(cleaned_text)

  # Extract user message with fallback
  user_message = parsed["user_message"].presence ||
                 "I've analyzed your submission but couldn't generate a response message."

  # Store Gemini response as a chat message
  chat_messages.create!(
    role: "assistant",
    content: user_message
  )

  # Save the full AI payload for later reference
  update!(status: "responded", raw_payload: ai_data.to_json)

  rescue JSON::ParserError => e
    Rails.logger.error "Gemini JSON parse error for Intake #{id}: #{e.message}"
    Rails.logger.error "Raw text was: #{ai_text}"
    Rails.logger.error "Cleaned text was: #{cleaned_text}"

    chat_messages.create!(
      role: "assistant",
      content: "I received a response but couldn't parse it properly. Please try again."
    )

    update!(
      status: "error",
      raw_payload: { error: "JSON parse error: #{e.message}", raw_text: ai_text }.to_json
    )

  rescue => e
    Rails.logger.error "Gemini failed for Intake #{id}: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")

    chat_messages.create!(
      role: "assistant",
      content: "Sorry, I'm having trouble analyzing that right now."
    )

    update!(
      status: "error",
      raw_payload: { error: e.message }.to_json
    )
  end
end
