# frozen_string_literal: true

module AppointmentServiceHelpers
  # Builds concise emergency descriptions for Twilio AI agent calls
  #
  # This class extracts and formats emergency information from intake records
  # and chat messages to create voice-friendly descriptions for Twilio calls.
  #
  # @example Building an emergency description
  #   builder = EmergencyDescriptionBuilder.new(intake)
  #   description = builder.build
  #   # => "The dog may have a broken leg and appears in pain."
  class EmergencyDescriptionBuilder
    # @param intake [Intake] The intake record with chat messages
    def initialize(intake)
      @intake = intake
    end

    # Builds a concise emergency description from chat messages
    #
    # Priority order:
    # 1. First sentence of AI assistant's assessment (preferred)
    # 2. User's description from chat messages (fallback)
    # 3. Generic species emergency message (last resort)
    #
    # @return [String] Emergency description (max 150 chars)
    def build
      if ai_assessment_available?
        build_from_ai_assessment
      elsif user_messages_available?
        build_from_user_messages
      else
        build_generic_description
      end
    end

    private

    # @return [Array<ChatMessage>] Ordered chat messages
    def messages
      @messages ||= @intake.chat_messages.order(created_at: :asc)
    end

    # @return [Boolean] Whether AI assessment is available
    def ai_assessment_available?
      ai_assessment.present?
    end

    # @return [Boolean] Whether user messages exist
    def user_messages_available?
      messages.any?
    end

    # @return [String, nil] First AI assessment message
    def ai_assessment
      @ai_assessment ||= messages
        .where(role: "assistant", pending: false)
        .first&.content
    end

    # Builds description from AI's assessment
    # @return [String] Formatted description
    def build_from_ai_assessment
      # Strip HTML tags for voice-friendly text
      text_only = ActionView::Base.full_sanitizer.sanitize(ai_assessment)

      # Extract just the first sentence (up to first period)
      first_sentence = text_only.split(/\.(?=\s|$)/).first

      # Ensure it ends with a period and isn't too long
      description = first_sentence.strip
      description += "." unless description.end_with?(".")
      description.truncate(150)
    end

    # Builds description from user's messages
    # @return [String] Formatted description
    def build_from_user_messages
      user_messages = messages.where(role: "user").pluck(:content).join(". ")
      "A #{@intake.species} with #{user_messages.truncate(100)}"
    end

    # Builds generic fallback description
    # @return [String] Generic description
    def build_generic_description
      "A #{@intake.species} emergency"
    end
  end
end
