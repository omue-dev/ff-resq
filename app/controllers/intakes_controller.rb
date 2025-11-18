class IntakesController < ApplicationController
  require "json"

  # --- Shows the intake form ---
  def new
    @intake = Intake.new
  end

  # --- Handles form submission ---
  def create
    # Extract form data safely and normalize it
    data = intake_params
    species     = data[:species].to_s.strip
    description = data[:description].to_s.strip
    foto_url    = data[:foto_url].to_s.strip

    # Upload photo to Cloudinary if present
    if data[:photo].present?
      result = Cloudinary::Uploader.upload(data[:photo].tempfile.path)
      foto_url = result["secure_url"]
    end

    # mock mode active?
    mock_mode = ActiveModel::Type::Boolean.new.cast(data[:mock])

    # use mock data in chat.html.erb (delete in production)
    if mock_mode
      session[:mock_mode] = true # Store in session
      redirect_to mock_intakes_path # redirect to GET (enables refresh on mock mode)
      return
    end

    # store data in DB so the polling view can watch for updates ---
    @intake = Intake.new(
      species: species,
      description: description,
      status: "pending",
      foto_url: foto_url.presence
    )

    unless @intake.save
      # Validation failed - show errors in the form
      render :new, status: :unprocessable_entity
      return
    end

    # Save user's initial message (shows up immediately in the chat view)
    @intake.chat_messages.create!(
      role: "user",
      content: description,
      photo_url: foto_url
    )

    # Pre-create a placeholder AI message so the Stimulus poll controller knows what to refresh.
    pending_message = @intake.chat_messages.create!(
      role: "assistant",
      content: "Analyzing",
      pending: true
    )

    # Fire Gemini in the background and tell it which record to update afterwards.
    @intake.generate_ai_summary_async(pending_message_id: pending_message.id)

    # Don't set session flag - we use sessionStorage from JavaScript instead
    # session[:slide_transition] = true

    # GET /intakes/:id/chat > chat_intake
    redirect_to chat_intake_path(@intake)
  end

  # Handles follow-up messages in existing conversation ---
  def create_message
    # Find the existing conversation
    @intake = Intake.find(params[:id])

    # Get message from form
    user_message = message_params[:content]

    # Write user message to database
    user_chat_message = @intake.chat_messages.create!({
      role: "user",
      content: user_message
    })

    # Create AI placeholder
    pending_message = @intake.chat_messages.create!(
      role: "assistant",
      content: "Thinking",
      pending: true
    )

    # Start the AI job in background
    @intake.generate_ai_summary_async(pending_message_id: pending_message.id)

    respond_to do |format|
      format.html { redirect_to chat_intake_path(@intake) }
      format.json {
        render json: {
          user_message_html: render_to_string(
            partial: "intakes/message",
            locals: { message: user_chat_message },
            formats: [:html]
          ),
          ai_message_html: render_to_string(
            partial: "intakes/message",
            locals: { message: pending_message },
            formats: [:html]
          )
        }
      }
    end
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

  # mock_chat action to perform refresh on mock mode (delete in production)
  def mock_chat
    @mock = true
    render :chat
  end

  private

  def intake_params
    params.require(:intake).permit(:species, :description, :photo, :foto_url, :mock)
  end

  def message_params
    params.require(:message).permit(:content)
  end
end
