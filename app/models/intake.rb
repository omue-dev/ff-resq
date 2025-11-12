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

    # --- Main AI processing in app/models/concerns/ai_processable.rb ---
  # AI_SUMMARY_SCHEMA
  # AI_SUMMARY_PROMPT
  # generate_ai_summary_async(pending_message_id: nil)
  # generate_ai_summary(pending_message_id)
  # handle_ai_failure(message_id:, fallback_text:, status_value:, payload:)
  include AiProcessable

  # --- Helpers ---
  def parsed_payload
    JSON.parse(raw_payload) rescue {}
  end

  # def analysis
  #   parsed_payload["analysis"] || {}
  # end

  # def user_message
  #   parsed_payload["user_message"]
  # end

  def error_message
    data = parsed_payload
    return unless data.is_a?(Hash)

    data.dig("error", "message") ||
      data["error"] ||
      data.dig(:error, :message)
  end

  private

  def assign_conversation_uuid
    self.conversation_uuid ||= SecureRandom.uuid
  end
end
