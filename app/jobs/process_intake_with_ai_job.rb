# app/jobs/process_intake_with_ai_job.rb
class ProcessIntakeWithAiJob < ApplicationJob
  queue_as :default

  # Retry bei Fehlern (max 3 Versuche)
  retry_on StandardError, wait: 5.seconds, attempts: 3

  # Timeout-Fehler speziell behandeln
  retry_on Timeout::Error, wait: 10.seconds, attempts: 2

  def perform(intake_id, pending_message_id)
    intake = Intake.find(intake_id)

    # Nutze deinen Service Object
    IntakeAiProcessor.new(intake).generate_ai_summary(
      pending_message_id: pending_message_id
    )
  end
end
