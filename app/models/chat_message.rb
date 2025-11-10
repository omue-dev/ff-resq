class ChatMessage < ApplicationRecord
  belongs_to :intake

  validates :role, presence: true
  validates :content, presence: true, allow_blank: false  # <- Make sure this allows empty strings if needed

  after_create_commit :broadcast_assistant_response, if: -> { role == "assistant" }

  private

  def broadcast_assistant_response
    broadcast_replace_later_to(
      intake,
      target: "ai-placeholder",
      partial: "intakes/message",
      locals: { message: self, animate: true }
    )
  end
end
