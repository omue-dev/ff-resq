# frozen_string_literal: true

module IntakeAi
  # Raised when the service is misconfigured (missing API keys, etc.)
  # This is a non-retriable error - operations will not succeed on retry
  # @example
  #   raise ConfigurationError, "GEMINI_API_KEY environment variable not set"
  class ConfigurationError < Error; end
end
