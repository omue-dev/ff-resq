Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  root "intakes#new"
  get "vets", to: "vets#index"

  # Intake routes
  resources :intakes, only: [:new, :create] do
    member do
      get 'chat', to: 'intakes#chat', as: :chat
      post 'messages', to: 'intakes#create_message', as: :message
    end
  end

  # Chat message polling endpoint
  resources :chat_messages, only: [:show], path: "messages"

  # Appointment routes
  resources :appointments, only: [:create, :show] do
    collection do
      post 'reset', to: 'appointments#reset'
    end
  end

  # Twilio webhook routes
  namespace :api do
    namespace :v1 do
      post 'twilio/appointment_callback', to: 'twilio#appointment_callback'
      post 'twilio/voice_status', to: 'twilio#voice_status'
    end
  end
end
