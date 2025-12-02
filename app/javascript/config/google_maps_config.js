// app/javascript/config/google_maps_config.js

/**
 * Google Maps configuration and helpers.
 * Centralizes map styling, search parameters, and marker icon definitions.
 */

/**
 * Custom map styling configuration (dark teal theme to match UI).
 */
export const MAP_STYLES = [
    {
      elementType: "geometry",
      stylers: [{ color: "#0E5050" }] // teal background
    },
    {
      elementType: "labels.text.fill",
      // Google Maps style colors must be #RRGGBB (no alpha channel)
      stylers: [{ color: "#6dd8b8" }] // fox-cream text
    },
    {
      elementType: "labels.text.stroke",
      stylers: [{ color: "#073131" }]
    },
    {
      featureType: "water",
      stylers: [{ color: "#30b3ff" }] // brighter teal glow
    },
    {
      featureType: "poi",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "landscape",
      stylers: [{ color: "#00595F" }]
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#2C2C29" }] // charcoal from logo outline
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#bcdbe0" }] // fox orange accents
    },
    {
      featureType: "road",
      elementType: "labels.text.stroke",
      stylers: [{ color: "#0A2C2C" }]
    },
    {
      featureType: "transit",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "administrative",
      stylers: [{ visibility: "off" }]
    }
  ]

/**
 * Custom marker icon configuration - User location.
 * Uses the fox avatar image.
 *
 * @returns {google.maps.Icon}
 */
export function getUserMarkerIcon() {
  return {
    url: '/assets/fox-avatar-min.png',
    scaledSize: new google.maps.Size(40, 40),
    anchor: new google.maps.Point(20, 20), // Center of the image
  }
}

/**
 * Custom marker icon configuration
 *
 * @returns {google.maps.Icon}
 */
export function getVetMarkerIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
      <!-- Clean pin shape -->
      <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 32 16 32s16-21 16-32C32 7.163 24.837 0 16 0z"
            fill="$card-border"/>

      <!-- White circle background -->
      <circle cx="16" cy="16" r="10" fill="#FFFFFF"/>
    </svg>
  `

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(32, 48),
    anchor: new google.maps.Point(16, 48), // Bottom center of the pin
  }
}

/**
 * Active/selected marker icon configuration
 * Slightly different color to highlight the selected card/marker.
 *
 * @returns {google.maps.Icon}
 */
export function getActiveVetMarkerIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 32 16 32s16-21 16-32C32 7.163 24.837 0 16 0z"
            fill="#ffb347"/>
      <circle cx="16" cy="16" r="10" fill="#FFFFFF"/>
    </svg>
  `

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(32, 48),
    anchor: new google.maps.Point(16, 48),
  }
}

/**
 * Main Google Maps configuration object.
 */
export const MAPS_CONFIG = {
  /**
   * Default map display options.
   */
  MAP_OPTIONS: {
    zoom: 12,
    // NOTE: Using inline styles instead of Map ID because Google Maps doesn't support
    // custom dark styles with Map IDs (data-driven styles limitation)
    styles: MAP_STYLES, // Custom dark teal theme
    // Disable all default UI controls
    disableDefaultUI: true,
    // Optional: Enable only specific controls you want
    zoomControl: false,
    // Remove Google branding and legal text
    mapTypeControl: false,
    scaleControl: false,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: false
  },

  /**
   * Animal services search configuration.
   */
  ANIMAL_SERVICES_SEARCH: {
    /**
     * Fields to retrieve from Places API for each location.
     */
    fields: [
      "displayName",
      "location",
      "formattedAddress",
      "rating",
      "id",
      "types",
      "regularOpeningHours",
      "nationalPhoneNumber"
    ],

    /**
     * Search radius in meters (8km).
     */
    radius: 8000,

    /**
     * Maximum number of results to return per category.
     */
    maxResultCount: 10,

    /**
     * Place type configurations for different animal services.
     */
    categories: {
      vets: {
        includedTypes: ["veterinary_care"],
        icon: "medical",
        label: "Vets",
        color: "$card-border"
      },
      shelters: {
        // Use text query since animal_shelter is not a supported type
        textQuery: "animal shelter",
        icon: "home",
        label: "Shelters",
        color: "#6dd8b8ff"
      },
      rescue: {
        // Google doesn't have a specific type, so we'll use keyword search
        textQuery: "animal rescue organization",
        icon: "paw",
        label: "Rescue",
        color: "#ffa500"
      }
    },

    /**
     * Rank results by distance from user location.
     */
    rankPreference: "DISTANCE" // Will be mapped to google.maps.places.SearchNearbyRankPreference.DISTANCE
  },

  /**
   * Legacy VET_SEARCH config (kept for backwards compatibility).
   */
  VET_SEARCH: {
    fields: [
      "displayName",
      "location",
      "formattedAddress",
      "rating",
      "id",
      "types",
      "regularOpeningHours",
      "nationalPhoneNumber"
    ],
    radius: 10000,
    maxResultCount: 5,
    includedTypes: ["veterinary_care"],
    rankPreference: "DISTANCE"
  },

  /**
   * Marker configuration.
   */
  MARKERS: {
    userMarkerTitle: "You are here",
    vetMarkerTitle: "Veterinary Care"
  }
}
