/**
 * Stimulus application bootstrap.
 * Initializes the global Stimulus instance, disables debug logging in production,
 * and exposes the application on `window` for development tools.
 */
import { Application } from "@hotwired/stimulus"

/** @type {import("@hotwired/stimulus").Application} */
const application = Application.start()

application.debug = false
window.Stimulus = application

export { application }
