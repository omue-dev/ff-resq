# Fur&Feather Rescue (Le Wagon Final Project)

Final project built during the **Le Wagon Web Developer Bootcamp**. ff-resq is a Rails 7 app that helps triage injured animals, guide rescuers with AI-driven chat, and loop in veterinarians via a Twilio AI voice agent.

## What it does
- Collects species + emergency details and optionally a photo (uploaded to Cloudinary).
- Runs the conversation through Gemini to produce first-aid guidance, with background jobs for reliability.
- Lets rescuers request an **AI-powered appointment call**: Twilio dials the vet, speaks a concise emergency description, and captures call notes.
- Shows nearby vets on a Google Map so callers know who is being contacted.

## Core architecture
- **Rails 7.1 / Ruby 3.3.5 / Postgres** with Active Storage.
- **Hotwire + Stimulus** front-end (importmap, no Node build step).
- **Background jobs**: `ProcessIntakeWithAiJob` (Gemini) and `CloudinaryUploadJob` (photo uploads). Configure your preferred ActiveJob adapter/queue in production.
- **External services**:
  - Gemini (`GeminiClient`) for AI chat and assessments.
  - Cloudinary for photo hosting (`cloudinary` Active Storage service).
  - Twilio Studio Flow for AI appointment calls (`TwilioClient`).
  - Google Maps JS API for vet lookup and map rendering.

### Data model (simplified)
- `Intake`: species, description, status, foto_url, raw_payload (AI JSON).
- `ChatMessage`: belongs to intake, roles `user`/`assistant`, `pending` for streaming/polling.
- `Appointment`: belongs to intake; tracks Twilio call SID, status, notes, and payloads.

## Setup
1) Install Ruby 3.3.5, Postgres, bundler.
2) Install gems: `bundle install`
3) Set up the database: `bin/rails db:setup`
4) Create a `.env` (or credentials) with the variables below.
5) Run the app: `bin/rails server` (default ActiveJob adapter is inline/async in development).
6) Visit `/` for the intake/chat flow; `/vets` for the vet map + appointment UI.

## Environment variables
- `GEMINI_API_KEY` – access to Gemini API.
- `CLOUDINARY_URL` – Cloudinary credentials for Active Storage.
- `GOOGLE_MAPS_API_KEY` – loads Maps JS in `vets#index`.
- `AI_APPOINTMENT` – set to `true` to show the “AI is calling the vet” experience on the front end.
- `DISABLE_GEMINI_CHAT` – set to `true` to short-circuit Gemini calls and show a disabled notice in chat (optional `AI_ASSISTANT_DISABLED_MESSAGE` to override the text).
- Twilio voice:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER` (caller ID)
  - `VETS_PHONE_NUMBER` (destination vet line)
  - Optional: `APPOINTMENT_TEST_MODE=true` to enable/disable AI-Appointment
  - Optional: `SKIP_TWILIO_VERIFICATION=true` to bypass webhook signature checks in dev.
- Database: `FF_RESQ_DATABASE_PASSWORD` if needed per `config/database.yml`.

## Key flows
- **Intake & AI chat**: `IntakesController#create` saves the intake, creates user + pending assistant messages, uploads the photo in the background (if provided), then `ProcessIntakeWithAiJob` calls Gemini via `IntakeAiProcessor`. The assistant message is updated when the AI finishes.
- **Photo uploads**: `CloudinaryUploadJob` streams the uploaded file to Cloudinary, updates the intake/photo URL, and then triggers AI processing.
- **AI appointment call**: `AppointmentsController#create` → `AppointmentService#create_appointment_call` builds a concise emergency description (first AI message), then Twilio Studio Flow dials the vet. Webhooks handled by `Api::V1::TwilioController` update appointment status and notes.
- **Vet map**: `/vets` loads a Google Map with nearby vets and surfaces the appointment CTA when `AI_APPOINTMENT` is enabled.

## Notes
- The Twilio Studio Flow SID is defined in `config/initializers/twilio_client.rb`; adjust if you deploy your own flow.
- All code was produced as the capstone of the Le Wagon Web Developer Bootcamp.
