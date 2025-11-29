// app/javascript/utils/google_maps_utils.js

import { MAPS_CONFIG, getUserMarkerIcon, getVetMarkerIcon } from "../config/google_maps_config"

// Fallback list of fields to request from Google Places when config is missing/invalid
const DEFAULT_PLACE_FIELDS = [
  "displayName",
  "location",
  "formattedAddress",
  "rating",
  "id",
  "types",
  "regularOpeningHours"
]

// Simple haversine distance (meters) for client-side radius filtering
function distanceInMeters(origin, destination) {
  if (!origin || !destination) return Infinity

  const toRad = (deg) => (deg * Math.PI) / 180
  const originLat = typeof origin.lat === 'function' ? origin.lat() : origin.lat
  const originLng = typeof origin.lng === 'function' ? origin.lng() : origin.lng
  const destLat = typeof destination.lat === 'function' ? destination.lat() : destination.lat
  const destLng = typeof destination.lng === 'function' ? destination.lng() : destination.lng

  if ([originLat, originLng, destLat, destLng].some((v) => typeof v !== 'number')) return Infinity

  const R = 6371000 // Earth radius in meters
  const dLat = toRad(destLat - originLat)
  const dLng = toRad(destLng - originLng)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(originLat)) * Math.cos(toRad(destLat)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function filterByRadius(places, userLocation, maxRadiusMeters) {
  if (!maxRadiusMeters) return places
  return places.filter((place) => distanceInMeters(userLocation, place.location) <= maxRadiusMeters)
}

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
 * Uses polling to ensure google.maps.Map is actually available
 *
 * @returns {Promise<void>} Resolves when Google Maps is ready
 */
export function waitForGoogleMaps() {
  return new Promise((resolve) => {
    // If Google Maps API is fully loaded and Map constructor exists
    if (window.google && window.google.maps && window.google.maps.Map) {
      resolve()
      return
    }

    // Poll for google.maps.Map availability (max 10 seconds)
    const maxAttempts = 100
    let attempts = 0

    const checkGoogleMaps = () => {
      attempts++

      if (window.google && window.google.maps && window.google.maps.Map) {
        resolve()
        return
      }

      if (attempts >= maxAttempts) {
        console.error("Google Maps failed to load after 10 seconds")
        resolve() // Resolve anyway to prevent hanging
        return
      }

      // Check again in 100ms
      setTimeout(checkGoogleMaps, 100)
    }

    checkGoogleMaps()
  })
}

/**
 * Creates a marker for the user's current location
 * Uses standard Marker API (works with inline styles for dark mode)
 *
 * @param {google.maps.Map} map - The map instance to add the marker to
 * @param {Object} location - Location object with lat and lng properties
 * @param {number} location.lat - Latitude
 * @param {number} location.lng - Longitude
 * @param {string} [iconUrl] - Optional custom icon URL (from Rails asset pipeline)
 * @returns {google.maps.Marker} The created marker instance
 */
export function createUserMarker(map, location, iconUrl = null) {
  const iconConfig = iconUrl
    ? { ...getUserMarkerIcon(), url: iconUrl }
    : getUserMarkerIcon()

  return new google.maps.Marker({
    map: map,
    position: location,
    title: MAPS_CONFIG.MARKERS.userMarkerTitle,
    icon: {
      url: iconConfig.url,
      scaledSize: iconConfig.scaledSize,
      anchor: iconConfig.anchor
    }
  })
}

/**
 * Creates a marker for a veterinary location
 * Uses standard Marker API (works with inline styles for dark mode)
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

  const iconConfig = getVetMarkerIcon()

  return new google.maps.Marker({
    map: map,
    position: place.location,
    title: place.markerTitle || place.displayName,
    icon: {
      url: iconConfig.url,
      scaledSize: iconConfig.scaledSize,
      anchor: iconConfig.anchor
    }
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
 * Normalizes a Places API result into a consistent shape
 * Ensures we always have a displayName string and location for downstream code
 *
 * @param {Object} place - Raw place object from the Places API
 * @param {string} categoryKey - vets | shelters | rescue
 * @param {Object} [categoryMeta] - Category metadata
 * @returns {Object|null} Normalized place or null if required fields missing
 */
function normalizePlace(place, categoryKey, categoryMeta = {}) {
  if (!place) return null

  const id = place.id || place.placeId || place.place_id || null
  const displayName = place.displayName?.text || place.displayName || place.name
  const location = place.location || place.geometry?.location
  const formattedAddress = place.formattedAddress || place.formatted_address || null
  const rating = typeof place.rating === 'number' ? place.rating : null
  const types = Array.isArray(place.types) ? place.types : []
  const regularOpeningHours = place.regularOpeningHours || place.regular_opening_hours || null

  if (!displayName || !location) return null

  return {
    ...place,
    id,
    displayName,
    location,
    formattedAddress,
    rating,
    types,
    regularOpeningHours,
    category: categoryKey,
    categoryLabel: categoryMeta.label,
    categoryColor: categoryMeta.color
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

/**
 * Fetches detailed information for a place including opening hours
 * The searchNearby API doesn't always return full opening hours data,
 * so we need to fetch place details separately
 *
 * @param {Object} place - Place object from searchNearby
 * @returns {Promise<Object>} Enhanced place object with full details
 */
export async function fetchPlaceDetails(place) {
  try {
    // Fetch additional fields that might not be in the initial search
    await place.fetchFields({
      fields: ['regularOpeningHours']
    })

    console.log("[google_maps_utils] Fetched place details for:", place.displayName, place.regularOpeningHours)
    return place
  } catch (error) {
    console.error("[google_maps_utils] Error fetching place details:", error)
    // Return the original place if fetching fails
    return place
  }
}

/**
 * Searches for all animal service locations (vets, shelters, rescue orgs)
 *
 * @param {Object} userLocation - User's location object
 * @param {number} userLocation.lat - Latitude
 * @param {number} userLocation.lng - Longitude
 * @returns {Promise<Object>} Object with categorized places { vets: [], shelters: [], rescue: [] }
 */
export async function searchAllAnimalServices(userLocation) {
  const config = MAPS_CONFIG.ANIMAL_SERVICES_SEARCH
  const results = {
    vets: [],
    shelters: [],
    rescue: []
  }

  try {
    // Search for vets (uses includedTypes)
    results.vets = await searchByCategory(userLocation, 'vets', config)

    // Search for shelters (uses textQuery)
    results.shelters = await searchByTextQuery(userLocation, 'shelters', config)

    // Search for rescue organizations (uses textQuery)
    results.rescue = await searchByTextQuery(userLocation, 'rescue', config)

    console.log("[google_maps_utils] All animal services search results:", results)
    return results
  } catch (error) {
    console.error("[google_maps_utils] Error searching animal services:", error)
    throw error
  }
}

/**
 * Searches for places by category
 *
 * @param {Object} userLocation - User's location
 * @param {string} categoryKey - Category key (vets, shelters, rescue)
 * @param {Object} config - Search configuration
 * @returns {Promise<Array>} Array of places with category metadata
 */
async function searchByCategory(userLocation, categoryKey, config) {
  const category = config.categories[categoryKey]
  const fields = Array.isArray(config.fields) && config.fields.length ? config.fields : DEFAULT_PLACE_FIELDS

  const request = {
    fields: fields,
    locationRestriction: {
      center: userLocation,
      radius: config.radius
    },
    includedTypes: category.includedTypes,
    maxResultCount: config.maxResultCount,
    rankPreference: google.maps.places.SearchNearbyRankPreference.DISTANCE
  }

  const { places } = await google.maps.places.Place.searchNearby(request)

  // Normalize, ensure required fields, add category metadata, and enforce radius
  const normalized = (places || [])
    .map(place => normalizePlace(place, categoryKey, category))
    .filter(Boolean)

  return filterByRadius(normalized, userLocation, config.radius)
}

/**
 * Searches for places by text query (used for shelters and rescue orgs)
 *
 * @param {Object} userLocation - User's location
 * @param {string} categoryKey - Category key (shelters, rescue)
 * @param {Object} config - Search configuration
 * @returns {Promise<Array>} Array of places
 */
async function searchByTextQuery(userLocation, categoryKey, config) {
  const category = config.categories[categoryKey]
  const fields = Array.isArray(config.fields) && config.fields.length ? config.fields : DEFAULT_PLACE_FIELDS

  const request = {
    fields: fields,
    textQuery: category.textQuery,
    locationBias: {
      center: userLocation,
      radius: config.radius
    },
    maxResultCount: config.maxResultCount
  }

  try {
    const { places } = await google.maps.places.Place.searchByText(request)

    if (!places || places.length === 0) {
      return []
    }

    // Fetch full details for each place to get location and other fields
    const enrichedPlaces = await Promise.all(
      places.map(async (place) => {
        try {
          await place.fetchFields({ fields })
          return place
        } catch (error) {
          console.warn(`[google_maps_utils] Failed to fetch fields for place:`, error)
          return null
        }
      })
    )

    // Normalize and filter out incomplete results
    const normalized = enrichedPlaces
      .map(place => normalizePlace(place, categoryKey, category))
      .filter(Boolean)

    return filterByRadius(normalized, userLocation, config.radius)
  } catch (error) {
    console.warn(`[google_maps_utils] ${categoryKey} search failed, returning empty:`, error)
    return []
  }
}
