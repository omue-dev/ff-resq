import { Controller } from "@hotwired/stimulus"
import { curtainOpen, slideCardTransition, performSlideIn, performSlideOut } from "utils/slide_animations"

/**
 * Handles slide transitions between welcome and form screens
 */
export default class extends Controller {
  static values = {
    slideIn: { type: Boolean, default: false },
    initialLoad: { type: Boolean, default: false }
  }

  static targets = ["slideCard"]

  connect() {
    // Check if we should animate slide-in BEFORE any rendering
    const shouldSlideIn = sessionStorage.getItem('chatShouldSlideIn') === 'true'

    if (shouldSlideIn) {
      sessionStorage.removeItem('chatShouldSlideIn')
      // Prevent flash by hiding element immediately
      this.element.style.visibility = 'hidden'
      this.element.style.transform = 'translateX(100%)'

      // Wait for next frame to ensure styles are applied, then animate
      requestAnimationFrame(() => {
        this.element.style.visibility = 'visible'
        this.handleSlideIn()
      })
    } else if (this.initialLoadValue) {
      this.handleCurtainOpen()
    }
  }

  handleCurtainOpen() {
    const slideCard = this.hasSlideCardTarget ? this.slideCardTarget : this.element.querySelector('.slide-card')
    if (!slideCard) return

    const birdImg = document.getElementById('bird-img')
    const foxImg = document.getElementById('fox-img')

    const animals = curtainOpen(slideCard, birdImg, foxImg)
    this.birdImg = animals.birdImg
    this.foxImg = animals.foxImg
  }

  transitionToForm() {
    if (!this.hasSlideCardTarget) return

    const slideCard = this.slideCardTarget
    const welcomeCard = slideCard.querySelector('.welcome-card')
    const formCard = slideCard.querySelector('.form-card')

    slideCardTransition(slideCard, welcomeCard, formCard, this.foxImg, this.birdImg)
  }

  handleSlideIn() {
    performSlideIn(this.element)
  }

  slideOut(event) {
    event.preventDefault()
    const form = event.target

    sessionStorage.setItem('chatShouldSlideIn', 'true')

    // Submit form immediately, animation plays while server processes
    form.submit()

    // Play slide out animation (purely visual)
    performSlideOut(this.element)
  }
}
