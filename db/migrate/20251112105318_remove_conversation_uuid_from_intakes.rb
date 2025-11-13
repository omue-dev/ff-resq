class RemoveConversationUuidFromIntakes < ActiveRecord::Migration[7.1]
  def change
    remove_column :intakes, :conversation_uuid, :string
  end
end
