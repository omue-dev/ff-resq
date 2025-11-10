class IntakesController < ApplicationController
  require "json"

  # --- Handles form submission ---
  def create
    # Extract form data safely and normalize it
    data = intake_params
    species     = data[:species].to_s.strip
    description = data[:description].to_s.strip
    foto_url    = data[:foto_url].to_s.strip
    mock        = ActiveModel::Type::Boolean.new.cast(data[:mock])

    # --- Mock mode: use static data for UI testing, no AI call ---
    if mock
      result = {
        analysis: {
          species: "hedgehog",
          condition: "very bad condition",
          injury: "large wound on the back",
          handling: "place it carefully in a box with a soft cloth",
          danger: "be careful, hedgehogs can bite",
          foto_url: "https://res.cloudinary.com/dtrtke9f2/image/upload/v1762606938/ltdwh0aldgwemqx8anvg.jpg"
        },
        user_message: "It looks like the hedgehog is in very bad condition, with a large wound on its back. Please handle it carefully — place it in a box lined with a soft cloth to keep it warm and safe. Avoid touching it directly, as hedgehogs can bite when stressed. Contact a local wildlife rescue center as soon as possible for proper treatment."
      }

      # Pass fake result directly to chat view (skips database + AI)
      redirect_to intake_chat_path(result: result.to_json)

    else
      # --- Real mode: store data in DB and let model handle AI ---
      intake = Intake.create!(
        species: species,
        description: description,
        status: "pending",
        foto_url: foto_url.presence
      )

      # Save user's initial message
      intake.chat_messages.create!(
        role: "user",
        content: description
      )

      # Model triggers after_create → generate_ai_summary (Gemini call)
      redirect_to intake_chat_path(id: intake.id)
    end
  end

  # --- Shows chat with AI response ---
  def chat
    if params[:result].present?
      # Mock mode
      @result = JSON.parse(params[:result]) rescue {}
    else
      # Real AI mode
      @intake = Intake.find(params[:id])
      @result = @intake.parsed_payload
      @chat_messages = @intake.chat_messages.order(:created_at) # Load all messages

      # Pass error + status info to the view
      @status = @intake.status
      @error_message = @intake.parsed_payload.dig("error") rescue nil
    end
  end

  private

  def intake_params
    params.require(:intake).permit(:species, :description, :foto_url, :mock)
  end
end
