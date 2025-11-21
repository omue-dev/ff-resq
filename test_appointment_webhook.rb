#!/usr/bin/env ruby
# Test script to simulate Twilio webhook for appointment confirmation
# Usage: ruby test_appointment_webhook.rb

require 'net/http'
require 'json'
require 'uri'

# Configuration
WEBHOOK_URL = "http://localhost:3000/api/v1/twilio/appointment_callback"

# Simulated Twilio webhook payload
def send_test_webhook(speech_result)
  uri = URI(WEBHOOK_URL)

  # This simulates what Twilio sends
  params = {
    call_sid: "",
    intake_id: "",
    speech_result: speech_result,
    digits: "",
    call_status: "",
    from: "",
    to: ""
  }

  puts "=" * 80
  puts "SENDING TEST WEBHOOK"
  puts "URL: #{WEBHOOK_URL}"
  puts "Speech: #{speech_result}"
  puts "=" * 80

  http = Net::HTTP.new(uri.host, uri.port)
  request = Net::HTTP::Post.new(uri.path)
  request['Content-Type'] = 'application/x-www-form-urlencoded'
  request.set_form_data(params)

  response = http.request(request)

  puts "\nRESPONSE:"
  puts "Status: #{response.code}"
  puts "Body: #{response.body}"
  puts "=" * 80

  response
end

# Test scenarios
puts "Appointment Webhook Test Script"
puts "=" * 80
puts ""
puts "Choose a test scenario:"
puts "1. Appointment with cost (20 Euro)"
puts "2. Appointment free of charge"
puts "3. Appointment with specific time"
puts "4. Custom speech input"
puts ""
print "Enter choice (1-4): "

choice = gets.chomp.to_i

case choice
when 1
  speech = "He can come over in 30 minutes, the cost will be 20 Euro."
  send_test_webhook(speech)
when 2
  speech = "He can come anytime today, it's free of charge."
  send_test_webhook(speech)
when 3
  speech = "The animal can come tomorrow at 2pm, cost is 50 dollars."
  send_test_webhook(speech)
when 4
  print "Enter custom speech: "
  speech = gets.chomp
  send_test_webhook(speech)
else
  puts "Invalid choice"
  exit 1
end

puts "\nNow check your browser - the modal should appear!"
puts "Or check Rails logs to see the appointment was confirmed."
