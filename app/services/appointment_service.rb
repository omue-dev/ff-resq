class AppointmentService
  def initialize(intake)
    @intake = intake
  end

  # Creates an appointment and triggers the Twilio AI agent call
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
      vet_number = "+4915123612878" # Your phone number (to)

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
    rescue => e
      Rails.logger.error "Failed to initiate Twilio call: #{e.message}"
      appointment.update!(
        status: "cancelled",
        notes: "Failed to initiate call: #{e.message}"
      )
      raise e
    end
  end

  # Process the callback from Twilio webhook
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

  def build_emergency_description
    # Get the AI assistant's assessment from chat messages
    messages = @intake.chat_messages.order(created_at: :asc)

    # Find the AI's response which contains the urgency assessment
    ai_assessment = messages.where(role: "assistant", pending: false).last&.content

    if ai_assessment.present?
      # Strip HTML tags and extract first sentence only for concise voice call
      text_only = ActionView::Base.full_sanitizer.sanitize(ai_assessment)

      # Extract just the first sentence (up to first period)
      first_sentence = text_only.split(/\.(?=\s|$)/).first

      # Ensure it ends with a period and isn't too long
      description = first_sentence.strip
      description += "." unless description.end_with?(".")
      description.truncate(150)
    elsif messages.any?
      # Fallback to user description if AI hasn't responded yet
      user_messages = messages.where(role: "user").pluck(:content).join(". ")
      "A #{@intake.species} with #{user_messages.truncate(100)}"
    else
      # Last resort fallback
      "A #{@intake.species} emergency"
    end
  end
end
