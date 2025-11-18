import { Controller } from "@hotwired/stimulus"

/**
 * Automatically scrolls the chat container to the bottom when new messages are added.
 * Ensures users always see the latest message in the conversation.
 */
export default class extends Controller {
  static targets = ["container"]

  connect() {
    // Scroll to bottom on initial load
    this.scrollToBottom()

    // Watch for new messages being added to the container
    this.setupMessageObserver()
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect()
    }
  }

  /**
   * Scrolls the chat container to the bottom to show the latest message.
   * Uses requestAnimationFrame to ensure smooth scrolling after DOM updates.
   */
  scrollToBottom() {
    if (this.hasContainerTarget) {
      requestAnimationFrame(() => {
        this.containerTarget.scrollTop = this.containerTarget.scrollHeight
      })
    }
  }

  /**
   * Sets up a MutationObserver to watch for new messages being added.
   * Automatically scrolls to bottom when the DOM tree changes (new messages).
   */
  setupMessageObserver() {
    if (!this.hasContainerTarget) return

    this.observer = new MutationObserver(() => {
      this.scrollToBottom()
    })

    // Watch for child elements being added (childList) anywhere in the tree (subtree)
    this.observer.observe(this.containerTarget, {
      childList: true,  // Detect when child nodes are added or removed
      subtree: true     // Watch the entire tree, not just direct children
    })
  }
}
