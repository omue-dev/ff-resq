import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { text: String, speed: Number }
  static targets = ["output", "thinking"]

  connect() {
    this.speedValue = this.speedValue || 35
    if (!this.textValue) return

    // Show loader for a moment
    if (this.hasThinkingTarget) {
      this.thinkingTarget.style.display = "block"
    }

    setTimeout(() => {
      if (this.hasThinkingTarget) this.thinkingTarget.style.display = "none"
      this.typeText()
    }, 800)
  }

  typeText() {
    const text = this.textValue
    let i = 0
    this.outputTarget.textContent = ""

    const interval = setInterval(() => {
      this.outputTarget.textContent += text.charAt(i)
      i++
      if (i >= text.length) {
        clearInterval(interval)
      }
    }, this.speedValue)
  }
}
