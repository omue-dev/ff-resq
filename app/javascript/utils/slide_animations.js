import gsap from "gsap"
import { ANIMATION_CONFIG } from "../config/animation_constants"

/**
 * Creates glassmorphism overlay element for curtain effect
 */
function createGlassOverlay(side) {
  const overlay = document.createElement('div')
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
  overlay.style.cssText = glassStyle + `${side}: 0;`
  return overlay
}

/**
 * Curtain opening animation with animal images
 */
export function curtainOpen(containerElement, flipCard, birdImg, foxImg) {
  const leftSplit = createGlassOverlay('left')
  const rightSplit = createGlassOverlay('right')

  containerElement.appendChild(leftSplit)
  containerElement.appendChild(rightSplit)

  birdImg.style.display = 'block'
  foxImg.style.display = 'block'

  gsap.set(flipCard, { scale: 0 })

  const timeline = gsap.timeline()

  timeline.to([leftSplit, rightSplit], {
    scaleX: 0,
    duration: ANIMATION_CONFIG.CURTAIN_OPEN.duration,
    ease: ANIMATION_CONFIG.CURTAIN_OPEN.ease,
    stagger: ANIMATION_CONFIG.CURTAIN_OPEN.stagger,
    transformOrigin: (index) => index === 0 ? "left center" : "right center"
  })

  timeline.from([foxImg, birdImg], {
    scale: 0.5,
    y: '80%',
    duration: 0.5,
    ease: ANIMATION_CONFIG.ANIMAL_ANIMATION.ease,
    stagger: 0.2
  })

  timeline.to(flipCard, {
    scale: 1,
    opacity: 1,
    duration: 0.4,
    ease: ANIMATION_CONFIG.CARD_SLIDE.ease
  }, "-=0.4")

  timeline.add(() => {
    leftSplit.remove()
    rightSplit.remove()
  })

  return { birdImg, foxImg }
}

/**
 * Slide transition between cards with animal animations
 */
export function slideCardTransition(flipCard, frontCard, backCard, foxImg, birdImg, onComplete) {
  gsap.set(backCard, { x: '100%', visibility: 'hidden', opacity: 0 })

  const timeline = gsap.timeline({
    onComplete: () => {
      flipCard.classList.add("flipped")
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

  timeline.to(frontCard, {
    y: '-120%',
    duration: 0.5,
    ease: ANIMATION_CONFIG.CARD_SLIDE.ease
  }, "-=0.8")

  timeline.set(backCard, { visibility: 'visible', opacity: 0 })
  timeline.to(backCard, {
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
  // First remove the inline style that was hiding the element
  const inlineStyleTag = document.querySelector('style:has([id="chat-page-container"])')
  if (inlineStyleTag) {
    inlineStyleTag.remove()
  }

  gsap.fromTo(element,
    {
      scale: 1.05,
      opacity: 0,
      filter: "blur(10px)"
    },
    {
      scale: 1,
      opacity: 1,
      filter: "blur(0px)",
      duration: 0.3,
      ease: "power2.out",
      clearProps: "scale,filter"
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
    scale: 0.95,
    opacity: 0,
    filter: "blur(10px)",
    duration: 0.3,
    ease: "power2.inOut"
  })

  return timeline
}
