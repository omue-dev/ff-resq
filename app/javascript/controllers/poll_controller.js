import { Controller } from "@hotwired/stimulus"
import { ANIMATION_CONFIG } from "config/animation_constants"
import { revealMessageBubble, animateThinkingDots } from "utils/message_animations"

/**
 * PollController
 * --------------
 * Polls the server for AI message completion and updates the DOM with the latest
 * HTML fragment. Plays thinking dots while pending and reveals completed
 * messages with animation once ready.
 *
 * Values:
 * - url (String): endpoint to poll for the message fragment.
 * - target (String): DOM id of the element to replace with server HTML.
 * - interval (Number): polling interval in ms (defaults to 1000).
 */
export default class extends Controller {
  static values = {
    url: String,
    target: String,
    interval: { type: Number, default: 1000 }
  }

  /**
   * Start thinking animation and schedule initial poll.
   */
  connect() {
    animateThinkingDots()
    this.schedulePoll()
  }

  /**
   * Clear any pending poll timeouts.
   */
  disconnect() {
    if (this.timeout) clearTimeout(this.timeout)
  }

  /**
   * Schedule the next poll.
   * @param {number} delay - ms until next poll (default: intervalValue)
   */
  schedulePoll(delay = this.intervalValue) {
    this.timeout = setTimeout(() => this.poll(), delay)
  }

  /**
   * Fetch updated message HTML and either continue polling or reveal.
   * On error, retry with backoff.
   *
   * @returns {Promise<void>}
   */
  async poll() {
    try {
      const response = await fetch(this.urlValue, {
        headers: { "Accept": "text/html" }
      })

      if (!response?.ok) throw new Error(`HTTP ${response.status}`)

      const html = await response.text()
      const stillPending = html.includes('data-controller="poll"')

      const target = document.getElementById(this.targetValue)
      if (target) {
        target.outerHTML = html
        setTimeout(() => this.revealCompletedMessages(), ANIMATION_CONFIG.DELAYS.messageReveal)
      }

      if (stillPending) this.schedulePoll()

    } catch (error) {
      const backoff = this.intervalValue * ANIMATION_CONFIG.DELAYS.pollingBackoffMultiplier
      this.schedulePoll(backoff)
    }
  }

  /**
   * Reveal all completed AI messages with animation.
   */
  revealCompletedMessages() {
    document.querySelectorAll(".ai-message[data-message]").forEach(revealMessageBubble)
  }
}
