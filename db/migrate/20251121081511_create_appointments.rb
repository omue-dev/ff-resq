class CreateAppointments < ActiveRecord::Migration[7.1]
  def change
    create_table :appointments do |t|
      t.references :intake, null: false, foreign_key: true
      t.datetime :scheduled_at
      t.decimal :cost, precision: 10, scale: 2
      t.string :status, default: "pending"
      t.string :twilio_call_sid
      t.text :notes
      t.jsonb :twilio_payload, default: {}

      t.timestamps
    end

    add_index :appointments, :status
    add_index :appointments, :twilio_call_sid
  end
end
