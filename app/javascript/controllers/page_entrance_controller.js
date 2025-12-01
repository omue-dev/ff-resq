import { Controller } from "@hotwired/stimulus"
import { animateChatEntrance } from "utils/slide_animations"

/**
 * page-entrance
 * -------------
 * Quickly reveals key chat UI sections on page load (under 1s total).
 */
export default class extends Controller {
  connect() {
    // Skip animation during Turbo preview or if already played for this page instance.
    const isPreview = document.documentElement.hasAttribute("data-turbo-preview")
    if (isPreview) {
      this.clearPendingState()
      return
    }

    if (this.element.dataset.pageEntranceAnimated === "true") {
      this.clearPendingState()
      return
    }

    this.element.dataset.pageEntranceAnimated = "true"
    requestAnimationFrame(() => this.animateChat())
  }

  clearPendingState() {
    this.element.classList.remove("page-entrance-pending")
  }

  animateChat() {
    const input = this.element.querySelector(".chat-input-fixed, .chat-input-form")

    const header = this.element.querySelector(".page-header")
    const messages = this.element.querySelector(".chat-messages-container")

    const elements = [header, messages, input].filter(Boolean)
    if (elements.length === 0) {
      this.clearPendingState()
      return
    }

    animateChatEntrance(elements)

    this.clearPendingState()
  }
}
