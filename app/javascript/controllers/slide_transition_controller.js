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
    if (this.initialLoadValue) {
      this.handleCurtainOpen()
    } else if (sessionStorage.getItem('chatShouldSlideIn') === 'true') {
      sessionStorage.removeItem('chatShouldSlideIn')
      // Opacity already set via inline style in chat.html.erb to prevent flash
      requestAnimationFrame(() => this.handleSlideIn())
    }
  }

  handleCurtainOpen() {
    const slideCard = this.hasSlideCardTarget ? this.slideCardTarget : this.element.querySelector('.slide-card')
    if (!slideCard) return

    const birdImg = document.getElementById('bird-img')
    const foxImg = document.getElementById('fox-img')

    const animals = curtainOpen(this.element, slideCard, birdImg, foxImg)
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

    performSlideOut(this.element, () => {
      form.submit()
    })
  }
}
