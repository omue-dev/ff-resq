# frozen_string_literal: true

# Handles chat message polling for real-time updates
#
# This controller supports the Stimulus poll controller by returning
# updated HTML fragments for chat messages that are being processed.
#
# @see ChatMessage
class ChatMessagesController < ApplicationController
  # Returns updated HTML for a specific chat message (used by polling)
  #
  # The Stimulus poll controller repeatedly calls this endpoint to check
  # if pending messages have been updated with AI responses.
  #
  # @param id [Integer] The chat message ID
  # @return [HTML] Partial HTML fragment for the message
  # @raise [ActiveRecord::RecordNotFound] If message doesn't exist
  def show
    @message = ChatMessage.where(id: params[:id]).first!

    render partial: "intakes/message",
           # locals: passes local variables to the partial
           # (only available inside that partial)
           locals: { message: @message, animate: !@message.pending? },
           # layout: false tells Rails not to use the full page layout
           # useful for AJAX/polling responses that only need HTML fragments
           layout: false
  end
end
