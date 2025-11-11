class ChatMessage < ApplicationRecord
  # Each chat bubble belongs to the intake shown on the chat page.
  belongs_to :intake

  validates :role, presence: true
  validates :content, presence: true, allow_blank: false

  # `pending` (see migration) stays true while the Stimulus poll controller
  # keeps asking the server for an updated version of the bubble. Once Gemini
  # finishes we update the record (and the browser swaps in the latest HTML).
end
