require "net/http"
require "json"
require "securerandom"

class Intake < ApplicationRecord
  # --- Validations ---
  validates :species, presence: true
  validates :description, presence: true, length: { maximum: 2000 }

  # --- Associations ---
  has_one_attached :photo
  has_many :chat_messages, dependent: :destroy

    # --- Main AI processing in app/services/intake_ai_processor.rb ---
  # AI_SUMMARY_SCHEMA
  # AI_SUMMARY_PROMPT
  # process_async(pending_message_id: nil)
  # generate_ai_summary(pending_message_id)
  # handle_ai_failure(message_id:, fallback_text:, status_value:, payload:)
  def generate_ai_summary_async(pending_message_id:)
    IntakeAiProcessor.new(self).process_async(pending_message_id: pending_message_id)
  end

  # --- Helpers ---
  def parsed_payload
    JSON.parse(raw_payload) rescue {}
  end

  # used in IntakesController &
  def error_message
    data = parsed_payload
    return unless data.is_a?(Hash)

    data.dig("error", "message") ||
      data["error"] ||
      data.dig(:error, :message)
  end
end
