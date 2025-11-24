# frozen_string_literal: true

module AppointmentServiceHelpers
  # Raised when Twilio API returns an error response
  # This may or may not be retriable depending on the error
  # @example
  #   raise TwilioApiError, "Invalid phone number format"
  class TwilioApiError < Error; end
end
