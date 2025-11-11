class AddPendingToChatMessages < ActiveRecord::Migration[7.1]
  def change
    add_column :chat_messages, :pending, :boolean, default: false, null: false
  end
end
