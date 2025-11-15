import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"

// Handles slide transitions between form and chat views
export default class extends Controller {
  static values = {
    slideIn: { type: Boolean, default: false },
    initialLoad: { type: Boolean, default: false }
  }

  static targets = ["flipCard"]

  connect() {
    // Split reveal animation on initial page load
    if (this.initialLoadValue) {
      this.curtainOpen()
    }
    // Slide in animation for chat view after form submission
    else if (this.slideInValue) {
      // The element already has inline transform from ERB
      // Just animate it to 0
      requestAnimationFrame(() => {
        this.performSlideIn()
      })
    }
  }

  // Split Reveal animation for initial page load
  curtainOpen() {
    const flipCard = this.hasFlipCardTarget ? this.flipCardTarget : this.element.querySelector('.flip-card')

    if (flipCard) {
      // Create two split overlays with glassmorphism effect
      const leftSplit = document.createElement('div')
      const rightSplit = document.createElement('div')

      const glassStyle = `
        position: absolute;
        top: 0;
        width: 50%;
        height: 100%;
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        z-index: 1000;
      `

      leftSplit.style.cssText = glassStyle + 'left: 0;'
      rightSplit.style.cssText = glassStyle + 'right: 0;'

      this.element.appendChild(leftSplit)
      this.element.appendChild(rightSplit)

      // Create animal images (bird and fox)
      const birdImg = document.createElement('img')
      const foxImg = document.createElement('img')

      birdImg.src = '/assets/bird-min.png'
      foxImg.src = '/assets/fox-min.png'

      // Add classes for easier debugging
      birdImg.className = 'animal-img bird-img'
      foxImg.className = 'animal-img fox-img'

      document.body.appendChild(birdImg)
      document.body.appendChild(foxImg)

      // Set initial states
      gsap.set(flipCard, { scale: 0 })
      // Animals are already visible at bottom (no transform needed)

      // Create timeline
      const timeline = gsap.timeline()

      // Animate splits sliding apart
      timeline.to([leftSplit, rightSplit], {
        scaleX: 0,
        duration: 1.5,
        ease: "power4.inOut",
        stagger: 0.05,
        transformOrigin: (index) => index === 0 ? "left center" : "right center"
      })


        timeline.from([foxImg, birdImg], {
          scale:0.5,
          y: '80%',
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.2
        })


      // Fade in card and slide in animals simultaneously
      timeline.to(flipCard, {
        scale: 1,
        opacity: 1,
        duration: 0.4,
        ease: "power2.out"
      }, "-=0.4")

      // Remove splits after animation (but keep the animals)
      timeline.add(() => {
        leftSplit.remove()
        rightSplit.remove()
        console.log('Animals in DOM:', document.querySelectorAll('.animal-img').length)
      })

      // Store animal references so they persist
      this.birdImg = birdImg
      this.foxImg = foxImg
    }
  }

  // Flip to form when button is clicked
  flipToForm() {
    if (this.hasFlipCardTarget) {
      const flipCard = this.flipCardTarget
      const frontCard = flipCard.querySelector('.flip-card-front')
      const backCard = flipCard.querySelector('.flip-card-back')

      // Set initial state for back card - keep it invisible and off screen
      gsap.set(backCard, { x: '100%', visibility: 'hidden', opacity: 0 })

      // Create timeline for slide animation
      const timeline = gsap.timeline({
        onComplete: () => {
          // Add flipped class after animation completes
          flipCard.classList.add("flipped")
        }
      })

      timeline.to(this.foxImg, {
        y: '20%',
        x: '100%',
        scale:2, opacity:0,
        duration: 0.5,
        ease: "power2.in",
      })

      timeline.to(this.birdImg, {
        x: '-100%',
        duration: 0.3, scale:2, opacity:0,
        ease: "power2.in",
       }, "<")

      // Slide front card out upwards at the same time as animals
      timeline.to(frontCard, {
        y: '-120%',
        duration: 0.5,
        ease: "power2.out"
      }, "-=0.8") // "<" means start at the same time as previous animation (the animals)

      // Make back card visible and slide it in (starts after front card finishes)
      timeline.set(backCard, { visibility: 'visible', opacity: 0 })
      timeline.to(backCard, {
        opacity: 1,
        x: '0%',
        duration: 0.3,
        ease: "power2.inOut"
      }, "<")
    }
  }

  // Slide in animation (for chat page after form submission)
  performSlideIn() {
    gsap.to(this.element, {
      x: "0%",
      duration: 0.5,
      ease: "power2.out",
      clearProps: "transform" // Clear inline transform when done
    })
  }

  // Slide out animation (for form submission)
  slideOut(event) {
    // Prevent the default form submission
    event.preventDefault()

    const form = event.target
    console.log("Sliding out form...")
    // Animate the form sliding out to the left
    gsap.to(this.element, {
      x: "-100%",
      opacity: 0,
      duration: 0.4,
      ease: "power2.in",
      onComplete: () => {
        // After animation completes, submit the form
        form.submit()
      }
    })
  }
}
