require 'net/http'

class VetsController < ApplicationController
  def index
    # Get intake from params or session
    if params[:intake_id].present?
      @intake = Intake.find_by(id: params[:intake_id])
    elsif session[:intake_id].present?
      @intake = Intake.find_by(id: session[:intake_id])
    end
  end
end
