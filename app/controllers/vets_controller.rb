# frozen_string_literal: true

# Handles veterinarian location and contact display
#
# This controller displays a map interface showing nearby veterinary clinics
# with emergency contact information.
#
# @see Intake
class VetsController < ApplicationController
  # Displays the veterinarian locations map
  #
  # Shows an interactive map with nearby vet clinics. The intake context
  # is retrieved from params or session to show relevant location data.
  #
  # @param intake_id [Integer] Optional intake ID to load context
  # @return [HTML] Renders the vets map view
  def index
    # Get intake from params or session
    if params[:intake_id].present?
      @intake = Intake.find_by(id: params[:intake_id])
    elsif session[:intake_id].present?
      @intake = Intake.find_by(id: session[:intake_id])
    end
  end
end
