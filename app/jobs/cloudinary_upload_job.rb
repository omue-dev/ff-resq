# app/jobs/cloudinary_upload_job.rb
class CloudinaryUploadJob < ApplicationJob
  queue_as :default

  retry_on StandardError, wait: 5.seconds, attempts: 3
  retry_on Timeout::Error, wait: 10.seconds, attempts: 2

  def perform(intake_id, photo_data, filename, content_type)
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
    ensure
      tempfile.close
      tempfile.unlink
    end
  end
end
