/**
 * Utilities for local development appointment flows.
 * Provides a mock confirmation path to avoid triggering real calls in dev.
 */

/**
 * Simulates a successful appointment confirmation in development environments.
 *
 * @param {HTMLElement|null} statusElement - element to show status text
 * @param {HTMLElement|null} notesElement - element to render confirmation notes
 * @returns {number} timeout id from setTimeout (for optional clearing)
 */
export function simulateDevAppointment(statusElement, notesElement) {
  return setTimeout(() => {
    if (statusElement) {
      statusElement.textContent = "✅ Appointment confirmed!"
      statusElement.classList.remove('calling')
      statusElement.classList.add('success')
      statusElement.classList.remove('hidden')
    }
    if (notesElement) {
      notesElement.innerHTML = "The animal can come tomorrow at 2pm, cost is 50 dollars."
      notesElement.classList.remove('hidden')
    }
  }, 10000)
}
