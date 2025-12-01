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
 * Welcome page entrance animation.
 * Animates animals (bird, fox) sliding up from bottom + welcome card scaling in.
 */
export function animateWelcomePageEntrance(welcomeCard, birdImg, foxImg) {
  const backgroundLayer = ensureBackgroundLayer()

  birdImg.style.display = 'block'
  foxImg.style.display = 'block'

  gsap.set(welcomeCard, { scale: 0 })

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
  const backgroundLayer = ensureBackgroundLayer()

  gsap.set(formCard, { x: '100%', visibility: 'hidden', opacity: 0 })

  const timeline = gsap.timeline({
    onComplete: () => {
      cardContainer.classList.add("show-form")
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
 * Chat entrance animation: quick fade/slide for header, messages, and input.
 */
export function animateChatEntrance(elements) {
  if (!elements || elements.length === 0) return

  gsap.to(elements, {
    opacity: 1,
    y: 0,
    duration: 0.25,
    stagger: 0.12,
    ease: "power2.out"
  })
}

/**
 * Vets page entrance: show loader, then fade in content after 2s.
 */
export function animateVetsEntrance({ loader, content, onComplete } = {}) {
  const tl = gsap.timeline({ onComplete })

  if (content) {
    tl.set(content, { autoAlpha: 0 })
  }

  if (loader) {
    tl.set(loader, { display: "flex", autoAlpha: 1 })
    tl.to(loader, { autoAlpha: 1, duration: 0.2 })
    tl.to(loader, { autoAlpha: 0, duration: 0.3 }, "+=2")
  } else {
    tl.to({}, { duration: 2 })
  }

  if (content) {
    tl.to(content, { autoAlpha: 1, duration: 0.4, ease: "power2.out" }, loader ? "-=0.1" : 0)
  }

  return tl
}
