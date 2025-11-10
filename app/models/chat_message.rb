class ChatMessage < ApplicationRecord
  belongs_to :animal_intake

  validates :role, inclusion: { in: %w[user model] }
  validates :content, presence: true
end
