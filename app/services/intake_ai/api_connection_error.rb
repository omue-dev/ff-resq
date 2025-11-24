# frozen_string_literal: true

module IntakeAi
  # Raised when there's a network connectivity issue with the AI service
  # This is a retriable error - operations may succeed on retry
  # @example
  #   raise ApiConnectionError, "Connection timeout after 60s"
  class ApiConnectionError < Error; end
end
