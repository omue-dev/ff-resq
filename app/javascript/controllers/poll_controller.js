import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"

// This Stimulus controller automatically "polls" (re-fetches) a URL
// every few seconds until the response shows that the message is complete.
// It's used, for example, to keep refreshing an AI chat bubble
// until the assistant's response is ready.

export default class extends Controller {
  // These are the controller's "values" — variables that can be passed in via HTML
  // Example:
  // <div data-controller="poll"
  //      data-poll-url-value="/messages/76"
  //      data-poll-target-value="message_76_wrapper"
  //      data-poll-interval-value="2000"></div>
  //
  // urlValue      = The URL we fetch (poll)
  // targetValue   = The DOM element we will replace with new HTML
  // intervalValue = How often to poll (in milliseconds)
  static values = {
    url: String,
    target: String,
    interval: { type: Number, default: 2000 } // default: every 2 seconds
  }

  // Called automatically when the controller is connected to the DOM
  connect() {
    // console.log("Poll controller connected", this.urlValue)

    // Animate thinking dots if they exist
    this.animateThinkingDots()

    // Wait for the interval time before doing the first poll.
    // (If we called poll() immediately, it might run several times too early
    // because Stimulus sometimes re-connects controllers quickly.)
    this.timeout = setTimeout(() => this.poll(), this.intervalValue)
  }

  // Called automatically when the controller is disconnected (removed from DOM)
  disconnect() {
    // console.log("Poll controller disconnecting")

    // Stop any scheduled polling when this element goes away
    clearTimeout(this.timeout)
  }

  // Main polling function — repeatedly fetches updated HTML from the server
  async poll() {
    try {
      // console.log("Polling:", this.urlValue)

      // Fetch the updated HTML from the server (expecting a partial HTML snippet)
      const res = await fetch(this.urlValue, {
        headers: { "Accept": "text/html" }
      })

      // If request failed, throw an error so we can retry later
      if (!res || !res.ok) throw new Error(`Polling failed: ${res?.status}`)

      // Convert the response to raw HTML text
      const html = await res.text()

      // ✅ Before replacing anything, check if the message is still "pending"
      // (We look for 'data-controller="poll"' in the HTML to detect that.)
      const stillPending = html.includes('data-controller="poll"')

      // Find the target element in the DOM (the message bubble to update)
      const target = document.getElementById(this.targetValue)

      if (target) {
        // Replace the old HTML bubble with the fresh one from the server
        target.outerHTML = html

        // Run the reveal animation on the newly inserted bubble
        // Use setTimeout to ensure the DOM has updated
        setTimeout(() => this.revealMessage(), 50)
      }

      // Keep polling only if the message is still pending
      if (stillPending) {
        // console.log("Still pending, polling again in", this.intervalValue, "ms")

        // Schedule the next poll after the given interval
        this.timeout = setTimeout(() => this.poll(), this.intervalValue)
      } else {
        // console.log("Message ready, stopping poll")
      }

    } catch (e) {
      // If something goes wrong (e.g., network error),
      // log it and retry after a longer interval (backoff)
      // console.error("Poll error:", e)
      this.timeout = setTimeout(() => this.poll(), this.intervalValue * 2)
    }
  }

  // Reveals the AI message with a blur fade animation using GSAP
  revealMessage() {
    console.log("revealMessage called")

    // Find all AI message bubbles that have content
    const bubbles = document.querySelectorAll(".ai-message[data-message]")
    console.log("Found bubbles:", bubbles.length)

    bubbles.forEach(bubble => {
      const text = bubble.dataset.message || ""
      const aiText = bubble.querySelector(".ai-text")
      const thinking = bubble.querySelector("[data-thinking]")

      console.log("Processing bubble:", { hasText: !!text.length, hasAiText: !!aiText, hasThinking: !!thinking, animated: bubble.dataset.animated })

      // Skip if no content or already animated
      if (!text.length) return
      if (bubble.dataset.animated) return

      // ONLY animate if there's an .ai-text element (animate=true)
      // If no .ai-text, the content is already rendered and visible
      if (!aiText) {
        console.log("Skipping animation - no .ai-text element (content already rendered)")
        return
      }

      // Mark as animated to prevent re-running
      bubble.dataset.animated = "1"

      // Set the content in the ai-text element
      aiText.innerHTML = text

      // Create GSAP timeline for coordinated animations
      const timeline = gsap.timeline()

      // Set initial state for the text: below its position, invisible, and blurred
      gsap.set(aiText, {
        opacity: 0,
        y: 20, // Start 20px below
        filter: "blur(8px)",
        scale: 0.98
      })

      // If there's a thinking indicator, animate it sliding down and fading out
      if (thinking) {
        timeline.to(thinking, {
          opacity: 0,
          y: 10, // Slide down 10px
          duration: 0.4,
          ease: "power2.in",
          onComplete: () => thinking.remove()
        })

        // Overlap: Start text animation slightly before thinking finishes
        timeline.to(aiText, {
          opacity: 1,
          y: 0, // Slide up to original position
          filter: "blur(0px)",
          scale: 1,
          duration: 0.6,
          ease: "power2.out"
        }, "-=0.2") // Start 0.2s before previous animation ends (overlap)
      } else {
        // No thinking indicator, just reveal the text
        timeline.to(aiText, {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          scale: 1,
          duration: 0.6,
          ease: "power2.out"
        })
      }
    })
  }

  // Animates the thinking dots with a professional GSAP effect
  animateThinkingDots() {
    // Find all thinking dot circles in the current context
    const dots = document.querySelectorAll(".typing-dots circle")

    if (dots.length === 0) return

    // Create a smooth, infinite animation for each dot
    dots.forEach((dot, index) => {
      // Stagger the animation for each dot
      gsap.to(dot, {
        y: -6, // Move up 6px
        opacity: 1, // Fade to full opacity
        duration: 0.5,
        ease: "power1.inOut",
        repeat: -1, // Infinite loop
        yoyo: true, // Go back and forth
        delay: index * 0.15 // Stagger: 0s, 0.15s, 0.3s
      })
    })
  }
}
