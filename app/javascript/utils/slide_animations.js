import gsap from "gsap"
import { ANIMATION_CONFIG } from "config/animation_constants"

function ensureBackgroundLayer() {
  const layer = document.getElementById('background-layer')
  if (!layer) return null

  gsap.set(layer, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    x: 0,
    y: 0,
    autoAlpha: 1
  })

  return layer
}

/**
 * Initial page load animation with animal images (without curtain effect)
 */
export function curtainOpen(slideCard, birdImg, foxImg) {
  const backgroundLayer = ensureBackgroundLayer()

  birdImg.style.display = 'block'
  foxImg.style.display = 'block'

  gsap.set(slideCard, { scale: 0 })

  const timeline = gsap.timeline()

  if (backgroundLayer) {
    timeline.set(backgroundLayer, { autoAlpha: 1 }, 0)
  }

  // Animate animals sliding up from bottom
  timeline.from([foxImg, birdImg], {
    scale: 0.5,
    y: '80%',
    duration: 0.5,
    ease: ANIMATION_CONFIG.ANIMAL_ANIMATION.ease,
    stagger: 0.2
  })

  // Animate card scaling in
  timeline.to(slideCard, {
    scale: 1,
    opacity: 1,
    duration: 0.4,
    ease: ANIMATION_CONFIG.CARD_SLIDE.ease
  }, "-=0.4")

  return { birdImg, foxImg }
}

/**
 * Slide transition between welcome and form screens with animal animations
 */
export function slideCardTransition(slideCard, welcomeCard, formCard, foxImg, birdImg, onComplete) {
  const backgroundLayer = ensureBackgroundLayer()

  gsap.set(formCard, { x: '100%', visibility: 'hidden', opacity: 0 })

  const timeline = gsap.timeline({
    onComplete: () => {
      slideCard.classList.add("show-form")
      if (onComplete) onComplete()
    }
  })

  if (backgroundLayer) {
    timeline.set(backgroundLayer, { autoAlpha: 1 }, 0)
  }

  timeline.to(foxImg, {
    y: '20%',
    x: '100%',
    scale: 2,
    opacity: 0,
    duration: 0.5,
    ease: "power2.in"
  })

  timeline.to(birdImg, {
    x: '-100%',
    duration: 0.3,
    scale: 2,
    opacity: 0,
    ease: "power2.in"
  }, "<")

  timeline.to(welcomeCard, {
    y: '-120%',
    duration: 0.5,
    ease: ANIMATION_CONFIG.CARD_SLIDE.ease
  }, "-=0.8")

  timeline.set(formCard, { visibility: 'visible', opacity: 0 })
  timeline.to(formCard, {
    opacity: 1,
    x: '0%',
    duration: 0.3,
    ease: "power2.in"
  }, "<")
}

/**
 * Slide in animation for chat page
 * Combines scale, blur, and fade for smooth entrance from form
 */
export function performSlideIn(element) {
  const backgroundLayer = ensureBackgroundLayer()

  // First remove the inline style that was hiding the element
  const inlineStyleTag = document.querySelector('style:has([id="chat-page-container"])')
  if (inlineStyleTag) {
    inlineStyleTag.remove()
  }

  gsap.fromTo(element,
    {
      x: '60%',
      opacity: 1
    },
    {
      x: '0',
      opacity: 1,
      duration: 0.3,
      ease: "power2.in"
    }
  )

  if (backgroundLayer) {
    gsap.set(backgroundLayer, { autoAlpha: 1 })
  }
}

/**
 * Slide out animation for form submission
 * Combines scale, blur, and fade for smooth transition to chat
 */
export function performSlideOut(element, callback) {
  const backgroundLayer = ensureBackgroundLayer()

  const timeline = gsap.timeline({
    onComplete: () => {
      if (callback) callback()
    }
  })

  if (backgroundLayer) {
    timeline.set(backgroundLayer, { autoAlpha: 1 }, 0)
  }

  timeline.to(element, {
    x: '-50%',
    duration: 0.3,
    opacity: 0,
    ease: "power2.Out"
  })

  return timeline
}
