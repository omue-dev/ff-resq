# frozen_string_literal: true

module IntakeAi
  # Base error class for all IntakeAi-related exceptions
  class Error < StandardError; end

  # ============================================================================
  # RETRIABLE ERRORS
  # These errors indicate transient failures that may succeed on retry
  # ============================================================================

  # Raised when there's a network connectivity issue with the AI service
  # @example
  #   raise ApiConnectionError, "Connection timeout after 60s"
  class ApiConnectionError < Error; end

  # Raised when the AI service returns a server error (5xx)
  # @example
  #   raise ApiServerError, "Gemini API returned 503 Service Unavailable"
  class ApiServerError < Error; end

  # Raised for other temporary failures that may resolve on retry
  # @example
  #   raise TemporaryError, "Rate limit exceeded, retry after cooldown"
  class TemporaryError < Error; end

  # ============================================================================
  # NON-RETRIABLE ERRORS
  # These errors indicate permanent failures that won't succeed on retry
  # ============================================================================

  # Raised when the AI response cannot be parsed as valid JSON
  # @example
  #   raise ParseError, "Invalid JSON: unexpected token at '{incomplete'"
  class ParseError < Error; end

  # Raised when the AI response is missing required fields
  # @example
  #   raise ValidationError, "Missing required field: 'species'"
  class ValidationError < Error; end

  # Raised when the service is misconfigured (missing API keys, etc.)
  # @example
  #   raise ConfigurationError, "GEMINI_API_KEY environment variable not set"
  class ConfigurationError < Error; end
end
