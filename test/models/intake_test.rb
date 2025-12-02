require "test_helper"

class IntakeTest < ActiveSupport::TestCase
  test "description must include sufficient detail" do
    intake = Intake.new(species: "Sparrow", description: "Too short")

    assert_not intake.valid?
    assert_includes intake.errors[:description], "Unsufficient Information, please provide more details."
  end

  test "valid when description meets minimum length" do
    intake = Intake.new(species: "Sparrow", description: "Injured wing with some bleeding observed.")

    assert intake.valid?
  end
end
