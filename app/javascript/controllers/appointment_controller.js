import { Controller } from "@hotwired/stimulus"

/**
 * Handles appointment booking with Twilio AI agent
 * - Triggers appointment call
 * - Polls for appointment confirmation
 * - Displays appointment details in modal
 */
export default class extends Controller {
  static targets = ["button", "status", "notes"]
  static values = {
    intakeId: Number,
    pollInterval: { type: Number, default: 2000 }
  }

  connect() {
    this.appointmentId = null
    this.polling = false
  }

  disconnect() {
    this.stopPolling()
  }

  async makeAppointment(event) {
    event.preventDefault()

    if (!this.intakeIdValue) {
      alert("No intake found. Please create an intake first.")
      return
    }

    // Get the clicked button (could be multiple buttons on page)
    const clickedButton = event.currentTarget
    const parentActions = clickedButton.closest('.card-actions')
    const statusElement = parentActions.querySelector('.appointment-status')
    const notesElement = parentActions.querySelector('.appointment-response')

    // Disable button and show loading state
    clickedButton.disabled = true
    statusElement.textContent = "Initiating call..."
    notesElement.style.display = 'none'

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
        statusElement.textContent = "AI agent is calling the vet..."
        this.startPolling()
      } else {
        statusElement.textContent = `Error: ${data.error}`
        clickedButton.disabled = false
      }
    } catch (error) {
      console.error("Failed to create appointment:", error)
      statusElement.textContent = "Failed to initiate call. Please try again."
      clickedButton.disabled = false
    }
  }

  startPolling() {
    if (this.polling) return

    this.polling = true
    this.pollTimeout = setTimeout(() => this.pollAppointment(), this.pollIntervalValue)
  }

  stopPolling() {
    this.polling = false
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout)
      this.pollTimeout = null
    }
  }

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
        // Appointment confirmed - show inline response
        this.showAppointmentResponse(data)
        this.stopPolling()
      } else if (data.status === "cancelled") {
        // Appointment cancelled
        if (this.currentStatus) {
          this.currentStatus.textContent = "Appointment was cancelled."
        }
        this.stopPolling()
        if (this.currentButton) {
          this.currentButton.disabled = false
        }
      } else {
        // Still pending - continue polling
        if (this.polling) {
          this.pollTimeout = setTimeout(() => this.pollAppointment(), this.pollIntervalValue)
        }
      }
    } catch (error) {
      console.error("Error polling appointment:", error)
      // Continue polling even on error
      if (this.polling) {
        this.pollTimeout = setTimeout(() => this.pollAppointment(), this.pollIntervalValue * 2)
      }
    }
  }

  showAppointmentResponse(data) {
    if (!this.currentNotes || !this.currentStatus || !this.currentButton) return

    // Update status
    this.currentStatus.textContent = "✓ Appointment confirmed!"
    this.currentStatus.classList.add('success')

    // Show response
    this.currentNotes.innerHTML = `
      <p><strong>Vet's Response:</strong></p>
      <p>${data.notes || "Appointment confirmed"}</p>
    `
    this.currentNotes.style.display = 'block'

    // Remove the button after confirmation
    this.currentButton.remove()
  }

  get csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content
  }
}
