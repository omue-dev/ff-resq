import gsap from "gsap"
import { ANIMATION_CONFIG } from "config/animation_constants"

/**
 * Initial page load animation with animal images (without curtain effect)
 */
export function curtainOpen(slideCard, birdImg, foxImg) {
  birdImg.style.display = 'block'
  foxImg.style.display = 'block'

  gsap.set(slideCard, { scale: 0 })

  const timeline = gsap.timeline()

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
  gsap.set(formCard, { x: '100%', visibility: 'hidden', opacity: 0 })

  const timeline = gsap.timeline({
    onComplete: () => {
      slideCard.classList.add("show-form")
      if (onComplete) onComplete()
    }
  })

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
  // First remove the inline style tag that was hiding the element
  const inlineStyleTag = document.getElementById('chat-slide-preload')
  if (inlineStyleTag) {
    inlineStyleTag.remove()
  }

  gsap.fromTo(element,
    {
      x: '100%',
      opacity: 1,
      visibility: 'visible'
    },
    {
      x: '0',
      opacity: 1,
      visibility: 'visible',
      duration: 0.3,
      ease: "power2.out",
    }
  )
}

/**
 * Slide out animation for form submission
 * Combines scale, blur, and fade for smooth transition to chat
 */
export function performSlideOut(element, callback) {
  const timeline = gsap.timeline({
    onComplete: () => {
      if (callback) callback()
    }
  })

  // Zoom out and blur effect
  timeline.to(element, {
    x: '-100%',
    duration: 0.3,
    ease: "power2.Out"
  })

  return timeline
}
