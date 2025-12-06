import { Controller } from "@hotwired/stimulus"
import { simulateDevAppointment } from "utils/appointment_dev_helpers"

/**
 * AppointmentController
 * ---------------------
 * Orchestrates the AI-assisted appointment booking flow:
 * - Initiates appointment calls through the backend.
 * - Polls for confirmation/cancellation updates.
 * - Renders inline status and response messages without full-page reloads.
 *
 * Targets:
 * - button: trigger elements for booking.
 * - status: text nodes that reflect call/polling states.
 * - notes: containers that show the vet's response.
 *
 * Values:
 * - intakeId (Number): currently active intake; required in production.
 * - pollInterval (Number): milliseconds between poll requests.
 */
export default class extends Controller {
  static targets = ["button", "status", "notes"]
  static values = {
    intakeId: Number,
    pollInterval: { type: Number, default: 2000 }
  }

  /**
   * Initialize per-instance state.
   */
  connect() {
    this.appointmentId = null
    this.polling = false
  }

  /**
   * Clean up any active polling timers.
   */
  disconnect() {
    this.stopPolling()
    if (this.devTimeout) {
      clearTimeout(this.devTimeout)
      this.devTimeout = null
    }
  }

  /**
   * Entry point for booking an appointment.
   * Handles dev-mode mock behavior, posts to the backend in production,
   * and kicks off polling for status updates.
   *
   * @param {Event} event - click or submit event from the trigger element
   * @returns {Promise<void>}
   */
  async makeAppointment(event) {
    event.preventDefault()

    const isProd = document.querySelector('meta[name="rails-env"]')?.content === 'production'

    if (!this.intakeIdValue && isProd) {
      alert("No intake found. Please create an intake first.")
      return
    }

    const clickedButton = event.currentTarget
    const parentActions = clickedButton.closest('.card-actions')
    const statusElement = parentActions?.querySelector('.appointment-status')
    const notesElement = parentActions?.querySelector('.appointment-response')

    // Show calling state (both dev/prod)
    if (statusElement) {
      statusElement.textContent = "AI is calling the vet... (wait approx. 60 seconds)"
      statusElement.classList.remove('success')
      statusElement.classList.add('calling')
      statusElement.classList.remove('hidden')
    }
    if (notesElement) {
      notesElement.classList.add('hidden')
    }

    // Dev: mock approval to avoid real calls
    if (!isProd) {
      this.devTimeout = simulateDevAppointment(statusElement, notesElement)
      return
    }

    // Get the clicked button (could be multiple buttons on page)
    // Disable button and show loading state
    clickedButton.disabled = true
    if (statusElement) statusElement.textContent = "AI is calling the vet..."
    if (notesElement) notesElement.classList.add('hidden')

    try {
      const response = await fetch("/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfToken
        },
        body: JSON.stringify({
          intake_id: this.intakeIdValue
        })
      })

      const data = await response.json()

      if (data.success) {
        this.appointmentId = data.appointment_id
        this.currentButton = clickedButton
        this.currentStatus = statusElement
        this.currentNotes = notesElement
        if (statusElement) statusElement.textContent = "AI agent is calling the vet..."
        this.startPolling()
      } else {
        if (statusElement) statusElement.textContent = `Error: ${data.error}`
        clickedButton.disabled = false
      }
    } catch (error) {
      console.error("Failed to create appointment:", error)
      if (statusElement) statusElement.textContent = "Failed to initiate call. Please try again."
      clickedButton.disabled = false
    }
  }

  /**
   * Begin periodic polling for appointment status updates.
   */
  startPolling() {
    if (this.polling) return

    this.polling = true
    this.pollTimeout = setTimeout(() => this.pollAppointment(), this.pollIntervalValue)
  }

  /**
   * Stop any pending poll timers.
   */
  stopPolling() {
    this.polling = false
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout)
      this.pollTimeout = null
    }
  }

  /**
   * Fetch current appointment status from the server and respond to changes.
   * Retries with exponential-ish backoff on errors.
   *
   * @returns {Promise<void>}
   */
  async pollAppointment() {
    if (!this.appointmentId) {
      this.stopPolling()
      return
    }

    try {
      const response = await fetch(`/appointments/${this.appointmentId}`, {
        headers: {
          "Accept": "application/json"
        }
      })

      const data = await response.json()
      console.log("Polling appointment:", data)

      if (data.confirmed) {
        console.log("Appointment confirmed! Showing response...")
        this.showAppointmentResponse(data)
        this.stopPolling()
      } else if (data.status === "cancelled") {
        if (this.currentStatus) {
          this.currentStatus.textContent = "Appointment was cancelled."
          this.currentStatus.classList.remove('calling')
          this.currentStatus.classList.remove('hidden')
        }
        this.stopPolling()
        if (this.currentButton) {
          this.currentButton.disabled = false
        }
      } else if (this.polling) {
        this.pollTimeout = setTimeout(() => this.pollAppointment(), this.pollIntervalValue)
      }
    } catch (error) {
      console.error("Error polling appointment:", error)
      if (this.polling) {
        this.pollTimeout = setTimeout(() => this.pollAppointment(), this.pollIntervalValue * 2)
      }
    }
  }

  /**
   * Render confirmed appointment details inline and remove the trigger button.
   *
   * @param {Object} data - appointment payload from the server
   * @param {string} [data.notes] - freeform vet response text
   */
  showAppointmentResponse(data) {
    if (!this.currentNotes || !this.currentStatus || !this.currentButton) return

    this.currentStatus.textContent = "✅ Appointment confirmed!"
    this.currentStatus.classList.add('success')
    this.currentStatus.classList.remove('calling', 'hidden')

    this.currentNotes.innerHTML = `
      <p><strong>Vet's Response:</strong></p>
      <p>${data.notes || "Appointment confirmed"} €</p>
    `
    this.currentNotes.classList.remove('hidden')

    this.currentButton.remove()
  }

  /**
   * CSRF token helper for fetch calls.
   * @returns {string|undefined}
   */
  get csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content
  }
}
