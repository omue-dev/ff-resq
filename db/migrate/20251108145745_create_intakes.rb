class CreateIntakes < ActiveRecord::Migration[7.1]
  def change
    enable_extension "pgcrypto" unless extension_enabled?("pgcrypto")

    create_table :intakes do |t|
      t.uuid :conversation_uuid, default: "gen_random_uuid()", null: false
      t.string :species
      t.text :description
      t.string :foto_url
      t.string :source, default: "web"
      t.string :status, default: "pending"
      t.jsonb :raw_payload, default: {}

      t.timestamps
    end

    add_index :intakes, :conversation_uuid, unique: true
  end
end
