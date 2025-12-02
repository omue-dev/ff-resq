# frozen_string_literal: true

# Orchestrates AI-powered processing of animal intake submissions
#
# This service coordinates the analysis of animal rescue intake forms using
# Google's Gemini AI. It manages the full workflow: prompt generation, API
# communication, response parsing, message formatting, and database persistence.
#
# The service delegates specialized tasks to collaborator classes:
# - {IntakeAi::PromptBuilder} builds context-aware prompts
# - {IntakeAi::ResponseParser} parses and validates AI responses
# - {IntakeAi::ResponseFormatter} formats responses for display
#
# @example Processing an intake asynchronously
#   processor = IntakeAiProcessor.new(intake)
#   processor.process_async(pending_message_id: message.id)
#   # Queues ProcessIntakeWithAiJob for background processing
#
# @example Processing an intake synchronously (called by background job)
#   processor = IntakeAiProcessor.new(intake)
#   processor.generate_ai_summary(pending_message_id: message.id)
#   # Processes immediately and updates database
#
# @see ProcessIntakeWithAiJob
# @see IntakeAi::PromptBuilder
# @see IntakeAi::ResponseParser
# @see IntakeAi::ResponseFormatter
class IntakeAiProcessor
  # Status values for intake records
  STATUS_RESPONDED = "responded"
  STATUS_ERROR = "error"

  # @param intake [Intake] The intake record to process
  # @param gemini_client [GeminiClient, nil] Optional client for testing/DI
  def initialize(intake, gemini_client: nil)
    @intake = intake
    @gemini_client = gemini_client || GeminiClient.new
  end

  # Queues the intake for asynchronous AI processing
  #
  # Called from the controller to process intake in the background via
  # ActiveJob, preventing request timeouts and improving UX.
  #
  # @param pending_message_id [Integer] ID of the pending assistant message
  # @return [void]
  def process_async(pending_message_id:)
    ProcessIntakeWithAiJob.perform_later(@intake.id, pending_message_id)
  end

  # Processes the intake with AI and updates the database
  #
  # This is the main entry point called by ProcessIntakeWithAiJob.
  # It orchestrates the full workflow and handles errors gracefully.
  #
  # @param pending_message_id [Integer] ID of the pending assistant message
  # @return [void]
  # @raise [IntakeAi::Error] Various subtypes for different failure modes
  def generate_ai_summary(pending_message_id: nil)
    log_processing_start(pending_message_id)

    ai_response = nil
    response_message = find_or_create_message(pending_message_id)
    prompt = build_prompt
    ai_response = call_gemini_api(prompt)
    parsed_data = parse_response(ai_response)
    formatted_message = format_message(parsed_data)

    update_message_and_intake(response_message, formatted_message, parsed_data)

    log_processing_success(response_message)
  rescue IntakeAi::ParseError => e
    handle_parse_error(e, pending_message_id, ai_response)
  rescue IntakeAi::ValidationError => e
    handle_validation_error(e, pending_message_id)
  rescue IntakeAi::Error => e
    # Re-raise custom errors for job retry logic
    raise
  rescue StandardError => e
    handle_unexpected_error(e, pending_message_id)
  end

  private

  attr_reader :intake, :gemini_client

  # ============================================================================
  # WORKFLOW STEP 1: Message Retrieval/Creation
  # ============================================================================

  # Finds existing message or creates a new one
  #
  # @param message_id [Integer] The message ID to find
  # @return [ChatMessage] The found or created message
  def find_or_create_message(message_id)
    message = intake.chat_messages.find_by(id: message_id)

    if message
      Rails.logger.info "IntakeAiProcessor - Found message: #{message.id}"
    else
      Rails.logger.warn "IntakeAiProcessor - Message #{message_id} not found, creating new one"
      message = intake.chat_messages.create!(role: "assistant", pending: true)
    end

    message
  end

  # ============================================================================
  # WORKFLOW STEP 2: Prompt Building
  # ============================================================================

  # Builds context-aware prompt using PromptBuilder
  #
  # @return [String] The formatted prompt
  # @raise [IntakeAi::ConfigurationError] If prompt templates are missing
  def build_prompt
    prompt_builder = IntakeAi::PromptBuilder.new(intake)
    prompt = prompt_builder.build

    Rails.logger.info "IntakeAiProcessor - Prompt length: #{prompt.length} chars"
    Rails.logger.info "IntakeAiProcessor - Total messages: #{intake.chat_messages.count}"

    prompt
  end

  # ============================================================================
  # WORKFLOW STEP 3: API Communication
  # ============================================================================

  # Calls Gemini API with prompt and optional image
  #
  # @param prompt [String] The formatted prompt
  # @return [Hash] The raw API response
  # @raise [IntakeAi::ApiConnectionError] On network/timeout errors
  # @raise [IntakeAi::ApiServerError] On server errors (5xx)
  def call_gemini_api(prompt)
    Rails.logger.info "IntakeAiProcessor - Calling Gemini API..."

    gemini_client.generate_content(prompt, image_url: intake.foto_url.presence)
  rescue Net::OpenTimeout, Net::ReadTimeout, Timeout::Error => e
    Rails.logger.error "IntakeAiProcessor - API timeout: #{e.message}"
    raise IntakeAi::ApiConnectionError, "API request timed out: #{e.message}"
  rescue StandardError => e
    # Check if it's a server error based on message content
    if e.message =~ /5\d{2}/
      Rails.logger.error "IntakeAiProcessor - API server error: #{e.message}"
      raise IntakeAi::ApiServerError, "API server error: #{e.message}"
    end

    raise
  end

  # ============================================================================
  # WORKFLOW STEP 4: Response Parsing
  # ============================================================================

  # Parses and validates the API response
  #
  # @param raw_response [Hash] The raw API response
  # @return [Hash] Validated parsed data
  # @raise [IntakeAi::ParseError] On JSON parsing errors
  # @raise [IntakeAi::ValidationError] On missing required fields
  def parse_response(raw_response)
    Rails.logger.info "IntakeAiProcessor - Parsing response..."

    parser = IntakeAi::ResponseParser.new(raw_response)
    parser.parse
  end

  # ============================================================================
  # WORKFLOW STEP 5: Message Formatting
  # ============================================================================

  # Formats the parsed data for display
  #
  # @param parsed_data [Hash] The validated response data
  # @return [String] HTML-formatted message
  def format_message(parsed_data)
    Rails.logger.info "IntakeAiProcessor - Formatting message..."

    formatter = IntakeAi::ResponseFormatter.new(parsed_data)
    formatter.format_user_message
  end

  # ============================================================================
  # WORKFLOW STEP 6: Database Updates
  # ============================================================================

  # Updates message and intake records with results
  #
  # @param message [ChatMessage] The message to update
  # @param content [String] The formatted message content
  # @param parsed_data [Hash] The parsed AI response data (includes danger, species, etc.)
  # @return [void]
  def update_message_and_intake(message, content, parsed_data)
    Rails.logger.info "IntakeAiProcessor - Updating database..."

    message.update!(content: content, pending: false)
    intake.update!(status: STATUS_RESPONDED, raw_payload: parsed_data.to_json)
  end

  # ============================================================================
  # ERROR HANDLING
  # ============================================================================

  # Handles JSON parsing errors
  #
  # @param error [IntakeAi::ParseError] The parse error
  # @param message_id [Integer] The message ID
  # @param raw_response [Hash] The raw API response
  # @return [void]
  def handle_parse_error(error, message_id, raw_response)
    Rails.logger.error "IntakeAiProcessor - Parse error: #{error.message}"

    handle_ai_failure(
      message_id: message_id,
      fallback_text: "The information so far isn't enough for me to give safe and specific first-aid guidance. Could you share a bit more about what's going on with the animal? Any extra details will help me guide you better.",
      status_value: STATUS_ERROR,
      payload: {
        error: error.message,
        error_type: "ParseError",
        raw_response: raw_response
      }
    )
  end

  # Handles validation errors
  #
  # @param error [IntakeAi::ValidationError] The validation error
  # @param message_id [Integer] The message ID
  # @return [void]
  def handle_validation_error(error, message_id)
    Rails.logger.error "IntakeAiProcessor - Validation error: #{error.message}"

    handle_ai_failure(
      message_id: message_id,
      fallback_text: "I couldn't validate the AI response. Please try again.",
      status_value: STATUS_ERROR,
      payload: {
        error: error.message,
        error_type: "ValidationError"
      }
    )
  end

  # Handles unexpected errors
  #
  # @param error [StandardError] The unexpected error
  # @param message_id [Integer] The message ID
  # @return [void]
  def handle_unexpected_error(error, message_id)
    Rails.logger.error "IntakeAiProcessor - Unexpected error: #{error.message}"
    Rails.logger.error "Backtrace: #{error.backtrace.first(10).join("\n")}"

    handle_ai_failure(
      message_id: message_id,
      fallback_text: "Sorry, I'm having trouble analyzing that right now.",
      status_value: STATUS_ERROR,
      payload: {
        error: error.message,
        error_type: error.class.to_s
      }
    )
  end

  # Common failure handling logic
  #
  # Updates the message and intake to reflect the error state
  #
  # @param message_id [Integer] The message ID to update
  # @param fallback_text [String] User-friendly error message
  # @param status_value [String] Status to set on intake
  # @param payload [Hash] Error details to store
  # @return [void]
  def handle_ai_failure(message_id:, fallback_text:, status_value:, payload:)
    Rails.logger.info "IntakeAiProcessor - Handling failure (status: #{status_value})"

    message = intake.chat_messages.find_by(id: message_id)

    if message
      message.update!(content: fallback_text, pending: false)
    else
      Rails.logger.warn "IntakeAiProcessor - Message not found, creating error message"
      intake.chat_messages.create!(
        role: "assistant",
        content: fallback_text,
        pending: false
      )
    end

    intake.update!(status: status_value, raw_payload: payload.to_json)
  end

  # ============================================================================
  # LOGGING HELPERS
  # ============================================================================

  # Logs processing start
  #
  # @param message_id [Integer] The message ID being processed
  # @return [void]
  def log_processing_start(message_id)
    Rails.logger.info "=" * 80
    Rails.logger.info "IntakeAiProcessor - PROCESSING START"
    Rails.logger.info "  Intake ID: #{intake.id}"
    Rails.logger.info "  Message ID: #{message_id}"
    Rails.logger.info "=" * 80
  end

  # Logs processing success
  #
  # @param message [ChatMessage] The completed message
  # @return [void]
  def log_processing_success(message)
    Rails.logger.info "=" * 80
    Rails.logger.info "IntakeAiProcessor - PROCESSING SUCCESS"
    Rails.logger.info "  Intake status: #{intake.status}"
    Rails.logger.info "  Message pending: #{message.pending?}"
    Rails.logger.info "=" * 80
  end
end
