import { Controller } from "@hotwired/stimulus"
import { slideInUserMessage, slideInAIMessage, animateThinkingDots } from "utils/message_animations"

/**
 * ChatFormController
 * ------------------
 * Handles chat message submission over AJAX and plays entry animations for
 * user and AI messages. Keeps the form responsive by disabling/enabling
 * inputs during requests and rendering server-provided HTML partials inline.
 *
 * Targets:
 * - input: text field for chat content.
 * - submit: submit button for the form.
 */
export default class extends Controller {
  static targets = ["input", "submit"]

  /**
   * Submit the chat form via fetch, render returned message HTML, and animate.
   *
   * @param {Event} event - form submit event
   * @returns {Promise<void>}
   */
  async submitMessage(event) {
    event.preventDefault()

    const form = event.target
    const formData = new FormData(form)
    const messageContent = formData.get("message[content]")

    if (!messageContent || messageContent.trim() === "") return

    this.disableForm()

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "X-CSRF-Token": this.getCSRFToken()
        },
        body: formData
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()

      this.appendUserMessage(data.user_message_html)
      this.appendAIMessage(data.ai_message_html)

      this.clearForm()
      this.enableForm()

    } catch (error) {
      console.error("Failed to send message:", error)
      this.enableForm()
    }
  }

  /**
   * Append and animate the user's message bubble.
   *
   * @param {string} html - server-rendered HTML for the user message
   */
  appendUserMessage(html) {
    const container = document.getElementById("chat_messages")
    if (!container) return

    container.insertAdjacentHTML("beforeend", html)

    const lastMessage = container.lastElementChild
    if (lastMessage) {
      slideInUserMessage(lastMessage)
    }
  }

  /**
   * Append and animate the AI's message bubble, including thinking dots.
   *
   * @param {string} html - server-rendered HTML for the AI message
   */
  appendAIMessage(html) {
    const container = document.getElementById("chat_messages")
    if (!container) return

    container.insertAdjacentHTML("beforeend", html)

    const lastMessage = container.lastElementChild
    if (lastMessage) {
      slideInAIMessage(lastMessage)

      const thinkingBubble = lastMessage.querySelector(".ai-message")
      if (thinkingBubble) {
        animateThinkingDots(thinkingBubble)
      }
    }
  }

  /**
   * Disable form inputs during an in-flight request.
   */
  disableForm() {
    if (this.hasInputTarget) this.inputTarget.disabled = true
    if (this.hasSubmitTarget) this.submitTarget.disabled = true
  }

  /**
   * Re-enable form inputs after a request completes.
   */
  enableForm() {
    if (this.hasInputTarget) this.inputTarget.disabled = false
    if (this.hasSubmitTarget) this.submitTarget.disabled = false
  }

  /**
   * Clear the text input.
   */
  clearForm() {
    if (this.hasInputTarget) this.inputTarget.value = ""
  }

  /**
   * Read CSRF token from meta tag for authenticated POSTs.
   * @returns {string}
   */
  getCSRFToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }
}
