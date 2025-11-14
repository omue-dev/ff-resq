import { Controller } from "@hotwired/stimulus"

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
    console.log("Poll controller connected", this.urlValue)

    // Wait for the interval time before doing the first poll.
    // (If we called poll() immediately, it might run several times too early
    // because Stimulus sometimes re-connects controllers quickly.)
    this.timeout = setTimeout(() => this.poll(), this.intervalValue)
  }

  // Called automatically when the controller is disconnected (removed from DOM)
  disconnect() {
    console.log("Poll controller disconnecting")

    // Stop any scheduled polling when this element goes away
    clearTimeout(this.timeout)
  }

  // Main polling function — repeatedly fetches updated HTML from the server
  async poll() {
    try {
      console.log("Polling:", this.urlValue)

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

        // Run the typing animation on the newly inserted bubble
        this.runTypingEffect()
      }

      // Keep polling only if the message is still pending
      if (stillPending) {
        console.log("Still pending, polling again in", this.intervalValue, "ms")

        // Schedule the next poll after the given interval
        this.timeout = setTimeout(() => this.poll(), this.intervalValue)
      } else {
        console.log("Message ready, stopping poll")
      }

    } catch (e) {
      // If something goes wrong (e.g., network error),
      // log it and retry after a longer interval (backoff)
      console.error("Poll error:", e)
      this.timeout = setTimeout(() => this.poll(), this.intervalValue * 2)
    }
  }

  // Makes the AI message bubble "type" its text like a human
  runTypingEffect() {
    // Find all elements that have a data-message attribute
    document.querySelectorAll(".ai-message[data-message]").forEach(bubble => {
      const text = bubble.dataset.message || "" // the full message text
      const aiText = bubble.querySelector(".ai-text") // element where we type
      const thinking = bubble.querySelector("[data-thinking]") // loading dots

      // If there's no message text or the animation already ran, skip it
      if (!aiText || !text.length) return
      if (aiText.dataset.animated) return

      // Mark this element as already animated to avoid re-running it
      aiText.dataset.animated = "1"

      // Check if the message contains HTML (handling instructions or cards)
      const hasHTML = text.includes('<div class="handling-instructions') || text.includes('<div class="card')

      // Wait a short moment ("thinking...") before starting to type
      setTimeout(() => {
        if (thinking) {
          // Fade out the "thinking" indicator smoothly
          thinking.style.transition = "opacity .25s ease"
          thinking.style.opacity = "0"

          // After fading out, remove it and start typing
          setTimeout(() => {
            thinking.remove()

            if (hasHTML) {
              // If content has HTML, just show it all at once
              aiText.innerHTML = text
            } else {
              // Type one character every 15 ms
              let i = 0
              const interval = setInterval(() => {
                aiText.textContent += text.charAt(i)
                i++
                if (i >= text.length) clearInterval(interval)
              }, 15)
            }
          }, 250)
        } else {
          // If there's no "thinking" element, just show immediately
          if (hasHTML) {
            aiText.innerHTML = text
          } else {
            let i = 0
            const interval = setInterval(() => {
              aiText.textContent += text.charAt(i)
              i++
              if (i >= text.length) clearInterval(interval)
            }, 15)
          }
        }
      }, 800) // Wait ~0.8s before typing
    })
  }
}
