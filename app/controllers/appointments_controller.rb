# frozen_string_literal: true

# Handles appointment creation and management
#
# This controller provides endpoints for creating appointments via Twilio AI agent calls,
# checking appointment status, and resetting appointments in development mode.
#
# @see AppointmentService
# @see Appointment
class AppointmentsController < ApplicationController
  # Creates an appointment and initiates Twilio AI agent call
  #
  # This endpoint triggers the appointment workflow which creates an appointment
  # record and initiates a Twilio Studio Flow execution to call the veterinarian.
  #
  # @example POST request
  #   POST /appointments
  #   { "intake_id": 123 }
  #
  # @param intake_id [Integer] The ID of the intake to create appointment for
  # @return [JSON] Success response with appointment details or error message
  # @raise [ActiveRecord::RecordNotFound] If intake doesn't exist
  # @raise [AppointmentServiceHelpers::TwilioConnectionError] On Twilio connection timeout
  # @raise [AppointmentServiceHelpers::TwilioApiError] On Twilio API errors
  def create
    intake = Intake.find(params[:intake_id])

    begin
      appointment_service = AppointmentService.new(intake)
      appointment = appointment_service.create_appointment_call

      render json: {
        success: true,
        appointment_id: appointment.id,
        status: appointment.status
      }, status: :created
    rescue AppointmentServiceHelpers::TwilioConnectionError => e
      Rails.logger.error "Twilio connection failed: #{e.message}"
      render json: {
        success: false,
        error: "Connection timeout - please try again"
      }, status: :service_unavailable
    rescue AppointmentServiceHelpers::TwilioApiError => e
      Rails.logger.error "Twilio API error: #{e.message}"
      render json: {
        success: false,
        error: "Unable to initiate call - please contact support"
      }, status: :unprocessable_entity
    rescue ActiveRecord::RecordNotFound => e
      Rails.logger.error "Intake not found: #{e.message}"
      render json: {
        success: false,
        error: "Intake not found"
      }, status: :not_found
    rescue StandardError => e
      Rails.logger.error "Unexpected error creating appointment: #{e.message}"
      render json: {
        success: false,
        error: "An unexpected error occurred"
      }, status: :internal_server_error
    end
  end

  # Retrieves appointment details by ID
  #
  # @example GET request
  #   GET /appointments/123
  #
  # @param id [Integer] The appointment ID
  # @return [JSON] Appointment details including status and notes
  # @raise [ActiveRecord::RecordNotFound] If appointment doesn't exist
  def show
    appointment = Appointment.find(params[:id])

    render json: {
      id: appointment.id,
      status: appointment.status,
      notes: appointment.notes,
      confirmed: appointment.confirmed?
    }
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Appointment not found" }, status: :not_found
  end

  # Resets the most recent appointment to pending status (development only)
  #
  # This endpoint is intended for testing purposes only and should not be
  # available in production environments.
  #
  # @example POST request
  #   POST /appointments/reset
  #
  # @return [JSON] Success response with reset appointment details or error
  def reset
    # Find the most recent appointment and reset it to pending
    appointment = Appointment.order(created_at: :desc).first

    if appointment
      appointment.update!(
        status: "pending",
        notes: "Reset for testing"
      )

      render json: {
        success: true,
        message: "Appointment ##{appointment.id} reset to pending",
        appointment_id: appointment.id
      }
    else
      render json: {
        success: false,
        error: "No appointments found"
      }, status: :not_found
    end
  end
end
