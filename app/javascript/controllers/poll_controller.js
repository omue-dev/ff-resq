import { Controller } from "@hotwired/stimulus"
import { ANIMATION_CONFIG } from "config/animation_constants"
import { revealMessageBubble, animateThinkingDots } from "utils/message_animations"

/**
 * Polls server for updated message content and reveals with animation.
 */
export default class extends Controller {
  static values = {
    url: String,
    target: String,
    interval: { type: Number, default: 1000 }
  }

  connect() {
    animateThinkingDots()
    this.schedulePoll()
  }

  disconnect() {
    if (this.timeout) clearTimeout(this.timeout)
  }

  schedulePoll(delay = this.intervalValue) {
    this.timeout = setTimeout(() => this.poll(), delay)
  }

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

  revealCompletedMessages() {
    document.querySelectorAll(".ai-message[data-message]").forEach(revealMessageBubble)
  }
}
