require "net/http"
require "json"
require "base64"
require "uri"

class GeminiClient
  GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"
  MODEL = "gemini-2.0-flash-exp"

  # Add timeout constants
  OPEN_TIMEOUT = 10
  READ_TIMEOUT = 60
  IMAGE_DOWNLOAD_TIMEOUT = 10
  MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB limit

  def initialize(api_key = ENV["GEMINI_API_KEY"])
    @api_key = api_key
  end

  def generate_content(prompt, image_url: nil)
    uri = URI("#{GEMINI_API_URL}/#{MODEL}:generateContent")

    headers = {
      "Content-Type" => "application/json",
      "x-goog-api-key" => @api_key
    }

    body = {
      contents: [
        {
          role: "user",
          parts: build_parts(prompt, image_url)
        }
      ]
    }

    # Use Net::HTTP with proper timeouts
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = OPEN_TIMEOUT
    http.read_timeout = READ_TIMEOUT
    http.ssl_timeout = OPEN_TIMEOUT

    request = Net::HTTP::Post.new(uri.path)
    headers.each { |key, value| request[key] = value }
    request.body = body.to_json

    response = http.request(request)
    parsed = JSON.parse(response.body) rescue {}

    unless response.is_a?(Net::HTTPSuccess)
      raise "Gemini API Error: #{response.code} - #{parsed}"
    end

    parsed
  end

  private

  def build_parts(prompt, image_url)
    parts = [{ text: prompt }]

    if image_url.present?
      base64_image = encode_image_base64(image_url)
      if base64_image
        parts << {
          inline_data: {
            data: base64_image,
            mime_type: detect_mime_type(image_url)
          }
        }
      end
    end

    parts
  end

  # Fixed image downloading with timeouts
  def encode_image_base64(url)
    uri = URI.parse(url)

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = (uri.scheme == 'https')
    http.open_timeout = IMAGE_DOWNLOAD_TIMEOUT
    http.read_timeout = IMAGE_DOWNLOAD_TIMEOUT

    request = Net::HTTP::Get.new(uri.request_uri)
    response = http.request(request)

    unless response.is_a?(Net::HTTPSuccess)
      Rails.logger.error "Image download failed: #{response.code}"
      return nil
    end

    data = response.body

    # Check size limit
    if data.bytesize > MAX_IMAGE_SIZE
      Rails.logger.error "Image too large: #{data.bytesize / 1024} KB"
      return nil
    end

    base64_data = Base64.strict_encode64(data)
    Rails.logger.info "Image encoded size: #{base64_data.bytesize / 1024} KB"
    base64_data

  rescue Net::OpenTimeout, Net::ReadTimeout => e
    Rails.logger.error "Image download timeout: #{e.message}"
    nil
  rescue => e
    Rails.logger.error "Image encoding failed: #{e.message}"
    nil
  end

  def detect_mime_type(url)
    if url.end_with?(".png")
      "image/png"
    elsif url.end_with?(".webp")
      "image/webp"
    else
      "image/jpeg"
    end
  end
end
