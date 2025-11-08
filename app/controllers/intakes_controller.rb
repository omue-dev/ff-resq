class IntakesController < ApplicationController
  require "net/http"
  require "json"

  WEBHOOK_URL = "http://localhost:5678/webhook-test/animal-intake".freeze

  def create
    # get the form data
    species = params[:species].to_s.strip
    description = params[:description].to_s.strip

    # prepare request to n8n webhook
    uri = URI(WEBHOOK_URL)
    request = Net::HTTP::Post.new(uri, { "Content-Type" => "application/json" })
    request.body = { species: species, description: description }.to_json

    # send to webhook and wait for response
    response = Net::HTTP.start(uri.hostname, uri.port) do |http|
      http.request(request)
    end

    # parse response
    result = JSON.parse(response.body) rescue {}

    # send parsed response to chat-messages
    redirect_to intake_chat_path(result: result.to_json)
  end

  def chat
    @result = JSON.parse(params[:result]) rescue {}
  end
end
