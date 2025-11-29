import { Controller } from "@hotwired/stimulus"

/**
 * ChatScrollController
 * --------------------
 * Keeps the chat viewport pinned to the latest message by observing DOM changes
 * and scrolling to the bottom on load and when new nodes appear.
 *
 * Targets:
 * - container: the scrollable chat messages element.
 */
export default class extends Controller {
  static targets = ["container"]

  /**
   * Scroll on load and start observing for new messages.
   */
  connect() {
    this.scrollToBottom()
    this.setupMessageObserver()
  }

  /**
   * Clean up the MutationObserver.
   */
  disconnect() {
    if (this.observer) {
      this.observer.disconnect()
    }
  }

  /**
   * Scroll the container to the bottom after the next frame.
   */
  scrollToBottom() {
    if (this.hasContainerTarget) {
      requestAnimationFrame(() => {
        this.containerTarget.scrollTop = this.containerTarget.scrollHeight
      })
    }
  }

  /**
   * Observe chat DOM mutations and scroll when new content is added.
   */
  setupMessageObserver() {
    if (!this.hasContainerTarget) return

    this.observer = new MutationObserver(() => {
      this.scrollToBottom()
    })

    this.observer.observe(this.containerTarget, {
      childList: true,
      subtree: true
    })
  }
}
