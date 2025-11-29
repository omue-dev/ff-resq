// app/javascript/config/vets_config.js

/**
 * Veterinary UI configuration.
 * Icons and display constants shared by vets-related components.
 */

/**
 * SVG icon definitions for reusable UI components.
 */
export const SVG_ICONS = {
  /**
   * Calendar icon for appointment scheduling.
   * @type {string}
   */
  calendar: `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M16 2v4M8 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
    </svg>
  `,

  /**
   * Arrow right icon for navigation and directions.
   * @type {string}
   */
  arrowRight: `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  `,

  /**
   * Map pin icon for "Get Directions" buttons.
   * @type {string}
   */
  directions:`
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">

      <!-- Car body -->
      <path d="M3 10l2-5h14l2 5v7a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2v-7z" />

      <!-- Windshield -->
      <path d="M5 5h14" />

      <!-- Headlights -->
      <circle cx="7" cy="13" r="1" />
      <circle cx="17" cy="13" r="1" />
    </svg>
  `
}

/**
 * Configuration for veterinary location display.
 */
export const VET_DISPLAY_CONFIG = {
  /**
   * Default text when rating is unavailable.
   * @type {string}
   */
  noRatingText: "No rating",

  /**
   * Default text when address is unavailable.
   * @type {string}
   */
  noAddressText: "Address not available",

  /**
   * Star emoji for rating display.
   * @type {string}
   */
  ratingIcon: "⭐",

  /**
   * Day name to index mapping for opening hours.
   * Converts JavaScript Date.getDay() (Sunday=0) to weekday array index (Monday=0).
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
   * Google Maps directions URL template.
   * @type {string}
   */
  directionsUrlTemplate: "https://www.google.com/maps/dir/?api=1&destination="
}
