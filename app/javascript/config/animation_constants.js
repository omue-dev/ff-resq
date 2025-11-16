/**
 * Centralized animation configuration for GSAP animations
 * Used across multiple controllers for consistency
 */
export const ANIMATION_CONFIG = {
  /**
   * Configuration for AI message bubble reveal animations
   */
  MESSAGE_REVEAL: {
    duration: 0.6,
      blur: {
        initial: 8,
        final: 0
      },
      scale: {
        initial: 0.98,
        final: 1
      },
      yOffset: 20,
      ease: "power2.out",
  },

  /**
   * Configuration for thinking dots bounce animation
   */
  THINKING_DOTS: {
    duration: 0.4,
    yOffset: 10,
    stagger: 0.15,
    ease: "power1.inOut"
  },

  /**
   * Configuration for curtain opening animation (page transitions)
   */
  CURTAIN_OPEN: {
    duration: 1.5,
    ease: "power4.inOut",
    stagger: 0.05,
    scaleX: {
      initial: 0,
      final: 1
    }
  },

  /**
   * Configuration for card slide animations (form transitions)
   */
  CARD_SLIDE: {
    duration: 0.8,
    ease: "power2.inOut",
    xOffset: 100,
    opacity: {
      initial: 0,
      final: 1
    }
  },
  /**
   * Configuration for animal image animations in curtain
   */
  ANIMAL_ANIMATION: {
    duration: 2.5,
    ease: "power2.out",
    scale: {
      initial: 0.8,
      final: 1
    },
    y: {
      initial: 50,
      final: 0
    },
    stagger: 0.1
  },

  /**
   * Configuration for curtain opening animation (page transitions)
   */
  CURTAIN_OPEN: {
    duration: 1.5,
    ease: "power4.inOut",
    stagger: 0.05,
    scaleX: {
      initial: 0,
      final: 1
    }
  },

  /**
   * Configuration for card slide animations (form transitions)
   */
  CARD_SLIDE: {
    duration: 0.8,
    ease: "power2.inOut",
    xOffset: 100,
    opacity: {
      initial: 0,
      final: 1
    }
  },

  /**
   * Configuration for animal image animations in curtain
   */
  ANIMAL_ANIMATION: {
    duration: 2.5,
    ease: "power2.out",
    scale: {
      initial: 0.8,
      final: 1
    },
    y: {
      initial: 50,
      final: 0
    },
    stagger: 0.1
  },

  /**
   * Configuration for message slide-in animations
   */
  MESSAGE_SLIDE_IN: {
    user: {
      xOffset: '100%',
      duration: 0.5,
      ease: 'power2.out'
    },
    ai: {
      xOffset: '-30%',
      duration: 0.5,
      ease: 'power2.out'
    }
  },

  /**
   * Delays and timeouts used across controllers
   */
  DELAYS: {
    messageReveal: 50,
    formSubmit: 100,
    pollingInterval: 1000,
    pollingBackoffMultiplier: 2
  }
}

/**
 * Animation easing presets for consistency
 */
export const EASING_PRESETS = {
  smooth: "power2.out",
  snappy: "power2.inOut",
  bounce: "back.out(1.7)",
  elastic: "elastic.out(1, 0.3)"
}
