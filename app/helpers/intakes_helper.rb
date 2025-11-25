# frozen_string_literal: true

# Helper methods for intake views
module IntakesHelper
  # Urgent danger levels that require immediate vet attention
  URGENT_DANGER_LEVELS = %w[medium high urgent emergency].freeze

  # Returns CSS classes for the vet button based on danger level
  #
  # @param result [Hash] The AI assessment result containing danger level
  # @return [String] Space-separated CSS class names
  #
  # @example
  #   vet_button_classes({ "danger" => "high" })
  #   # => "header-button-dark vet-button-urgent"
  def vet_button_classes(result)
    classes = ["header-button-dark"]
    classes << "vet-button-urgent" if urgent_danger_level?(result)
    classes.join(" ")
  end

  # Checks if the danger level requires urgent attention
  #
  # @param result [Hash] The AI assessment result
  # @return [Boolean] true if danger level is medium or higher
  def urgent_danger_level?(result)
    danger_level = result&.dig("danger")&.downcase
    URGENT_DANGER_LEVELS.include?(danger_level)
  end

  # Returns the danger level from the AI assessment
  #
  # @param result [Hash] The AI assessment result
  # @return [String, nil] The danger level or nil if not present
  def danger_level(result)
    result&.dig("danger")&.downcase
  end
end
