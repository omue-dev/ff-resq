class IntakesController < ApplicationController
  require "net/http"
  require "json"

  WEBHOOK_URL = "http://localhost:5678/webhook-test/animal-intake".freeze

  def create
    # get the form data
    species = params[:species].to_s.strip
    description = params[:description].to_s.strip
    mock = ActiveModel::Type::Boolean.new.cast(params[:intake][:mock])
    # use mockdata for design
    if mock
      result = {
        analysis: {
          species: "hedgehog",
          condition: "very bad condition",
          injury: "large wound on the bag",
          handling: "place it carefully in a bottle with a cloth",
          danger: "be careful, hedgehogs can bite"
        },
        user_message: "It looks like the hedgehog is in very bad condition, with a large wound on its back. Please handle it carefully — place it in a box or bottle lined with a soft cloth to keep it warm and safe. Avoid touching it directly, as hedgehogs can bite when stressed. Contact a local wildlife rescue center as soon as possible for proper treatment."
      }
    else
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
    end

    # send parsed response to chat-messages
    redirect_to intake_chat_path(result: result.to_json)
  end

  def chat
    @result = JSON.parse(params[:result]) rescue {}
  end
end
