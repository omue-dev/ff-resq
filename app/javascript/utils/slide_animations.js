import gsap from "gsap"
import { ANIMATION_CONFIG } from "config/animation_constants"

/**
 * Welcome page entrance animation.
 * Animates animals (bird, fox) sliding up from bottom + welcome card scaling in.
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
  .to(welcomeCard, {
    scale: 1,
    opacity: 1,
    duration: 0.4,
    ease: ANIMATION_CONFIG.CARD_SLIDE.ease
  }, "-=0.4")

  return { birdImg, foxImg }
}

/**
 * Slide transition between welcome and form screens with animal animations.
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
  .to(birdImg, {
    x: '-100%',
    duration: 0.3,
    scale: 2,
    opacity: 0,
    ease: "power2.in"
  }, "<")
  .to(welcomeCard, {
    y: '-120%',
    duration: 0.5,
    ease: ANIMATION_CONFIG.CARD_SLIDE.ease
  }, "-=0.8")
  .set(formCard, { visibility: 'visible', opacity: 0 })
  .to(formCard, {
    opacity: 1,
    x: '0%',
    duration: 0.3,
    ease: "power2.in"
  }, "<")
}

/**
 * Slide in from right animation for chat/vets pages.
 */
export function slideInFromRight(element) {
  // Remove preload styles hiding the element
  const preloadChat = document.getElementById('chat-slide-preload')
  if (preloadChat) preloadChat.remove()
  const preloadVets = document.getElementById('vets-slide-preload')
  if (preloadVets) preloadVets.remove()

  element.style.visibility = 'visible'
  element.style.opacity = 1
  element.style.transform = 'translateX(100%)'

  gsap.to(element, {
    x: '0%',
    opacity: 1,
    visibility: 'visible',
    duration: 0.3,
    ease: "power2.out",
    clearProps: 'transform'
  })
}

/**
 * Slide out to left animation.
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
