import { Controller } from "@hotwired/stimulus"

/**
 * Handles appointment reset functionality (development only)
 * Resets the most recent appointment to pending status for testing
 */
export default class extends Controller {
  /**
   * Resets the last appointment via API call
   */
  async resetAppointment(event) {
    event.preventDefault()

    try {
      const response = await fetch('/appointments/reset', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': this.csrfToken,
          'Accept': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message)
      } else {
        alert(data.error || 'Failed to reset appointment')
      }
    } catch (error) {
      console.error('Reset appointment error:', error)
      alert('Failed to reset appointment. Please try again.')
    }
  }

  get csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content
  }
}