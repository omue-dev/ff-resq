module Api
  module V1
    class TwilioController < ApplicationController
      skip_before_action :verify_authenticity_token
      before_action :verify_twilio_signature, unless: -> { Rails.env.development? && ENV["SKIP_TWILIO_VERIFICATION"] == "true" }

      # Webhook endpoint for Twilio to send appointment callback data
      def appointment_callback
        log_webhook_received("appointment_callback", callback_params)

        appointment = AppointmentService.process_callback(callback_params)

        if appointment
          render json: { success: true, appointment_id: appointment.id }, status: :ok
        else
          render json: { success: false, error: "Appointment not found" }, status: :not_found
        end
      rescue StandardError => e
        log_webhook_error("appointment_callback", e)
        render json: { success: false, error: "Internal server error" }, status: :internal_server_error
      end

      # Handle call status updates
      def voice_status
        log_webhook_received("voice_status", status_params)

        appointment = AppointmentService.process_status_update(status_params)

        if appointment
          render json: { success: true, appointment_id: appointment.id }, status: :ok
        else
          head :ok # Return 200 even if appointment not found to avoid Twilio retries
        end
      rescue StandardError => e
        log_webhook_error("voice_status", e)
        head :ok # Return 200 to prevent Twilio retries on our internal errors
      end

      private

      def callback_params
        params.permit(:call_sid, :speech_result, :intake_id).to_h.with_indifferent_access
      end

      def status_params
        params.permit(:CallSid, :CallStatus, :CallDuration, :RecordingUrl, :RecordingSid).to_h.with_indifferent_access
      end

      def log_webhook_received(endpoint, webhook_params)
        return unless Rails.env.development?

        Rails.logger.info "Twilio webhook: #{endpoint}"
        Rails.logger.info "Params: #{webhook_params.inspect}"
      end

      def log_webhook_error(endpoint, error)
        Rails.logger.error "Twilio webhook error (#{endpoint}): #{error.message}"
        Rails.logger.error error.backtrace.first(5).join("\n") if Rails.env.development?
      end

      def verify_twilio_signature
        auth_token = ENV["TWILIO_AUTH_TOKEN"]

        unless auth_token.present?
          Rails.logger.error "TWILIO_AUTH_TOKEN not configured"
          head :forbidden
          return
        end

        signature = request.headers["X-Twilio-Signature"]

        unless signature.present?
          Rails.logger.error "Missing Twilio signature header"
          head :forbidden
          return
        end

        url = request.original_url
        post_params = request.POST

        # Compute expected signature
        data = url + post_params.sort.map { |k, v| "#{k}#{v}" }.join
        expected_signature = Base64.strict_encode64(
          OpenSSL::HMAC.digest("sha1", auth_token, data)
        )

        unless secure_compare(signature, expected_signature)
          Rails.logger.error "Invalid Twilio signature"
          head :forbidden
        end
      end

      # Constant-time string comparison to prevent timing attacks
      def secure_compare(a, b)
        return false unless a.bytesize == b.bytesize

        l = a.unpack("C*")
        r = b.unpack("C*")
        result = 0

        l.zip(r) { |x, y| result |= x ^ y }
        result.zero?
      end
    end
  end
end
