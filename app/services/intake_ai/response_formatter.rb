# frozen_string_literal: true

module IntakeAi
  # Formats AI response data for display to users
  #
  # This service transforms raw AI response data into user-friendly HTML,
  # particularly handling the conversion of handling instructions into
  # formatted lists and inserting them at appropriate markers in the message.
  #
  # @example Formatting a response with handling instructions
  #   formatter = IntakeAi::ResponseFormatter.new(parsed_response)
  #   formatted_message = formatter.format_user_message
  #   # => HTML string with <h3> and <ul> tags for handling instructions
  #
  # @example Response without handling instructions
  #   formatter = IntakeAi::ResponseFormatter.new(response_without_handling)
  #   formatted_message = formatter.format_user_message
  #   # => Returns user_message as-is without modification
  class ResponseFormatter
    # Marker text used to identify where to insert handling instructions
    HANDLING_MARKER = "Here's what to do:"

    # CSS class applied to handling instruction lists
    HANDLING_LIST_CLASS = "handling-list mt-3 mb-3"

    # Default message when AI response is missing user_message field
    DEFAULT_MESSAGE = "I've analyzed your submission but couldn't generate a response message."

    # @param parsed_response [Hash] The validated response from ResponseParser
    def initialize(parsed_response)
      @parsed_response = parsed_response
    end

    # Formats the user message with embedded handling instructions
    #
    # Takes the user_message from the AI response and intelligently inserts
    # formatted handling instructions as an HTML list if present.
    #
    # @return [String] HTML-formatted message ready for display
    def format_user_message
      base_message = extract_user_message
      handling_text = extract_handling_instructions

      return base_message if handling_text.blank?

      inject_handling_instructions(base_message, handling_text)
    end

    private

    attr_reader :parsed_response

    # Extracts the user_message field with fallback
    #
    # @return [String] The user message or default message
    def extract_user_message
      parsed_response["user_message"].presence || DEFAULT_MESSAGE
    end

    # Extracts and validates handling instructions
    #
    # @return [String, nil] The handling instructions or nil if empty
    def extract_handling_instructions
      handling = parsed_response["handling"]
      return nil if handling.blank? || handling.strip.empty?

      handling.strip
    end

    # Injects formatted handling instructions into the user message
    #
    # @param message [String] The base user message
    # @param handling_text [String] The handling instructions to format
    # @return [String] Message with injected HTML list
    def inject_handling_instructions(message, handling_text)
      handling_html = build_handling_html(handling_text)

      if message.include?(HANDLING_MARKER)
        inject_at_marker(message, handling_html)
      else
        append_to_message(message, handling_html)
      end
    end

    # Builds HTML unordered list from handling instructions
    #
    # Splits the handling text into sentences and wraps each in <li> tags
    #
    # @param handling_text [String] Period-separated handling instructions
    # @return [String] HTML unordered list
    def build_handling_html(handling_text)
      sentences = split_into_sentences(handling_text)
      return "" if sentences.empty?

      list_items = sentences.map { |sentence| build_list_item(sentence) }.join

      %(<ul class="#{HANDLING_LIST_CLASS}">#{list_items}</ul>)
    end

    # Splits handling text into individual sentences
    #
    # @param text [String] The handling instructions text
    # @return [Array<String>] Array of trimmed, non-empty sentences
    def split_into_sentences(text)
      text.split(/\.\s+/)
          .map(&:strip)
          .reject(&:empty?)
    end

    # Builds a single list item HTML element
    #
    # @param sentence [String] The sentence content
    # @return [String] HTML list item with period
    def build_list_item(sentence)
      return "" if sentence.strip.empty?

      "<li>#{sentence.strip}.</li>"
    end

    # Injects handling HTML at the marker position
    #
    # Splits message at "Here's what to do:" and inserts formatted list
    #
    # @param message [String] The original message
    # @param handling_html [String] The formatted handling HTML
    # @return [String] Message with handling list injected at marker
    def inject_at_marker(message, handling_html)
      parts = message.split(/#{Regexp.escape(HANDLING_MARKER)}\s*/, 2)

      if parts.length == 2
        "#{parts[0]}<h3 style=\"margin-top: 10px;\">#{HANDLING_MARKER}</h3>\n\n#{handling_html}\n\n#{parts[1]}"
      else
        # Fallback if split fails
        "#{parts[0]}<h3 style=\"margin-top: 10px;\">#{HANDLING_MARKER}</h3>\n\n#{handling_html}"
      end
    end

    # Appends handling HTML to end of message with heading
    #
    # Used when no marker is found in the message
    #
    # @param message [String] The original message
    # @param handling_html [String] The formatted handling HTML
    # @return [String] Message with handling list appended
    def append_to_message(message, handling_html)
      "#{message}\n\n<h3 style=\"margin-top: 10px;\">What to do:</h3>\n\n#{handling_html}"
    end
  end
end
