import { Controller } from "@hotwired/stimulus"
import { animateWelcomePageEntrance, slideCardTransition } from "utils/slide_animations"

const MIN_DESCRIPTION_LENGTH = 10
const INSUFFICIENT_DESCRIPTION_MESSAGE = "Please provide more details."

/**
 * SlideTransitionController
 * -------------------------
 * Keeps landing-page animations (welcome + slide to form) while stripping
 * legacy page transition code.
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

  connect() {
    if (this.initialLoadValue && this.hasSlideCardTarget) {
      this.handleWelcomePageEntrance()
    } else {
      this.revealInstantly()
    }
    this.setupValidationListeners()
  }

  /**
   * Ensure the current view is visible immediately.
   * @returns {void}
   */
  revealInstantly() {
    this.element.style.visibility = 'visible'
    this.element.style.opacity = '1'
    this.element.style.transform = 'none'

    if (this.hasSlideCardTarget) {
      const card = this.slideCardTarget
      card.style.opacity = '1'
      card.style.transform = 'none'
    }
  }

  /**
   * Play welcome entrance animation and store animal refs for transitions.
   * @returns {void}
   */
  handleWelcomePageEntrance() {
    const welcomeCard = this.hasSlideCardTarget ? this.slideCardTarget : this.element.querySelector('.slide-card')
    if (!welcomeCard) return

    // Ensure container is visible before animating
    this.element.style.visibility = 'visible'
    this.element.style.opacity = '1'

    const birdImg = document.getElementById('bird-img')
    const foxImg = document.getElementById('fox-img')

    const animals = animateWelcomePageEntrance(welcomeCard, birdImg, foxImg)
    this.birdImg = animals.birdImg
    this.foxImg = animals.foxImg
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
        const trimmedValue = descriptionField.value.trim()
        if (trimmedValue.length >= MIN_DESCRIPTION_LENGTH) {
          descriptionField.classList.remove('is-invalid')
          descriptionField.setCustomValidity('')
        } else {
          descriptionField.setCustomValidity(INSUFFICIENT_DESCRIPTION_MESSAGE)
        }
      })
    }
  }

  /**
   * Transition from welcome card to form card with landing animation.
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
   * Validate form inputs and submit without animations.
   * @param {Event} event - form submit event
   * @returns {void}
   */
  submitWithValidation(event) {
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

    const descriptionValue = descriptionField ? descriptionField.value.trim() : ''
    if (!descriptionField || descriptionValue.length < MIN_DESCRIPTION_LENGTH) {
      isValid = false
      if (descriptionField) {
        descriptionField.classList.add('is-invalid')
        descriptionField.setCustomValidity(INSUFFICIENT_DESCRIPTION_MESSAGE)
        descriptionField.reportValidity()
        if (!firstInvalidField) {
          firstInvalidField = descriptionField
        }
      }
    } else {
      descriptionField.classList.remove('is-invalid')
      descriptionField.setCustomValidity('')
    }

    if (!isValid) {
      if (firstInvalidField) firstInvalidField.focus()
      return
    }

    form.submit()
  }
}
