# frozen_string_literal: true

module IntakeAi
  # Parses and validates AI API responses from Gemini
  #
  # This service extracts and validates the JSON response from Gemini's API,
  # handling common formatting issues like markdown code blocks and ensuring
  # all required fields are present.
  #
  # @example Parsing a successful response
  #   parser = IntakeAi::ResponseParser.new(gemini_response)
  #   result = parser.parse
  #   # => { "species" => "hedgehog", "condition" => "injured", ... }
  #
  # @example Handling parse errors
  #   begin
  #     parser.parse
  #   rescue IntakeAi::ParseError => e
  #     Rails.logger.error "Failed to parse AI response: #{e.message}"
  #   end
  class ResponseParser
    # Required fields that must be present in AI response
    REQUIRED_FIELDS = %w[
      species
      condition
      injury
      handling
      danger
      error
      user_message
    ].freeze

    # Default fallback message when parsing fails
    DEFAULT_FALLBACK_MESSAGE = "The information so far isn't enough for me to give safe and specific first-aid guidance. Could you share a bit more about what's going on with the animal? Any extra details will help me guide you better."


    # @param raw_response [Hash] The raw API response from GeminiClient
    def initialize(raw_response)
      @raw_response = raw_response
    end

    # Parses and validates the AI response
    #
    # @return [Hash] Parsed and validated response data
    # @raise [IntakeAi::ParseError] If JSON parsing fails
    # @raise [IntakeAi::ValidationError] If required fields are missing
    def parse
      text = extract_text_from_response
      cleaned_text = strip_markdown_code_blocks(text)
      json_string = extract_json_string(cleaned_text)

      # If we can't even find a JSON object, fall back to a safe payload
      unless json_string&.include?("{") && json_string&.include?("}")
        Rails.logger.warn "IntakeAi::ResponseParser - No JSON object found in response, returning fallback payload"
        return fallback_response(cleaned_text, "No JSON object found")
      end

      parsed_data = parse_json(json_string, cleaned_text)

      validate_required_fields!(parsed_data)

      parsed_data
    end

    private

    attr_reader :raw_response

    # Extracts the text content from Gemini's nested response structure
    #
    # @return [String] The extracted text content
    # @raise [IntakeAi::ParseError] If response structure is invalid
    def extract_text_from_response
      text = raw_response.dig("candidates", 0, "content", "parts", 0, "text")

      if text.nil?
        Rails.logger.error "IntakeAi::ResponseParser - Invalid response structure"
        Rails.logger.error "Response keys: #{raw_response.keys.inspect}"
        raise IntakeAi::ParseError, "Invalid API response structure: missing text content"
      end

      text
    end

    # Strips markdown code block delimiters from JSON strings
    #
    # Gemini sometimes wraps JSON responses in ```json ... ``` blocks
    #
    # @param text [String] The raw text potentially containing markdown
    # @return [String] Cleaned text with markdown removed
    def strip_markdown_code_blocks(text)
      text.to_s
          .gsub(/^```json\s*\n?/, "")  # Remove opening ```json
          .gsub(/\n?```\s*$/, "")       # Remove closing ```
          .strip
    end

    # Parses JSON string into a Ruby hash
    #
    # @param json_string [String] The JSON string to parse
    # @param cleaned_text [String] The original cleaned text (used for logging/fallback)
    # @return [Hash] Parsed JSON data
    # @raise [IntakeAi::ParseError] If JSON is invalid
    def parse_json(json_string, cleaned_text)
      JSON.parse(json_string)
    rescue JSON::ParserError => e
      # Attempt to salvage JSON if the model prepended/appended non-JSON text
      fallback = extract_braced_content(cleaned_text)
      if fallback && fallback != json_string
        Rails.logger.warn "IntakeAi::ResponseParser - Retrying parse with extracted braces substring"
        return JSON.parse(fallback)
      end

      Rails.logger.error "IntakeAi::ResponseParser - JSON parse error: #{e.message}"
      Rails.logger.error "Raw text: #{extract_text_from_response}"
      Rails.logger.error "Cleaned text: #{json_string}"

      Rails.logger.warn "IntakeAi::ResponseParser - Using fallback payload due to parse error"
      fallback_response(cleaned_text, e.message)
    end

    # Attempts to extract a JSON object from free-form text by locating the first
    # opening brace and the last closing brace.
    #
    # @param text [String]
    # @return [String, nil] substring containing a potential JSON object
    def extract_braced_content(text)
      start_idx = text.index("{")
      end_idx = text.rindex("}")
      return if start_idx.nil? || end_idx.nil? || end_idx <= start_idx

      text[start_idx..end_idx].strip
    end

    # Determines the best candidate JSON substring from cleaned text, allowing for
    # leading/trailing natural language the model might include.
    #
    # @param cleaned_text [String]
    # @return [String]
    def extract_json_string(cleaned_text)
      stripped = cleaned_text.to_s.strip
      return stripped if stripped.start_with?("{") && stripped.end_with?("}")

      extract_braced_content(stripped) || stripped
    end

    # Build a safe fallback payload that satisfies required fields
    #
    # @param cleaned_text [String] The text we received from the model
    # @param reason [String] Why we're falling back
    # @return [Hash] payload with required keys filled with defaults
    def fallback_response(cleaned_text, reason)
      {
        "species" => "unknown",
        "condition" => "unknown",
        "injury" => "unknown",
        "handling" => "",
        "danger" => "unknown",
        "error" => "Invalid JSON in AI response: #{reason}",
        "user_message" => DEFAULT_FALLBACK_MESSAGE,
        "raw_text" => cleaned_text
      }
    end

    # Validates that all required fields are present in the response
    #
    # @param data [Hash] The parsed response data
    # @raise [IntakeAi::ValidationError] If required fields are missing
    def validate_required_fields!(data)
      missing_fields = REQUIRED_FIELDS - data.keys

      return if missing_fields.empty?

      Rails.logger.error "IntakeAi::ResponseParser - Missing required fields: #{missing_fields.join(', ')}"
      Rails.logger.error "Received fields: #{data.keys.join(', ')}"

      raise IntakeAi::ValidationError,
            "AI response missing required field(s): #{missing_fields.join(', ')}"
    end
  end
end
