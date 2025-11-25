# frozen_string_literal: true

# Handles animal intake submissions and chat conversations
#
# This controller manages the intake workflow: collecting emergency information,
# uploading photos to Cloudinary, triggering AI analysis, and managing chat conversations.
#
# @see Intake
# @see IntakeAiProcessor
# @see CloudinaryUploadJob
class IntakesController < ApplicationController
  # Displays the new intake form
  #
  # @return [HTML] Renders the intake form view
  def new
    @intake = Intake.new
  end

  # Creates a new intake record and initiates AI processing
  #
  # This method handles the complete intake workflow:
  # 1. Validates and saves intake data
  # 2. Creates initial user chat message
  # 3. Uploads photo to Cloudinary (if provided)
  # 4. Triggers AI analysis
  # 5. Redirects to chat interface
  #
  # @param species [String] Animal species (dog/cat/etc)
  # @param description [String] Emergency description
  # @param photo [File] Optional photo upload
  # @param foto_url [String] Optional external photo URL
  # @param mock [Boolean] Mock mode flag for testing
  # @return [HTML] Redirects to chat page or renders form with errors
  def create
    # Extract form data safely and normalize it
    data = intake_params
    species     = data[:species].to_s.strip
    description = data[:description].to_s.strip
    foto_url    = data[:foto_url].to_s.strip

    # Store photo data for async upload
    photo_file = data[:photo]
    has_photo = photo_file.present?

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

    # Save user's initial message (photo_url will be updated by background job)
    user_message = @intake.chat_messages.create!(
      role: "user",
      content: description,
      photo_url: nil,
      pending: has_photo  # Mark as pending if waiting for photo upload
    )

    # Pre-create a placeholder AI message so the Stimulus poll controller knows what to refresh.
    pending_message = @intake.chat_messages.create!(
      role: "assistant",
      content: "Analyzing",
      pending: true
    )

    # Upload photo to Cloudinary asynchronously if present
    if has_photo
      # Read photo data as binary string (ActiveJob can serialize this)
      photo_data = photo_file.read
      # CloudinaryUploadJob will trigger AI job after upload completes
      CloudinaryUploadJob.perform_later(
        @intake.id,
        photo_data,
        photo_file.original_filename,
        photo_file.content_type,
        pending_message.id  # Pass the pending message ID so AI can be triggered after upload
      )
    else
      # No photo - start AI job immediately
      @intake.generate_ai_summary_async(pending_message_id: pending_message.id)
    end

    # Store intake_id in session for vets page
    session[:intake_id] = @intake.id

    # Don't set session flag - we use sessionStorage from JavaScript instead
    # session[:slide_transition] = true

    # GET /intakes/:id/chat > chat_intake
    redirect_to chat_intake_path(@intake)
  end

  # Handles follow-up messages in existing chat conversation
  #
  # Creates a new user message and triggers AI response generation.
  # Supports both HTML and JSON responses for AJAX requests.
  #
  # @param id [Integer] The intake ID
  # @param content [String] The user's message content
  # @return [HTML/JSON] Redirects to chat or returns message HTML fragments
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

  # Displays the chat interface with AI conversation
  #
  # Shows all chat messages for an intake, including pending messages
  # that are being processed by AI. The view uses Stimulus controllers
  # to poll for updates on pending messages.
  #
  # @param id [Integer] The intake ID
  # @return [HTML] Renders the chat view with messages
  def chat
    @intake = Intake.find(params[:id])
    @result = @intake.parsed_payload
    # The view loops over these records and injects poll controllers for pending ones.
    @chat_messages = @intake.chat_messages.order(:created_at)

    # Pass error + status info to the view
    @status = @intake.status
    @error_message = @intake.parsed_payload.dig("error") rescue nil
  end

  # Displays chat interface in mock mode for testing (development only)
  #
  # This endpoint is intended for testing the chat UI with mock data
  # and should be removed in production.
  #
  # @return [HTML] Renders chat view with mock flag enabled
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
