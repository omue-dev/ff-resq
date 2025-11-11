class IntakesController < ApplicationController
  require "json"

  # --- Handles form submission ---
  def create
    # Extract form data safely and normalize it
    data = intake_params
    species     = data[:species].to_s.strip
    description = data[:description].to_s.strip
    foto_url    = data[:foto_url].to_s.strip
    # mock mode active?
    mock_mode = ActiveModel::Type::Boolean.new.cast(data[:mock])

    # use mock data in chat.html.erb
    if mock_mode
      @mock = true
      render :chat
      return
    end

    # store data in DB so the polling view can watch for updates ---
    intake = Intake.create!(
      species: species,
      description: description,
      status: "pending",
      foto_url: foto_url.presence
    )

    # Save user's initial message (shows up immediately in the chat view)
    intake.chat_messages.create!(
      role: "user",
      content: description
    )

    # Pre-create a placeholder AI message so the Stimulus poll controller knows what to refresh.
    pending_message = intake.chat_messages.create!(
      role: "assistant",
      content: "Analyzing",
      pending: true
    )


    # Fire Gemini in the background and tell it which record to update afterwards.
    intake.generate_ai_summary_async(pending_message_id: pending_message.id)

    # FIXED: Use the correct nested route helper
    redirect_to chat_intake_path(intake)
  end

  # --- Shows chat with AI response ---
  def chat
    @intake = Intake.find(params[:id])
    @result = @intake.parsed_payload
    # The view loops over these records and injects poll controllers for pending ones.
    @chat_messages = @intake.chat_messages.order(:created_at)

    # Pass error + status info to the view
    @status = @intake.status
    @error_message = @intake.parsed_payload.dig("error") rescue nil
  end

  private

  def intake_params
    params.require(:intake).permit(:species, :description, :foto_url, :mock)
  end
end
