require "net/http"
require "json"
require "uri"

class TwilioClient
  # Twilio Studio Flow SID
  FLOW_SID = "FW610a0f9744da3c5ff19446c2a5ec1bc2"

  OPEN_TIMEOUT = 10
  READ_TIMEOUT = 60

  def initialize(account_sid = ENV["TWILIO_ACCOUNT_SID"], auth_token = ENV["TWILIO_AUTH_TOKEN"])
    @account_sid = account_sid
    @auth_token = auth_token
  end

  # Triggers Studio Flow execution which will make the outbound call
  def initiate_execution(to:, from:, parameters: {})
    # Use Studio Flow Executions API
    uri = URI("https://studio.twilio.com/v2/Flows/#{FLOW_SID}/Executions")

    headers = {
      "Content-Type" => "application/x-www-form-urlencoded"
    }

    Rails.logger.info "Triggering Twilio flow with parameters: #{parameters.inspect}"

    # Build the form data
    # Parameters must be sent as a JSON string according to Twilio API
    body = URI.encode_www_form({
      "To" => to,
      "From" => from,
      "Parameters" => parameters.to_json
    })

    Rails.logger.info "Request body: #{body}"

    # Use Net::HTTP with proper timeouts
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = OPEN_TIMEOUT
    http.read_timeout = READ_TIMEOUT

    request = Net::HTTP::Post.new(uri.path)
    request.basic_auth(@account_sid, @auth_token)
    headers.each { |key, value| request[key] = value }
    request.body = body

    response = http.request(request)
    parsed = JSON.parse(response.body) rescue {}

    unless response.is_a?(Net::HTTPSuccess)
      Rails.logger.error "Twilio API Error: #{response.code} - #{parsed}"
      raise "Twilio API Error: #{response.code} - #{parsed}"
    end

    Rails.logger.info "Twilio execution initiated: #{parsed['sid']}"
    parsed
  end

  # Get execution status
  def get_execution_status(execution_sid:)
    uri = URI("https://studio.twilio.com/v2/Flows/#{FLOW_SID}/Executions/#{execution_sid}")

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = OPEN_TIMEOUT
    http.read_timeout = READ_TIMEOUT

    request = Net::HTTP::Get.new(uri.path)
    request.basic_auth(@account_sid, @auth_token)

    response = http.request(request)
    parsed = JSON.parse(response.body) rescue {}

    unless response.is_a?(Net::HTTPSuccess)
      Rails.logger.error "Twilio API Error: #{response.code} - #{parsed}"
      return nil
    end

    parsed
  end
end
