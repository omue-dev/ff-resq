import { Controller } from "@hotwired/stimulus"
import { animateVetsEntrance } from "utils/slide_animations"

/**
 * vets-entrance
 * -------------
 * Shows a quick "Finding vets" loader, then fades in the map UI.
 */
export default class extends Controller {
  static targets = ["loader", "content"]

  connect() {
    const isPreview = document.documentElement.hasAttribute("data-turbo-preview")
    if (isPreview) {
      this.clearPendingState()
      return
    }

    if (this.element.dataset.vetsEntranceAnimated === "true") {
      this.clearPendingState()
      return
    }

    this.element.dataset.vetsEntranceAnimated = "true"
    requestAnimationFrame(() => this.animateVets())
  }

  animateVets() {
    const loader = this.hasLoaderTarget ? this.loaderTarget : null
    const content = this.hasContentTarget ? this.contentTarget : null

    animateVetsEntrance({
      loader,
      content,
      onComplete: () => this.clearPendingState()
    })
  }

  clearPendingState() {
    this.element.classList.remove("vets-entrance-pending")
    const loader = this.hasLoaderTarget ? this.loaderTarget : null
    if (loader) loader.style.display = "none"
    if (this.hasContentTarget) {
      this.contentTarget.style.opacity = 1
      this.contentTarget.style.visibility = "visible"
    }
  }
}
