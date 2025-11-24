# frozen_string_literal: true

# Background job for processing animal intake submissions with AI
#
# This job handles asynchronous AI processing of intake forms, allowing the
# web request to complete immediately while processing happens in the background.
# It implements intelligent retry logic based on error types.
#
# Retry Strategy:
# - Retriable errors (network issues, server errors): Retry with backoff
# - Non-retriable errors (parse errors, validation errors): Discard immediately
# - Unknown errors: Let standard retry logic handle them
#
# @example Enqueuing the job
#   ProcessIntakeWithAiJob.perform_later(intake.id, pending_message.id)
#
# @see IntakeAiProcessor
# @see IntakeAi::Error
class ProcessIntakeWithAiJob < ApplicationJob
  queue_as :default

  # ============================================================================
  # RETRY STRATEGY FOR RETRIABLE ERRORS
  # ============================================================================

  # Retry on network/connection issues (transient failures)
  retry_on "IntakeAi::ApiConnectionError",
           wait: 5.seconds,
           attempts: 3

  # Retry on API server errors (5xx responses)
  retry_on "IntakeAi::ApiServerError",
           wait: 10.seconds,
           attempts: 2

  # Retry on general timeout errors
  retry_on Timeout::Error,
           wait: 10.seconds,
           attempts: 2

  # Retry on temporary/transient errors
  retry_on "IntakeAi::TemporaryError",
           wait: 5.seconds,
           attempts: 3

  # ============================================================================
  # DISCARD STRATEGY FOR NON-RETRIABLE ERRORS
  # ============================================================================

  # Don't retry parse errors - they won't fix themselves
  discard_on "IntakeAi::ParseError"

  # Don't retry validation errors - the data structure is wrong
  discard_on "IntakeAi::ValidationError"

  # Don't retry configuration errors - need manual intervention
  discard_on "IntakeAi::ConfigurationError"

  # Don't retry if the intake record doesn't exist
  discard_on ActiveRecord::RecordNotFound

  # ============================================================================
  # JOB EXECUTION
  # ============================================================================

  # Processes the intake with AI assistance
  #
  # @param intake_id [Integer] ID of the intake record to process
  # @param pending_message_id [Integer] ID of the pending assistant message
  # @return [void]
  def perform(intake_id, pending_message_id)
    intake = Intake.find(intake_id)

    IntakeAiProcessor.new(intake).generate_ai_summary(
      pending_message_id: pending_message_id
    )
  end
end
