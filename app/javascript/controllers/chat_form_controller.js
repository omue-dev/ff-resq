import { Controller } from "@hotwired/stimulus"
import { slideInUserMessage, slideInAIMessage, animateThinkingDots } from "../utils/message_animations"

/**
 * Handles AJAX form submission for chat messages with slide-in animations
 */
export default class extends Controller {
  static targets = ["input", "submit"]

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

  appendUserMessage(html) {
    const container = document.getElementById("chat_messages")
    if (!container) return

    container.insertAdjacentHTML("beforeend", html)

    const lastMessage = container.lastElementChild
    if (lastMessage) {
      slideInUserMessage(lastMessage)
    }
  }

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

  disableForm() {
    if (this.hasInputTarget) this.inputTarget.disabled = true
    if (this.hasSubmitTarget) this.submitTarget.disabled = true
  }

  enableForm() {
    if (this.hasInputTarget) this.inputTarget.disabled = false
    if (this.hasSubmitTarget) this.submitTarget.disabled = false
  }

  clearForm() {
    if (this.hasInputTarget) this.inputTarget.value = ""
  }

  getCSRFToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }
}
