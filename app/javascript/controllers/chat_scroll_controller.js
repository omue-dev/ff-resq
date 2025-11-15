import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["container"]

  connect() {
    // Don't scroll on initial load - let user see the beginning of the conversation
    // Only scroll when new messages are added via MutationObserver

    // Observe for new messages
    this.observeMessages()
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect()
    }
  }

  scrollToBottom() {
    if (this.hasContainerTarget) {
      requestAnimationFrame(() => {
        this.containerTarget.scrollTop = this.containerTarget.scrollHeight
      })
    }
  }

  observeMessages() {
    if (!this.hasContainerTarget) return

    // Create a MutationObserver to watch for new messages
    this.observer = new MutationObserver((mutations) => {
      // Only scroll if actual content was added (not just attributes changed)
      const hasNewContent = mutations.some(mutation =>
        mutation.type === 'childList' && mutation.addedNodes.length > 0
      )

      if (hasNewContent) {
        this.scrollToBottom()
      }
    })

    // Observe the messages container for added child nodes
    this.observer.observe(this.containerTarget, {
      childList: true,
      subtree: true
    })
  }
}
