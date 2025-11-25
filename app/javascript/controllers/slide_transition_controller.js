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

    // Add input listeners to remove validation errors when user types
    this.setupValidationListeners()
  }

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

    // Get all input fields that should be validated
    const speciesField = form.querySelector('#intake_species')
    const descriptionField = form.querySelector('#intake_description')

    let isValid = true
    let firstInvalidField = null

    // Validate species field
    if (!speciesField || !speciesField.value || speciesField.value.trim() === '') {
      isValid = false
      if (speciesField) {
        speciesField.classList.add('is-invalid')
        firstInvalidField = speciesField
      }
    } else if (speciesField) {
      speciesField.classList.remove('is-invalid')
    }

    // Validate description field
    if (!descriptionField || !descriptionField.value || descriptionField.value.trim() === '') {
      isValid = false
      if (descriptionField) {
        descriptionField.classList.add('is-invalid')
        if (!firstInvalidField) {
          firstInvalidField = descriptionField
        }
      }
    } else if (descriptionField) {
      descriptionField.classList.remove('is-invalid')
    }

    // If validation fails, focus first invalid field and stop
    if (!isValid) {
      if (firstInvalidField) {
        firstInvalidField.focus()
      }
      return
    }

    sessionStorage.setItem('chatShouldSlideIn', 'true')

    // Submit form immediately, animation plays while server processes
    form.submit()

    // Play slide out animation (purely visual)
    performSlideOut(this.element)
  }
}
