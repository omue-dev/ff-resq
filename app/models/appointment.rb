class Appointment < ApplicationRecord
  belongs_to :intake

  validates :status, inclusion: { in: %w[pending confirmed cancelled] }

  def confirmed?
    status == "confirmed"
  end

  def pending?
    status == "pending"
  end

  def cancelled?
    status == "cancelled"
  end

  def confirm!
    update!(status: "confirmed")
  end

  def cancel!
    update!(status: "cancelled")
  end
end
