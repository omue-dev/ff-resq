class AppointmentsController < ApplicationController
  # POST /appointments
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
    rescue => e
      Rails.logger.error "Failed to create appointment: #{e.message}"
      render json: {
        success: false,
        error: e.message
      }, status: :unprocessable_entity
    end
  end

  # GET /appointments/:id
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

  # POST /appointments/reset (development only)
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
