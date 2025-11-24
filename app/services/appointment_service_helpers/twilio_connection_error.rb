# frozen_string_literal: true

module AppointmentServiceHelpers
  # Raised when there's a network connectivity issue with Twilio
  # This is a retriable error - operations may succeed on retry
  # @example
  #   raise TwilioConnectionError, "Connection timeout after 60s"
  class TwilioConnectionError < Error; end
end
