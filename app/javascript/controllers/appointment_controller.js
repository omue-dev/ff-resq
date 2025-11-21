import { Controller } from "@hotwired/stimulus"

/**
 * Handles appointment booking with Twilio AI agent
 * - Triggers appointment call
 * - Polls for appointment confirmation
 * - Displays appointment details in modal
 */
export default class extends Controller {
  static targets = ["button", "status", "modal", "notes", "resetButton"]
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

    // Disable button and show loading state
    this.buttonTarget.disabled = true
    this.statusTarget.textContent = "Initiating call..."

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
        this.statusTarget.textContent = "AI agent is calling the vet..."
        this.startPolling()
      } else {
        this.statusTarget.textContent = `Error: ${data.error}`
        this.buttonTarget.disabled = false
      }
    } catch (error) {
      console.error("Failed to create appointment:", error)
      this.statusTarget.textContent = "Failed to initiate call. Please try again."
      this.buttonTarget.disabled = false
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
        console.log("Appointment confirmed! Showing modal...")
        // Appointment confirmed - show modal
        this.showAppointmentModal(data)
        this.stopPolling()
        this.statusTarget.textContent = "Appointment confirmed!"
        this.buttonTarget.disabled = false
      } else if (data.status === "cancelled") {
        // Appointment cancelled
        this.statusTarget.textContent = "Appointment was cancelled."
        this.stopPolling()
        this.buttonTarget.disabled = false
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

  showAppointmentModal(data) {
    // Display the vet's response directly
    this.notesTarget.textContent = data.notes || "Appointment confirmed"

    // Show modal
    this.modalTarget.style.display = "block"
    this.modalTarget.classList.add("show")
  }

  closeModal(event) {
    event.preventDefault()
    this.modalTarget.style.display = "none"
    this.modalTarget.classList.remove("show")
  }

  async resetAppointment(event) {
    event.preventDefault()

    if (!confirm("Reset the last appointment to pending status for testing?")) {
      return
    }

    this.statusTarget.textContent = "Resetting appointment..."

    try {
      const response = await fetch("/appointments/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfToken
        }
      })

      const data = await response.json()

      if (data.success) {
        this.statusTarget.textContent = `${data.message} - Ready to test!`
        this.buttonTarget.disabled = false
        this.appointmentId = data.appointment_id
      } else {
        this.statusTarget.textContent = `Error: ${data.error}`
      }
    } catch (error) {
      console.error("Failed to reset appointment:", error)
      this.statusTarget.textContent = "Failed to reset appointment."
    }
  }

  get csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content
  }
}
