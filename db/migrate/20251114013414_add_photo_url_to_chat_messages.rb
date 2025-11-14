class AddPhotoUrlToChatMessages < ActiveRecord::Migration[7.1]
  def change
    add_column :chat_messages, :photo_url, :string
  end
end
