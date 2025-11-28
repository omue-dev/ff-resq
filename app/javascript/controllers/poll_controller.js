import { Controller } from "@hotwired/stimulus"
import { ANIMATION_CONFIG } from "config/animation_constants"
import { revealMessageBubble, animateThinkingDots } from "utils/message_animations"

/**
 * Stimulus controller for polling server for AI message updates
 * Polls backend at regular intervals to check for completed AI responses
 * Animates thinking dots while waiting, then reveals completed messages with animation
 * Used for: Chat page AI message streaming/polling (chat.html.erb)
 */
export default class extends Controller {
  static values = {
    url: String,
    target: String,
    interval: { type: Number, default: 1000 }
  }

  /**
   * Stimulus lifecycle method - called when controller connects to DOM
   * Starts thinking dots animation and schedules first poll
   */
  connect() {
    animateThinkingDots()
    this.schedulePoll()
  }

  /**
   * Stimulus lifecycle method - called when controller disconnects from DOM
   * Cleans up timeout to prevent memory leaks
   */
  disconnect() {
    if (this.timeout) clearTimeout(this.timeout)
  }

  /**
   * Schedule next poll with optional custom delay
   * @param {number} delay - Milliseconds to wait before polling (defaults to intervalValue)
   */
  schedulePoll(delay = this.intervalValue) {
    this.timeout = setTimeout(() => this.poll(), delay)
  }

  /**
   * Poll server for updated message content
   * Fetches HTML from server, checks if still pending, updates DOM
   * If message still pending: schedules another poll
   * If message complete: reveals message with animation
   * On error: retries with exponential backoff
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
   * Reveal all completed AI messages with animation
   * Finds all .ai-message elements with data-message attribute
   * Triggers reveal animation for each message bubble
   */
  revealCompletedMessages() {
    document.querySelectorAll(".ai-message[data-message]").forEach(revealMessageBubble)
  }
}
