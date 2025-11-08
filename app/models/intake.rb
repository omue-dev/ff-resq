require "net/http"
require "json"
require "securerandom"

class Intake < ApplicationRecord
  # --- Validations ---
  validates :species, presence: true
  validates :description, presence: true, length: { maximum: 2000 }

  # --- Associations ---
  has_many :chat_messages, dependent: :destroy

  # --- Callbacks ---
  before_create :assign_conversation_uuid

  # --- Send to n8n Webhook ---
  def send_to_n8n!
    uri = URI("http://localhost:5678/webhook-test/animal-intake")
    request = Net::HTTP::Post.new(uri, { "Content-Type" => "application/json" })
    request.body = {
      species: species,
      description: description,
      conversation_id: conversation_uuid
    }.to_json

    response = Net::HTTP.start(uri.hostname, uri.port) do |http|
      http.request(request)
    end

    update!(
      raw_payload: response.body,
      status: response.is_a?(Net::HTTPSuccess) ? "done" : "error"
    )

    response
  rescue => e
    update!(status: "error", raw_payload: { error: e.message }.to_json)
    raise e
  end

  # --- Helpers ---
  def parsed_payload
    JSON.parse(raw_payload) rescue {}
  end

  def analysis
    parsed_payload["analysis"] || {}
  end

  def user_message
    parsed_payload["user_message"]
  end

  private

  def assign_conversation_uuid
    self.conversation_uuid ||= SecureRandom.uuid
  end
end
