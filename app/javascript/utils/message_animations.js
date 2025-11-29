import gsap from "gsap"
import { ANIMATION_CONFIG } from "config/animation_constants"

/**
 * Reveal a message bubble by fading and un-blurring the text.
 * Removes the "thinking" placeholder first if present.
 *
 * @param {HTMLElement} bubble - message wrapper with data-message and .ai-text
 * @returns {void}
 */
export function revealMessageBubble(bubble) {
  const content = bubble.dataset.message
  const aiText = bubble.querySelector(".ai-text")
  const thinking = bubble.querySelector("[data-thinking]")

  if (!content || !aiText || bubble.dataset.animated) return

  bubble.dataset.animated = "1"
  aiText.innerHTML = content

  const timeline = gsap.timeline()
  const config = ANIMATION_CONFIG.MESSAGE_REVEAL

  // Start with the text hidden, blurred, and slightly offset
  gsap.set(aiText, {
    opacity: 0,
    y: config.yOffset,
    filter: `blur(${config.blur.initial}px)`,
    scale: config.scale.initial
  })

  if (thinking) {
    // Fade out/remove the thinking state, then reveal the AI text
    timeline.to(thinking, {
      opacity: 0,
      y: 10,
      duration: 0.4,
      ease: "power2.in",
      onComplete: () => thinking.remove()
    })
    .to(aiText, {
      opacity: 1,
      y: 0,
      filter: `blur(${config.blur.final}px)`,
      scale: config.scale.final,
      duration: config.duration,
      ease: config.ease
    }, "-=0.2")
  } else {
    timeline.to(aiText, {
      opacity: 1,
      y: 0,
      filter: `blur(${config.blur.final}px)`,
      scale: config.scale.final,
      duration: config.duration,
      ease: config.ease
    })
  }
}

/**
 * Animate "thinking" dots with a simple bounce.
 *
 * @param {Document|HTMLElement} container - scope to find .typing-dots circles
 * @returns {void}
 */
export function animateThinkingDots(container = document) {
  const dots = container.querySelectorAll(".typing-dots circle")
  if (!dots.length) return

  const config = ANIMATION_CONFIG.THINKING_DOTS

  dots.forEach((dot, index) => {
    gsap.to(dot, {
      y: config.yOffset,
      opacity: 1,
      duration: config.duration,
      ease: config.ease,
      repeat: -1,
      yoyo: true,
      delay: index * config.stagger
    })
  })
}

/**
 * Slide a user message in from the right.
 *
 * @param {HTMLElement} messageRow
 * @returns {void}
 */
export function slideInUserMessage(messageRow) {
  const config = ANIMATION_CONFIG.MESSAGE_SLIDE_IN.user

  gsap.set(messageRow, {
    x: config.xOffset,
    opacity: 0
  })

  gsap.to(messageRow, {
    x: 0,
    opacity: 1,
    duration: config.duration,
    ease: config.ease
  })
}

/**
 * Slide an AI message in from the left.
 *
 * @param {HTMLElement} messageRow
 * @returns {void}
 */
export function slideInAIMessage(messageRow) {
  const config = ANIMATION_CONFIG.MESSAGE_SLIDE_IN.ai

  gsap.set(messageRow, {
    x: config.xOffset,
    opacity: 0
  })

  gsap.to(messageRow, {
    x: 0,
    opacity: 1,
    duration: config.duration,
    ease: config.ease
  })
}
