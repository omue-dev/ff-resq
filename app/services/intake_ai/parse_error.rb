# frozen_string_literal: true

module IntakeAi
  # Raised when the AI response cannot be parsed as valid JSON
  # This is a non-retriable error - operations will not succeed on retry
  # @example
  #   raise ParseError, "Invalid JSON: unexpected token at '{incomplete'"
  class ParseError < Error; end
end
