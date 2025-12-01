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

  // page_entrance_controller.js
  animateChat() {
    const header = this.element.querySelector(".page-header")
    const input = this.element.querySelector(".chat-input-fixed, .chat-input-form")

    if (!header && !input) {
      this.clearPendingState()
      return
    }

    animateChatEntrance({ header, input }, () => this.clearPendingState())
  }
}
