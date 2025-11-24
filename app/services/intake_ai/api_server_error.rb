# frozen_string_literal: true

module IntakeAi
  # Raised when the AI service returns a server error (5xx)
  # This is a retriable error - operations may succeed on retry
  # @example
  #   raise ApiServerError, "Gemini API returned 503 Service Unavailable"
  class ApiServerError < Error; end
end
