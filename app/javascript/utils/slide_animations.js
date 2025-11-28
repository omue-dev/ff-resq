import gsap from "gsap"
import { ANIMATION_CONFIG } from "config/animation_constants"

/**
 * Welcome page entrance animation
 * Animates animals (bird, fox) sliding up from bottom + welcome card scaling in
 * Used for: Initial page load on welcome page (new.html.erb)
 */
export function animateWelcomePageEntrance(welcomeCard, birdImg, foxImg) {
  birdImg.style.display = 'block'
  foxImg.style.display = 'block'

  gsap.set(welcomeCard, { scale: 0 })

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
  timeline.to(welcomeCard, {
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
export function slideCardTransition(cardContainer, welcomeCard, formCard, foxImg, birdImg, onComplete) {
  gsap.set(formCard, { x: '100%', visibility: 'hidden', opacity: 0 })

  const timeline = gsap.timeline({
    onComplete: () => {
      cardContainer.classList.add("show-form")
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
 * Slide in from right animation
 * Animates element from off-screen right (100%) to center (0%)
 * Used for: Chat page slide-in, Vets page slide-in
 */
export function slideInFromRight(element) {
  // First remove any inline style tag that was hiding the element
  const preloadChat = document.getElementById('chat-slide-preload')
  if (preloadChat) preloadChat.remove()
  const preloadVets = document.getElementById('vets-slide-preload')
  if (preloadVets) preloadVets.remove()

  // Ensure element is visible and positioned off-screen to the right
  element.style.visibility = 'visible'
  element.style.opacity = 1
  element.style.transform = 'translateX(100%)'

  gsap.to(element, {
    x: '0%',
    opacity: 1,
    visibility: 'visible',
    duration: 0.3,
    ease: "power2.out",
    clearProps: 'transform' // remove transform after animation so fixed children use viewport
  })
}

/**
 * Slide out to left animation
 * Animates element from center (0%) to off-screen left (-100%)
 * Used for: Form submission, Chat->Vets transition, Vets->Chat transition
 */
export function slideOutToLeft(element, callback) {
  const timeline = gsap.timeline({
    onComplete: () => {
      if (callback) callback()
    }
  })

  timeline.to(element, {
    x: '-100%',
    duration: 0.3,
    ease: "power2.Out"
  })

  return timeline
}
