// app/javascript/utils/google_maps_utils.js

import { MAPS_CONFIG, getUserMarkerIcon, getVetMarkerIcon } from "config/google_maps_config"

/**
 * Google Maps Utility Functions
 *
 * Reusable functions for working with Google Maps API.
 * These utilities handle common map operations like marker creation,
 * place searches, and script loading.
 */

/**
 * Waits for Google Maps API to be loaded and ready
 * Handles cases where the script is already loaded or still loading
 *
 * @returns {Promise<void>} Resolves when Google Maps is ready
 */
export function waitForGoogleMaps() {
  return new Promise((resolve) => {
    // If Google Maps is already loaded (Turbo back etc.)
    if (window.google && window.google.maps) {
      resolve()
      return
    }

    // Otherwise wait for the script to load
    const script = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    )

    if (script) {
      script.addEventListener("load", () => resolve(), { once: true })
    } else {
      console.error("Google Maps script tag not found")
      resolve() // Resolve anyway to prevent hanging
    }
  })
}

/**
 * Creates a marker for the user's current location
 *
 * @param {google.maps.Map} map - The map instance to add the marker to
 * @param {Object} location - Location object with lat and lng properties
 * @param {number} location.lat - Latitude
 * @param {number} location.lng - Longitude
 * @returns {google.maps.Marker} The created marker instance
 */
export function createUserMarker(map, location) {
  return new google.maps.Marker({
    map: map,
    position: location,
    title: MAPS_CONFIG.MARKERS.userMarkerTitle,
    icon: getUserMarkerIcon()
  })
}

/**
 * Creates a marker for a veterinary location
 *
 * @param {google.maps.Map} map - The map instance to add the marker to
 * @param {Object} place - Place object from Google Places API
 * @param {Object} place.location - Place location (LatLng object)
 * @param {string} place.displayName - Name of the veterinary location
 * @returns {google.maps.Marker|null} The created marker instance, or null if location is missing
 */
export function createVetMarker(map, place) {
  if (!place.location) {
    console.warn("Place is missing location data:", place)
    return null
  }

  return new google.maps.Marker({
    map: map,
    position: place.location,
    title: place.displayName,
    icon: getVetMarkerIcon()
  })
}

/**
 * Searches for nearby veterinary care locations using Google Places API
 *
 * @param {Object} userLocation - User's location object
 * @param {number} userLocation.lat - Latitude
 * @param {number} userLocation.lng - Longitude
 * @param {Object} [options={}] - Optional configuration overrides
 * @param {number} [options.radius] - Search radius in meters
 * @param {number} [options.maxResultCount] - Maximum number of results
 * @returns {Promise<Array>} Array of place objects from the Places API
 * @throws {Error} If the Places API request fails
 */
export async function searchNearbyVets(userLocation, options = {}) {
  const config = MAPS_CONFIG.VET_SEARCH

  const request = {
    fields: config.fields,
    locationRestriction: {
      center: userLocation,
      radius: options.radius || config.radius
    },
    includedTypes: config.includedTypes,
    maxResultCount: options.maxResultCount || config.maxResultCount,
    rankPreference: google.maps.places.SearchNearbyRankPreference.DISTANCE
  }

  try {
    const { places } = await google.maps.places.Place.searchNearby(request)
    console.log("[google_maps_utils] Nearby vets search results:", places)
    return places || []
  } catch (error) {
    console.error("[google_maps_utils] Places API error:", error)
    throw error
  }
}

/**
 * Gets the user's current geolocation
 *
 * @returns {Promise<Object>} Resolves with location object { lat, lng }
 * @throws {Error} If geolocation is not supported or permission denied
 */
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      (error) => {
        reject(error)
      }
    )
  })
}

/**
 * Creates a Google Map instance with default styling
 *
 * @param {HTMLElement} mapElement - The DOM element to render the map in
 * @param {Object} center - Center location for the map
 * @param {number} center.lat - Latitude
 * @param {number} center.lng - Longitude
 * @param {Object} [options={}] - Optional map configuration overrides
 * @returns {google.maps.Map} The created map instance
 */
export function createMap(mapElement, center, options = {}) {
  const map = new google.maps.Map(mapElement, {
    center: center,
    ...MAPS_CONFIG.MAP_OPTIONS,
    ...options
  })

  return map
}
