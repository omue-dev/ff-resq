# frozen_string_literal: true

module IntakeAi
  # Raised for other temporary failures that may resolve on retry
  # This is a retriable error - operations may succeed on retry
  # @example
  #   raise TemporaryError, "Rate limit exceeded, retry after cooldown"
  class TemporaryError < Error; end
end
