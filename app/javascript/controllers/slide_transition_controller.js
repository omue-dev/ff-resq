import { Controller } from "@hotwired/stimulus"
import { animateWelcomePageEntrance, slideCardTransition, slideInFromRight, slideOutToLeft } from "utils/slide_animations"

/**
 * Stimulus controller for managing page slide transitions
 * Handles animations between welcome, form, chat, and vets pages
 * Uses sessionStorage flags to coordinate animations across page navigations
 */
export default class extends Controller {
  static values = {
    slideIn: { type: Boolean, default: false },
    initialLoad: { type: Boolean, default: false }
  }

  static targets = ["slideCard"]

  /**
   * Stimulus lifecycle method - called when controller connects to DOM
   */
  connect() {
    this.setupSlideIn()
  }

  /**
   * Initialize slide-in animations based on sessionStorage flags
   * Checks for chatShouldSlideIn or vetsShouldSlideIn flags
   * If found: triggers slide-in from right animation
   * If initialLoad: triggers welcome page entrance animation
   * Also sets up form validation listeners
   */
  setupSlideIn() {
    const element = this.element

    // Check for any slide-in flag
    const shouldSlideIn = sessionStorage.getItem('chatShouldSlideIn') === 'true' ||
                        sessionStorage.getItem('vetsShouldSlideIn') === 'true'

    if (shouldSlideIn) {
      // Clean up all flags
      sessionStorage.removeItem('chatShouldSlideIn')
      sessionStorage.removeItem('vetsShouldSlideIn')

      // Hide element off-screen
      element.style.visibility = 'hidden'
      element.style.transform = 'translateX(100%)'

      requestAnimationFrame(() => {
        element.style.visibility = 'visible'
        this.handleSlideInFromRight()
      })
    } else if (this.initialLoadValue) {
      // Initial load - play welcome page entrance animation
      this.handleWelcomePageEntrance()
    }

    // Add input listeners to remove validation errors when user types
    this.setupValidationListeners()
  }

  /**
   * Set up input event listeners for form validation
   * Removes 'is-invalid' class when user starts typing in species or description fields
   * Provides real-time validation feedback
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
   * Handle welcome page entrance animation
   * Triggers animals (bird, fox) sliding up from bottom + card scaling in
   * Used on: Initial page load on welcome page (new.html.erb)
   * Stores animal references for later use in form transition
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
   * Transition from welcome card to form card
   * Animates animals out, welcome card slides up, form card slides in from right
   * Triggered by: Click on "Get Started" button on welcome page
   * Used on: new.html.erb (welcome page)
   */
  transitionToForm() {
    if (!this.hasSlideCardTarget) return

    const cardContainer = this.slideCardTarget
    const welcomeCard = cardContainer.querySelector('.welcome-card')
    const formCard = cardContainer.querySelector('.form-card')

    slideCardTransition(cardContainer, welcomeCard, formCard, this.foxImg, this.birdImg)
  }

  /**
   * Handle slide-in from right animation
   * Animates element from off-screen right (100%) to center (0%)
   * Used on: Chat page, Vets page when navigating from another page
   */
  handleSlideInFromRight() {
    slideInFromRight(this.element)
  }

  /**
   * Validate form, slide out to left, and submit
   * Validates species and description fields
   * If valid: sets chatShouldSlideIn flag, submits form, plays slide-out animation
   * If invalid: adds 'is-invalid' class and focuses first invalid field
   * Triggered by: Form submission on new.html.erb
   * Navigation: Form page -> Chat page
   */
  slideOutToLeftAndSubmit(event) {
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
    slideOutToLeft(this.element)
  }

  /**
   * Slide out to left and navigate to vets page
   * Sets vetsShouldSlideIn flag for next page animation
   * Plays slide-out animation, then navigates after 300ms
   * Triggered by: Click on "Find vets nearby" button
   * Navigation: Chat page -> Vets page
   */
  slideToVets(event) {
    event.preventDefault()
    const link = event.currentTarget
    const url = link.href

    sessionStorage.setItem('vetsShouldSlideIn', 'true')

    // Navigate to vets page after animation
    slideOutToLeft(this.element)

    setTimeout(() => {
      window.location.href = url
    }, 300)
  }

  /**
   * Slide out to left and navigate back to chat page
   * Sets chatShouldSlideIn flag for next page animation
   * Plays slide-out animation, then navigates after 300ms
   * Triggered by: Click on "Back to Chat" button
   * Navigation: Vets page -> Chat page
   */
  slideBackToChat(event) {
    event.preventDefault()
    const link = event.currentTarget
    const url = link.href

    sessionStorage.setItem('chatShouldSlideIn', 'true')

    // Slide out to the left
    slideOutToLeft(this.element)

    setTimeout(() => {
      window.location.href = url
    }, 300)
  }
}
