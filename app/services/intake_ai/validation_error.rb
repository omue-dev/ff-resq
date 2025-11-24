# frozen_string_literal: true

module IntakeAi
  # Raised when the AI response is missing required fields
  # This is a non-retriable error - operations will not succeed on retry
  # @example
  #   raise ValidationError, "Missing required field: 'species'"
  class ValidationError < Error; end
end
