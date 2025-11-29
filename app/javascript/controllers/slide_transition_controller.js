import { Controller } from "@hotwired/stimulus"
import { animateWelcomePageEntrance, slideCardTransition, slideInFromRight, slideOutToLeft } from "utils/slide_animations"

/**
 * SlideTransitionController
 * -------------------------
 * Coordinates page/card slide animations across welcome, form, chat, and vets.
 * Uses sessionStorage flags to trigger entrance animations after navigation and
 * runs simple form validation before sliding away.
 *
 * Values:
 * - slideIn (Boolean): unused externally but reserved for future use.
 * - initialLoad (Boolean): plays welcome entrance when true.
 *
 * Targets:
 * - slideCard: container holding welcome + form cards.
 */
export default class extends Controller {
  static values = {
    slideIn: { type: Boolean, default: false },
    initialLoad: { type: Boolean, default: false }
  }

  static targets = ["slideCard"]

  /**
   * Entry point: decide which entrance animation to play and wire validation.
   */
  connect() {
    this.setupSlideIn()
  }

  /**
   * Run entrance animation based on stored flags and set up validation listeners.
   * Prefers navigation flags (chat/vets) over initial welcome animation.
   */
  setupSlideIn() {
    const element = this.element

    const shouldSlideIn = this.shouldSlideInFromRight()

    if (shouldSlideIn) {
      this.clearSlideFlags()
      this.hideOffscreen(element)
      requestAnimationFrame(() => {
        element.style.visibility = 'visible'
        this.handleSlideInFromRight()
      })
    } else if (this.initialLoadValue) {
      this.handleWelcomePageEntrance()
    }

    this.setupValidationListeners()
  }

  /**
   * Determine if any slide-in flag is set in sessionStorage.
   * @returns {boolean}
   */
  shouldSlideInFromRight() {
    return sessionStorage.getItem('chatShouldSlideIn') === 'true' ||
           sessionStorage.getItem('vetsShouldSlideIn') === 'true'
  }

  /**
   * Remove slide-in flags after consuming them.
   * @returns {void}
   */
  clearSlideFlags() {
    sessionStorage.removeItem('chatShouldSlideIn')
    sessionStorage.removeItem('vetsShouldSlideIn')
  }

  /**
   * Position element off-screen to prepare for slide-in.
   * @param {HTMLElement} element
   * @returns {void}
   */
  hideOffscreen(element) {
    element.style.visibility = 'hidden'
    element.style.transform = 'translateX(100%)'
  }

  /**
   * Set up input listeners to clear validation errors on input.
   * @returns {void}
   */
  setupValidationListeners() {
    const form = this.element.querySelector('form')
    if (!form) return

    const speciesField = form.querySelector('#intake_species')
    const descriptionField = form.querySelector('#intake_description')

    if (speciesField) {
      speciesField.addEventListener('input', () => {
        if (speciesField.value.trim() !== '') {
          speciesField.classList.remove('is-invalid')
        }
      })
    }

    if (descriptionField) {
      descriptionField.addEventListener('input', () => {
        if (descriptionField.value.trim() !== '') {
          descriptionField.classList.remove('is-invalid')
        }
      })
    }
  }

  /**
   * Play welcome entrance animation and store animal refs for transitions.
   * @returns {void}
   */
  handleWelcomePageEntrance() {
    const welcomeCard = this.hasSlideCardTarget ? this.slideCardTarget : this.element.querySelector('.slide-card')
    if (!welcomeCard) return

    const birdImg = document.getElementById('bird-img')
    const foxImg = document.getElementById('fox-img')

    const animals = animateWelcomePageEntrance(welcomeCard, birdImg, foxImg)
    this.birdImg = animals.birdImg
    this.foxImg = animals.foxImg
  }

  /**
   * Transition from welcome card to form card.
   * @returns {void}
   */
  transitionToForm() {
    if (!this.hasSlideCardTarget) return

    const cardContainer = this.slideCardTarget
    const welcomeCard = cardContainer.querySelector('.welcome-card')
    const formCard = cardContainer.querySelector('.form-card')

    slideCardTransition(cardContainer, welcomeCard, formCard, this.foxImg, this.birdImg)
  }

  /**
   * Slide element in from the right.
   * @returns {void}
   */
  handleSlideInFromRight() {
    slideInFromRight(this.element)
  }

  /**
   * Validate form inputs, set navigation flag, submit, and play slide-out.
   * @param {Event} event - form submit event
   * @returns {void}
   */
  slideOutToLeftAndSubmit(event) {
    event.preventDefault()
    const form = event.target

    const speciesField = form.querySelector('#intake_species')
    const descriptionField = form.querySelector('#intake_description')

    let isValid = true
    let firstInvalidField = null

    if (!speciesField || !speciesField.value || speciesField.value.trim() === '') {
      isValid = false
      if (speciesField) {
        speciesField.classList.add('is-invalid')
        firstInvalidField = speciesField
      }
    } else {
      speciesField.classList.remove('is-invalid')
    }

    if (!descriptionField || !descriptionField.value || descriptionField.value.trim() === '') {
      isValid = false
      if (descriptionField) {
        descriptionField.classList.add('is-invalid')
        if (!firstInvalidField) {
          firstInvalidField = descriptionField
        }
      }
    } else {
      descriptionField.classList.remove('is-invalid')
    }

    if (!isValid) {
      if (firstInvalidField) firstInvalidField.focus()
      return
    }

    sessionStorage.setItem('chatShouldSlideIn', 'true')
    form.submit()
    slideOutToLeft(this.element)
  }

  /**
   * Slide out and navigate to vets page, setting return animation flag.
   * @param {Event} event - click event from navigation link
   * @returns {void}
   */
  slideToVets(event) {
    event.preventDefault()
    const link = event.currentTarget
    const url = link.href

    sessionStorage.setItem('vetsShouldSlideIn', 'true')
    slideOutToLeft(this.element)

    setTimeout(() => {
      window.location.href = url
    }, 300)
  }

  /**
   * Slide out and navigate back to chat page, setting return animation flag.
   * @param {Event} event - click event from navigation link
   * @returns {void}
   */
  slideBackToChat(event) {
    event.preventDefault()
    const link = event.currentTarget
    const url = link.href

    sessionStorage.setItem('chatShouldSlideIn', 'true')
    slideOutToLeft(this.element)

    setTimeout(() => {
      window.location.href = url
    }, 300)
  }
}
