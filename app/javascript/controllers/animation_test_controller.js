import { Controller } from "@hotwired/stimulus"
import gsap from "gsap"  // reset()
import { revealMessageBubble, animateThinkingDots } from "utils/message_animations"

/**
 * Animation test controller for mock mode.
 * Allows testing scroll behavior by dynamically adding messages.
 */
export default class extends Controller {
  static targets = ["bubble"]

  connect() {
    animateThinkingDots(this.bubbleTarget)
    this.messageCounter = 1

    this.mockMessages = [
      "How long should I keep the bird?",
      "What should I feed it?",
      "The bird seems to be improving. What's next?",
      "Should I contact a wildlife center?",
      "Thank you for your help!"
    ]

    this.mockAIResponses = [
      "Keep the bird only until you can transfer it to a wildlife rehabilitator. Wild birds are protected by law and require specialized care.",
      "Do NOT feed the bird without professional guidance. Different species have different dietary needs. Contact a wildlife center immediately.",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.",
      "Yes, absolutely! Search for licensed wildlife rehabilitators in your area. They have the expertise and legal permits to care for wild birds.",
      "You're welcome! Thank you for caring about wildlife. Your quick action made a real difference for this bird."
    ]
  }

  replay() {
    this.reset()
    animateThinkingDots(this.bubbleTarget)
    setTimeout(() => revealMessageBubble(this.bubbleTarget), 1000)
  }

  addNewMessage() {
    const container = document.getElementById("chat_messages")
    if (!container) return

    const messageIndex = (this.messageCounter - 1) % this.mockMessages.length
    const userMessage = this.mockMessages[messageIndex]
    const aiResponse = this.mockAIResponses[messageIndex]

    this.addUserMessage(container, userMessage)

    setTimeout(() => {
      this.addAIMessage(container, aiResponse)
    }, 500)

    this.messageCounter++
  }

  addUserMessage(container, text) {
    const messageRow = document.createElement("div")
    messageRow.className = "message-row user-row"
    messageRow.innerHTML = `
      <div class="chat-bubble user-message">
        ${text}
      </div>
      <div class="message-avatar user-avatar">
        <svg class="avatar-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="8" r="4" fill="currentColor"/>
          <path d="M6 21C6 17.134 8.686 14 12 14C15.314 14 18 17.134 18 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
    `
    container.appendChild(messageRow)
  }

  addAIMessage(container, text) {
    const messageRow = document.createElement("div")
    messageRow.className = "message-row ai-row"

    const existingLogo = document.querySelector('.ai-avatar img')
    const logoSrc = existingLogo ? existingLogo.src : '/assets/ffresq-logo-optimized-min.png'

    messageRow.innerHTML = `
      <div class="message-avatar ai-avatar">
        <img src="${logoSrc}" alt="resQ AI" class="avatar-img">
      </div>
      <div class="chat-bubble ai-message text-white animated-bubble position-relative" data-message="${text}">
        <span class="ai-text"></span>
        <div class="thinking-loader" data-thinking>
          <span class="thinking-text">Thinking</span>
          <svg class="typing-dots" width="24" height="16" viewBox="0 -6 24 16">
            <circle cx="4"  cy="4" r="3"></circle>
            <circle cx="12" cy="4" r="3"></circle>
            <circle cx="20" cy="4" r="3"></circle>
          </svg>
        </div>
      </div>
    `
    container.appendChild(messageRow)

    const bubble = messageRow.querySelector(".ai-message")
    animateThinkingDots(bubble)

    setTimeout(() => {
      revealMessageBubble(bubble)
    }, 2000)
  }

  reset() {
    const bubble = this.bubbleTarget
    const aiText = bubble.querySelector(".ai-text")
    const thinkingLoader = bubble.querySelector("[data-thinking]")

    delete bubble.dataset.animated

    if (aiText) {
      aiText.innerHTML = ""
      gsap.set(aiText, { clearProps: "all" })
    }

    if (!thinkingLoader) {
      const newThinking = document.createElement("div")
      newThinking.className = "thinking-loader"
      newThinking.dataset.thinking = ""
      newThinking.innerHTML = `
        <span class="thinking-text">Thinking</span>
        <svg class="typing-dots" width="24" height="16" viewBox="0 -6 24 16">
          <circle cx="4"  cy="4" r="3"></circle>
          <circle cx="12" cy="4" r="3"></circle>
          <circle cx="20" cy="4" r="3"></circle>
        </svg>
      `
      bubble.appendChild(newThinking)
    } else {
      gsap.set(thinkingLoader, { clearProps: "all" })
    }
  }
}
