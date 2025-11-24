# frozen_string_literal: true

# Orchestrates appointment creation and Twilio AI agent calls
#
# This service handles the complete appointment workflow: creating appointment
# records, initiating Twilio AI agent calls to veterinarians, and processing
# webhook callbacks from Twilio.
#
# The service delegates specialized tasks to collaborator classes:
# - {AppointmentServiceHelpers::EmergencyDescriptionBuilder} builds voice-friendly descriptions
#
# @example Create an appointment and initiate call
#   service = AppointmentService.new(intake)
#   appointment = service.create_appointment_call
#
# @example Process webhook callback
#   appointment = AppointmentService.process_callback(params)
class AppointmentService
  # @param intake [Intake] The intake record to create appointment for
  def initialize(intake)
    @intake = intake
  end

  # Creates an appointment and triggers the Twilio AI agent call
  #
  # This method:
  # 1. Builds emergency description from chat messages
  # 2. Creates appointment record with pending status
  # 3. Initiates Twilio Studio Flow execution
  # 4. Updates appointment with Twilio response
  #
  # @return [Appointment] The created appointment record
  # @raise [AppointmentServiceHelpers::TwilioConnectionError] On network/timeout errors
  # @raise [AppointmentServiceHelpers::TwilioApiError] On Twilio API errors
  def create_appointment_call
    # Build emergency description from chat messages
    emergency_description = build_emergency_description

    # Delete existing appointment if any (to allow creating a new one)
    @intake.appointment&.destroy

    # Create pending appointment record
    appointment = @intake.create_appointment!(
      status: "pending",
      notes: "AI agent call initiated"
    )

    # Check if test mode is enabled (for testing without making real calls)
    if ENV["APPOINTMENT_TEST_MODE"] == "true"
      Rails.logger.info "TEST MODE: Skipping Twilio call for intake #{@intake.id}"
      appointment.update!(
        twilio_call_sid: "TEST_#{SecureRandom.hex(8)}",
        twilio_payload: { test_mode: true }
      )
      return appointment
    end

    # Trigger Twilio Studio Flow
    begin
      twilio_client = TwilioClient.new
      twilio_number = ENV["TWILIO_PHONE_NUMBER"] # Caller ID (from)
      vet_number = ENV["VETS_PHONE_NUMBER"] # Vets phone number (to)

      response = twilio_client.initiate_execution(
        to: vet_number,
        from: twilio_number,
        parameters: {
          intake_id: @intake.id,
          emergency_description: emergency_description,
          pet_species: @intake.species
        }
      )

      # Store Twilio response
      appointment.update!(
        twilio_call_sid: response["sid"],
        twilio_payload: response
      )

      Rails.logger.info "Twilio call initiated for intake #{@intake.id}, call SID: #{response['sid']}"
      appointment
    rescue Timeout::Error, Net::OpenTimeout, Net::ReadTimeout => e
      Rails.logger.error "Twilio connection timeout: #{e.message}"
      appointment.update!(
        status: "cancelled",
        notes: "Connection timeout: #{e.message}"
      )
      raise AppointmentServiceHelpers::TwilioConnectionError, "Twilio API timeout: #{e.message}"
    rescue StandardError => e
      Rails.logger.error "Twilio API error: #{e.message}"
      appointment.update!(
        status: "cancelled",
        notes: "API error: #{e.message}"
      )
      raise AppointmentServiceHelpers::TwilioApiError, "Twilio API error: #{e.message}"
    end
  end

  # Process the callback from Twilio webhook
  #
  # Finds the appointment by call_sid or intake_id and marks it as confirmed.
  # Updates appointment notes with speech result from Twilio.
  #
  # @param params [Hash] Webhook parameters from Twilio
  # @option params [String] :call_sid Twilio call SID
  # @option params [String] :speech_result AI agent speech result
  # @option params [String] :intake_id Related intake ID
  # @return [Appointment, nil] Updated appointment or nil if not found
  def self.process_callback(params)
    call_sid = params[:call_sid].presence
    speech_result = params[:speech_result]
    intake_id = params[:intake_id].presence

    Rails.logger.info "Looking for appointment with call_sid='#{call_sid}', intake_id='#{intake_id}'"

    # Try to find appointment by call_sid first, then by intake_id, then most recent pending
    appointment = if call_sid.present?
      Appointment.find_by(twilio_call_sid: call_sid)
    elsif intake_id.present?
      # Find the most recent pending appointment for this intake
      Intake.find(intake_id).appointment
    else
      # Last resort: find the most recent pending appointment
      Rails.logger.warn "No call_sid or intake_id provided, finding most recent pending appointment"
      Appointment.where(status: "pending").order(created_at: :desc).first
    end

    unless appointment
      Rails.logger.error "Appointment not found for call SID: #{call_sid}, intake_id: #{intake_id}"
      return nil
    end

    Rails.logger.info "Found appointment ##{appointment.id}"

    appointment.update!(
      status: "confirmed",
      notes: speech_result.presence || "Appointment confirmed via AI agent",
      twilio_payload: appointment.twilio_payload.merge(callback: params.to_h)
    )

    Rails.logger.info "Appointment confirmed for intake #{intake_id}"
    appointment
  end

  # Process voice status updates from Twilio
  #
  # Updates appointment record with call status from Twilio (ringing, in-progress, completed, etc.)
  #
  # @param params [Hash] Status update parameters from Twilio
  # @option params [String] :CallSid Twilio call SID
  # @option params [String] :CallStatus Call status (ringing, in-progress, completed, etc.)
  # @return [Appointment, nil] Updated appointment or nil if not found
  def self.process_status_update(params)
    call_sid = params[:CallSid]
    call_status = params[:CallStatus]

    return nil unless call_sid.present?

    appointment = Appointment.find_by(twilio_call_sid: call_sid)
    return nil unless appointment

    appointment.update!(
      twilio_payload: appointment.twilio_payload.merge(status_update: params.to_h)
    )

    Rails.logger.info "Updated appointment ##{appointment.id} status: #{call_status}"
    appointment
  end

  private

  # Builds emergency description using the EmergencyDescriptionBuilder
  #
  # @return [String] Formatted emergency description
  def build_emergency_description
    AppointmentServiceHelpers::EmergencyDescriptionBuilder.new(@intake).build
  end
end
