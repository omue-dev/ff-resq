class ChatMessagesController < ApplicationController
  # Handles polling requests from the Stimulus poll controller
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
