# frozen_string_literal: true

# Centralized helpers for enabling/disabling the AI assistant.
module AiAssistant
  DISABLED_MESSAGE = "The assistant is currently disabled. Please try again later."

  class << self
    def disabled?
      ENV["DISABLE_GEMINI_CHAT"] == "true"
    end

    def enabled?
      !disabled?
    end

    def disabled_message
      ENV["AI_ASSISTANT_DISABLED_MESSAGE"].presence || DISABLED_MESSAGE
    end

    # Marks an intake as disabled and ensures a user-visible assistant message exists.
    #
    # @param intake [Intake]
    # @param pending_message_id [Integer, nil]
    # @return [ChatMessage] The assistant message reflecting the disabled state
    def handle_disabled!(intake, pending_message_id: nil)
      assistant_message = intake.chat_messages.find_by(id: pending_message_id)
      assistant_message ||= intake.chat_messages.create!(
        role: "assistant",
        content: disabled_message,
        pending: false
      )

      assistant_message.update!(content: disabled_message, pending: false)

      intake.update!(
        status: IntakeAiProcessor::STATUS_ERROR,
        raw_payload: {
          error: disabled_message,
          error_type: "AssistantDisabled"
        }.to_json
      )

      assistant_message
    end
  end
end
