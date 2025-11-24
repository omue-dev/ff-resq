# frozen_string_literal: true

module IntakeAi
  # Builds context-aware prompts for AI processing of animal intake submissions
  #
  # This service generates prompts tailored to the conversation state:
  # - Initial prompts for first-time submissions (with detailed instructions)
  # - Conversation prompts for follow-up messages (with chat history)
  #
  # @example Building an initial prompt
  #   builder = IntakeAi::PromptBuilder.new(intake)
  #   prompt = builder.build
  #   # => Returns formatted initial prompt with species, description, and image instructions
  #
  # @example Building a conversation prompt
  #   builder = IntakeAi::PromptBuilder.new(intake_with_history)
  #   prompt = builder.build
  #   # => Returns conversation prompt with full message history
  class PromptBuilder
    # Maximum number of messages to consider as "initial" state
    INITIAL_MESSAGE_THRESHOLD = 1

    # @param intake [Intake] The intake record with associated chat messages
    # @param prompts_config [Hash, nil] Optional custom prompts configuration (for testing)
    def initialize(intake, prompts_config: nil)
      @intake = intake
      @prompts = prompts_config || load_prompts_config
    end

    # Builds a context-aware prompt based on conversation state
    #
    # @return [String] The formatted prompt ready for AI processing
    # @raise [IntakeAi::ConfigurationError] If prompts configuration is missing or invalid
    def build
      validate_configuration!

      if initial_message?
        build_initial_prompt
      else
        build_conversation_prompt
      end
    end

    private

    attr_reader :intake, :prompts

    # Loads prompt templates from YAML configuration
    #
    # @return [Hash] The prompts configuration hash
    def load_prompts_config
      config_path = Rails.root.join("config", "intake_ai_prompts.yml")
      YAML.load_file(config_path)
    rescue Errno::ENOENT
      raise IntakeAi::ConfigurationError, "Missing prompts configuration file: #{config_path}"
    rescue Psych::SyntaxError => e
      raise IntakeAi::ConfigurationError, "Invalid YAML in prompts configuration: #{e.message}"
    end

    # Validates that required prompt templates are present
    #
    # @raise [IntakeAi::ConfigurationError] If required keys are missing
    def validate_configuration!
      required_keys = %w[initial_prompt conversation_prompt image_instruction]
      missing_keys = required_keys - prompts.keys

      return if missing_keys.empty?

      raise IntakeAi::ConfigurationError,
            "Missing required prompt template(s): #{missing_keys.join(', ')}"
    end

    # Checks if this is an initial message (first interaction)
    #
    # @return [Boolean] True if message count is at or below threshold
    def initial_message?
      non_pending_messages_count <= INITIAL_MESSAGE_THRESHOLD
    end

    # Counts non-pending messages in the conversation
    #
    # @return [Integer] The count of finalized messages
    def non_pending_messages_count
      @non_pending_messages_count ||= intake.chat_messages.where(pending: false).count
    end

    # Checks if the intake has an attached photo
    #
    # @return [Boolean] True if foto_url is present
    def has_image?
      intake.foto_url.present?
    end

    # Builds the initial prompt for first-time submissions
    #
    # @return [String] Formatted initial prompt with species, description, and image instructions
    def build_initial_prompt
      Rails.logger.info "IntakeAi::PromptBuilder - Using INITIAL prompt (first message)"
      Rails.logger.info "IntakeAi::PromptBuilder - Image attached: #{has_image?}"

      format(
        prompts["initial_prompt"],
        species: intake.species.presence || "unknown",
        description: intake.description,
        image_instruction: image_instruction_text
      )
    end

    # Builds the conversation prompt for follow-up messages
    #
    # @return [String] Formatted conversation prompt with message history
    def build_conversation_prompt
      Rails.logger.info "IntakeAi::PromptBuilder - Using CONVERSATION prompt (#{non_pending_messages_count} messages)"

      format(
        prompts["conversation_prompt"],
        species: intake.species.presence || "unknown",
        conversation_history: formatted_conversation_history,
        image_note: image_note_text
      )
    end

    # Generates image instruction text for initial prompts
    #
    # @return [String] Image analysis instructions or empty string
    def image_instruction_text
      return "" unless has_image?

      prompts["image_instruction"]
    end

    # Generates image note text for conversation prompts
    #
    # @return [String] Note about image availability or empty string
    def image_note_text
      return "" unless has_image?

      prompts["image_note"]
    end

    # Formats conversation history as a string for AI context
    #
    # @return [String] Formatted message history with role labels
    def formatted_conversation_history
      messages = intake.chat_messages
                       .where(pending: false)
                       .order(:created_at)

      messages.map { |msg| format_message(msg) }.join("\n\n")
    end

    # Formats a single message with role label
    #
    # @param message [ChatMessage] The message to format
    # @return [String] Formatted message with role label
    def format_message(message)
      role_label = normalize_role(message.role)
      "#{role_label}: #{message.content}"
    end

    # Normalizes message role to uppercase label
    #
    # @param role [String, nil] The message role
    # @return [String] Uppercase role label (USER, ASSISTANT, or UNKNOWN)
    def normalize_role(role)
      return "UNKNOWN" if role.blank?

      case role.upcase
      when "USER" then "USER"
      when "ASSISTANT" then "ASSISTANT"
      else "UNKNOWN"
      end
    end
  end
end
