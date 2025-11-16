import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"
import { curtainOpen, slideCardTransition, performSlideIn, performSlideOut } from "../utils/slide_animations"

/**
 * Handles slide transitions between form and chat views
 */
export default class extends Controller {
  static values = {
    slideIn: { type: Boolean, default: false },
    initialLoad: { type: Boolean, default: false }
  }

  static targets = ["flipCard"]

  connect() {
    if (this.initialLoadValue) {
      this.handleCurtainOpen()
    } else if (sessionStorage.getItem('chatShouldSlideIn') === 'true') {
      sessionStorage.removeItem('chatShouldSlideIn')
      gsap.set(this.element, { opacity: '0' })
      requestAnimationFrame(() => this.handleSlideIn())
    }
  }

  handleCurtainOpen() {
    const flipCard = this.hasFlipCardTarget ? this.flipCardTarget : this.element.querySelector('.flip-card')
    if (!flipCard) return

    const birdImg = document.getElementById('bird-img')
    const foxImg = document.getElementById('fox-img')

    const animals = curtainOpen(this.element, flipCard, birdImg, foxImg)
    this.birdImg = animals.birdImg
    this.foxImg = animals.foxImg
  }

  flipToForm() {
    if (!this.hasFlipCardTarget) return

    const flipCard = this.flipCardTarget
    const frontCard = flipCard.querySelector('.flip-card-front')
    const backCard = flipCard.querySelector('.flip-card-back')

    slideCardTransition(flipCard, frontCard, backCard, this.foxImg, this.birdImg)
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
