class ApplicationController < ActionController::Base
  helper_method :assistant_disabled?

  private

  def assistant_disabled?
    AiAssistant.disabled?
  end
end
