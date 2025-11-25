# frozen_string_literal: true

# Uploads animal intake photos to Cloudinary asynchronously
#
# This job handles the photo upload workflow: creating temporary files,
# uploading to Cloudinary, updating database records, and triggering AI processing.
#
# The job uses retry strategies for transient failures (network timeouts, API errors).
# Binary photo data is filtered from logs to prevent excessive log bloat.
#
# @example Enqueue photo upload
#   CloudinaryUploadJob.perform_later(
#     intake.id,
#     photo_data,
#     "dog.jpg",
#     "image/jpeg",
#     pending_message.id
#   )
#
# @see IntakeAiProcessor
class CloudinaryUploadJob < ApplicationJob
  queue_as :default

  # Retry on general errors (Cloudinary API issues, network problems)
  retry_on StandardError, wait: 5.seconds, attempts: 3

  # Retry on timeout errors with longer wait time
  retry_on Timeout::Error, wait: 10.seconds, attempts: 2

  # Filter binary photo data from ActiveJob logs
  #
  # Prevents massive base64-encoded image data from appearing in logs
  # when the job is enqueued, which would cause performance issues and log bloat.
  #
  # @return [Boolean] false to disable argument logging
  def self.log_arguments?
    false
  end

  # Uploads photo to Cloudinary and triggers AI processing
  #
  # Workflow:
  # 1. Creates temporary file from binary photo data
  # 2. Uploads to Cloudinary and gets secure URL
  # 3. Updates intake record with photo URL
  # 4. Updates user's chat message with photo URL
  # 5. Triggers AI processing if pending message ID provided
  #
  # @param intake_id [Integer] The intake record ID
  # @param photo_data [String] Binary photo data
  # @param filename [String] Original filename (e.g., "dog.jpg")
  # @param content_type [String] MIME type (e.g., "image/jpeg")
  # @param pending_message_id [Integer, nil] Optional pending AI message ID to process after upload
  # @return [void]
  # @raise [ActiveRecord::RecordNotFound] If intake doesn't exist
  # @raise [Cloudinary::CarrierWave::UploadError] If Cloudinary upload fails
  def perform(intake_id, photo_data, filename, content_type, pending_message_id = nil)
    intake = Intake.find(intake_id)

    # Create a temporary file from the binary data
    tempfile = Tempfile.new([filename, File.extname(filename)])
    begin
      tempfile.binmode
      tempfile.write(photo_data)
      tempfile.rewind

      # Upload to Cloudinary
      result = Cloudinary::Uploader.upload(tempfile.path)
      foto_url = result["secure_url"]

      # Update the intake record with the Cloudinary URL
      intake.update!(foto_url: foto_url)

      # Update the user's first chat message with the photo URL and mark as complete
      first_user_message = intake.chat_messages.where(role: "user").first
      first_user_message&.update!(photo_url: foto_url, pending: false)

      # Now that photo is uploaded, trigger AI processing if pending_message_id was provided
      if pending_message_id.present?
        intake.generate_ai_summary_async(pending_message_id: pending_message_id)
      end
    ensure
      tempfile.close
      tempfile.unlink
    end
  end
end
