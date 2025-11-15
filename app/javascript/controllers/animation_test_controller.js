import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"

// Animation test controller for mock mode - allows replaying animations
export default class extends Controller {
  static targets = ["bubble"]

  connect() {
    console.log("Animation test controller connected")

    // Start thinking dots animation immediately
    this.animateThinkingDots()

    // Auto-play the reveal animation after 2 seconds
    //setTimeout(() => this.playReveal(), 2000)
  }

  // Replay button click handler
  replay() {
    console.log("Replaying animation...")

    // Reset the bubble state
    this.reset()

    // Restart animations
    this.animateThinkingDots()
    setTimeout(() => this.playReveal(), 1000)
  }

  // Reset the bubble to its initial state
  reset() {
    const bubble = this.bubbleTarget
    const aiText = bubble.querySelector(".ai-text")
    const thinkingLoader = bubble.querySelector("[data-thinking]")

    // Clear the animated flag
    delete bubble.dataset.animated

    // Clear the text content
    if (aiText) {
      aiText.innerHTML = ""
      gsap.set(aiText, { clearProps: "all" })
    }

    // Re-add thinking loader if it was removed
    if (!thinkingLoader) {
      const newThinking = document.createElement("div")
      newThinking.className = "thinking-loader"
      newThinking.dataset.thinking = ""
      newThinking.innerHTML = `
        <svg class="typing-dots" width="24" height="10" viewBox="0 0 24 10">
          <circle cx="4"  cy="4" r="3"></circle>
          <circle cx="12" cy="4" r="3"></circle>
          <circle cx="20" cy="4" r="3"></circle>
        </svg>
      `
      bubble.appendChild(newThinking)
    } else {
      // Reset thinking loader opacity and position
      gsap.set(thinkingLoader, { clearProps: "all" })
    }
  }

  // Play the reveal animation (same logic as poll_controller)
  playReveal() {
    const bubble = this.bubbleTarget
    const text = bubble.dataset.message || ""
    const aiText = bubble.querySelector(".ai-text")
    const thinking = bubble.querySelector("[data-thinking]")

    if (!text.length || !aiText) return
    if (bubble.dataset.animated) return

    bubble.dataset.animated = "1"
    aiText.innerHTML = text

    const timeline = gsap.timeline()

    // Set initial state for the text
    gsap.set(aiText, {
      opacity: 0,
      y: 20,
      filter: "blur(8px)",
      scale: 0.98
    })

    // Animate thinking dots sliding down and fading out
    if (thinking) {
      timeline.to(thinking, {
        opacity: 0,
        y: 10,
        duration: 0.4,
        ease: "power2.in",
        onComplete: () => thinking.remove()
      })

      // Overlap: text slides up as thinking slides down
      timeline.to(aiText, {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        scale: 1,
        duration: 0.6,
        ease: "power2.out"
      }, "-=0.2")
    } else {
      timeline.to(aiText, {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        scale: 1,
        duration: 0.6,
        ease: "power2.out"
      })
    }
  }

  // Animate thinking dots (same as poll_controller)
  animateThinkingDots() {
    const dots = this.bubbleTarget.querySelectorAll(".typing-dots circle")

    if (dots.length === 0) return

    dots.forEach((dot, index) => {
      gsap.to(dot, {
        y: -6,
        opacity: 1,
        duration: 0.5,
        ease: "power1.inOut",
        repeat: -1,
        yoyo: true,
        delay: index * 0.15
      })
    })
  }
}
