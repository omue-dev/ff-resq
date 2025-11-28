// app/javascript/config/vets_config.js

/**
 * Veterinary UI Configuration
 *
 * Centralized configuration for UI elements, SVG icons, and display constants
 * specific to veterinary location features.
 * Used by nearby_vets_controller and related utilities.
 */

/**
 * SVG icon definitions for reusable UI components
 */
export const SVG_ICONS = {
  /**
   * Calendar icon for appointment scheduling
   * @type {string}
   */
  calendar: `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M16 2v4M8 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
    </svg>
  `,

  /**
   * Arrow right icon for navigation and directions
   * @type {string}
   */
  arrowRight: `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  `
}

/**
 * Configuration for veterinary location display
 */
export const VET_DISPLAY_CONFIG = {
  /**
   * Default text when rating is unavailable
   * @type {string}
   */
  noRatingText: "No rating",

  /**
   * Default text when address is unavailable
   * @type {string}
   */
  noAddressText: "Address not available",

  /**
   * Star emoji for rating display
   * @type {string}
   */
  ratingIcon: "⭐",

  /**
   * Day name to index mapping for opening hours
   * Converts JavaScript Date.getDay() (Sunday=0) to weekday array index (Monday=0)
   * @type {Object}
   */
  dayIndexMapping: {
    0: 6, // Sunday -> 6
    1: 0, // Monday -> 0
    2: 1, // Tuesday -> 1
    3: 2, // Wednesday -> 2
    4: 3, // Thursday -> 3
    5: 4, // Friday -> 4
    6: 5  // Saturday -> 5
  },

  /**
   * Google Maps directions URL template
   * @type {string}
   */
  directionsUrlTemplate: "https://www.google.com/maps/dir/?api=1&destination="
}
