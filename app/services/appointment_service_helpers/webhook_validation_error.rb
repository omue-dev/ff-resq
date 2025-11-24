# frozen_string_literal: true

module AppointmentServiceHelpers
  # Raised when webhook data is invalid or missing required fields
  # This is a non-retriable error - indicates bad incoming data
  # @example
  #   raise WebhookValidationError, "Missing required field: call_sid"
  class WebhookValidationError < Error; end
end
