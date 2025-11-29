// app/javascript/utils/vet_card_utils.js

import { SVG_ICONS, VET_DISPLAY_CONFIG } from "config/vets_config"

/**
 * Veterinary Card Utility Functions
 *
 * Reusable functions for creating and managing veterinary location cards.
 * These utilities handle UI generation for vet information display.
 */

/**
 * Gets the opening status text for today
 * Extracts today's opening hours from place data
 *
 * @param {Object} place - Place object from Google Places API
 * @param {Object} [place.regularOpeningHours] - Regular opening hours data
 * @param {string[]} [place.regularOpeningHours.weekdayDescriptions] - Array of opening hours by day
 * @returns {string|null} Formatted opening hours string for today, or null if unavailable
 *
 * @example
 * const status = getOpeningStatus(place)
 * // Returns: "<strong>Today:</strong> 9:00 AM – 5:00 PM"
 */
export function getOpeningStatus(place) {
  if (place.regularOpeningHours?.weekdayDescriptions) {
    const today = new Date().getDay()
    const dayIndex = VET_DISPLAY_CONFIG.dayIndexMapping[today]
    const todayHours = place.regularOpeningHours.weekdayDescriptions[dayIndex]

    if (todayHours) {
      // Extract just the hours part (remove day name)
      const hours = todayHours.split(': ')[1]
      return `<strong>Today:</strong> ${hours}`
    }
  }
  return null
}

/**
 * Gets all opening hours formatted as HTML
 * @param {Object} place - Place object from Google Places API
 * @returns {string} HTML string with all opening hours or empty string if unavailable
 */
export function getAllOpeningHours(place) {
  if (!place.regularOpeningHours?.weekdayDescriptions) {
    return ''
  }

  const hours = place.regularOpeningHours.weekdayDescriptions
    .map(day => {
      const [dayName, times] = day.split(': ')
      const today = new Date().getDay()
      const currentDayIndex = VET_DISPLAY_CONFIG.dayIndexMapping[today]
      const thisDayIndex = place.regularOpeningHours.weekdayDescriptions.indexOf(day)
      const isToday = thisDayIndex === currentDayIndex

      const timeParts = (times || '').split(', ').filter(Boolean)
      const timeHtml = timeParts.length > 0
        ? timeParts.map(part => `<span class="hours-slot">${part}</span>`).join('')
        : '<span class="hours-slot">Geschlossen</span>'

      return `<div class="hours-row ${isToday ? 'hours-today' : ''}">
        <span class="hours-day">${dayName}</span>
        <span class="hours-time">${timeHtml}</span>
      </div>`
    })
    .join('')

  return `<div class="opening-hours-full">${hours}</div>`
}

/**
 * Generates a Google Maps directions URL for a place
 * Handles both LatLng objects and plain location objects
 *
 * @param {Object} place - Place object from Google Places API
 * @param {Object} place.location - Location object (google.maps.LatLng or plain object)
 * @param {number|Function} place.location.lat - Latitude value or getter function
 * @param {number|Function} place.location.lng - Longitude value or getter function
 * @returns {string} Google Maps directions URL or '#' if location unavailable
 *
 * @example
 * const url = generateDirectionsUrl(place)
 * // Returns: "https://www.google.com/maps/dir/?api=1&destination=37.7749,-122.4194"
 */
export function generateDirectionsUrl(place) {
  if (place.location) {
    const lat = typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat
    const lng = typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng
    return `${VET_DISPLAY_CONFIG.directionsUrlTemplate}${lat},${lng}`
  }
  return '#'
}

/**
 * Formats the rating text for display
 *
 * @param {Object} place - Place object from Google Places API
 * @param {number} [place.rating] - Rating value (0-5)
 * @returns {string} Formatted rating text with icon
 *
 * @example
 * const rating = formatRating(place)
 * // Returns: "⭐ 4.5/5" or "No rating"
 */
export function formatRating(place) {
  return place.rating
    ? `${VET_DISPLAY_CONFIG.ratingIcon} ${place.rating}/5`
    : VET_DISPLAY_CONFIG.noRatingText
}

/**
 * Gets the formatted address or default text
 *
 * @param {Object} place - Place object from Google Places API
 * @param {string} [place.formattedAddress] - Formatted address string
 * @returns {string} Address or default text if unavailable
 */
export function getFormattedAddress(place) {
  return place.formattedAddress || VET_DISPLAY_CONFIG.noAddressText
}

/**
 * Creates the appointment section HTML if user has an intake
 *
 * @param {boolean} hasIntake - Whether the user has an active intake
 * @param {boolean} [stopPropagation=false] - Whether to add onclick event to stop propagation
 * @returns {string} HTML string for appointment section or empty string
 */
export function createAppointmentSection(hasIntake, stopPropagation = false) {
  if (!hasIntake) return ''

  const onclickAttr = stopPropagation ? ' onclick="event.stopPropagation()"' : ''

  return `
    <button data-action="click->appointment#makeAppointment"
            data-appointment-target="button"
            class="appointment-btn"${onclickAttr}>
      ${SVG_ICONS.calendar}
      <span>Make Appointment</span>
    </button>
    <div class="appointment-status" data-appointment-target="status"></div>
    <div class="appointment-response hidden" data-appointment-target="notes"></div>
  `
}

/**
 * Creates a veterinary location card DOM element
 * Generates a complete card with all vet information and action buttons
 *
 * @param {Object} place - Place object from Google Places API
 * @param {string} place.displayName - Name of the veterinary location
 * @param {Object} place.location - Location coordinates
 * @param {string} [place.formattedAddress] - Full address
 * @param {number} [place.rating] - Rating (0-5)
 * @param {Object} [place.regularOpeningHours] - Opening hours data
 * @param {boolean} hasIntake - Whether the user has an active intake (enables appointment button)
 * @param {Function} onCardClick - Click handler for the card (receives place object)
 * @returns {HTMLElement} Complete card DOM element
 *
 * @example
 * const card = createVetCard(place, true, (place) => {
 *   console.log("Card clicked:", place.displayName)
 * })
 * vetListElement.appendChild(card)
 */
export function createVetCard(place, hasIntake, onCardClick) {
  const ratingText = formatRating(place)
  const address = getFormattedAddress(place)
  const allOpeningHours = getAllOpeningHours(place)
  const googleMapsUrl = generateDirectionsUrl(place)
  const appointmentSection = createAppointmentSection(hasIntake, true)

  const card = document.createElement("div")
  card.className = "vet-card"

  card.innerHTML = `
    <div class="card-body">
      <div class="card-header-section">
        <h5 class="card-title">${place.displayName}</h5>
        <p class="card-rating">${ratingText}</p>
      </div>
      <p class="card-address">${address}</p>
      ${allOpeningHours ? `<div class="card-hours">${allOpeningHours}</div>` : ''}
      <div class="card-actions">
        <a href="${googleMapsUrl}" target="_blank" class="directions-btn" onclick="event.stopPropagation()">
          <span>Get Directions</span>
          ${SVG_ICONS.arrowRight}
        </a>
        ${appointmentSection}
      </div>
    </div>
  `

  // Click handler to show detail modal (not on buttons)
  card.addEventListener("click", (e) => {
    if (!e.target.closest('.directions-btn') && !e.target.closest('.appointment-btn')) {
      onCardClick(place)
    }
  })

  return card
}

/**
 * Creates the modal content HTML for veterinary location details
 * Used for displaying full vet information in a modal dialog
 *
 * @param {Object} place - Place object from Google Places API
 * @param {string} place.displayName - Name of the veterinary location
 * @param {Object} place.location - Location coordinates
 * @param {string} [place.formattedAddress] - Full address
 * @param {number} [place.rating] - Rating (0-5)
 * @param {Object} [place.regularOpeningHours] - Opening hours data
 * @param {boolean} hasIntake - Whether the user has an active intake
 * @param {string} closeAction - Stimulus action string for close button
 * @returns {string} Complete modal content HTML
 *
 * @example
 * const html = createVetModalContent(place, true, "click->nearby-vets#closeDetailModal")
 * modalElement.innerHTML = html
 */
export function createVetModalContent(place, hasIntake, closeAction) {
  const ratingText = formatRating(place)
  const address = getFormattedAddress(place)
  const allOpeningHours = getAllOpeningHours(place)
  const googleMapsUrl = generateDirectionsUrl(place)
  const appointmentSection = createAppointmentSection(hasIntake, false)

  return `
    <button data-action="${closeAction}" class="vet-modal-close">×</button>
    <div class="vet-card vet-card-detail">
      <div class="card-body">
        <div class="card-header-section">
          <h5 class="card-title">${place.displayName}</h5>
          <p class="card-rating">${ratingText}</p>
        </div>
        <p class="card-address">${address}</p>
        ${allOpeningHours ? `<div class="card-hours">${allOpeningHours}</div>` : ''}
        <div class="card-actions">
          <a href="${googleMapsUrl}" target="_blank" class="directions-btn">
            <span>Get Directions</span>
            ${SVG_ICONS.arrowRight}
          </a>
          ${appointmentSection}
        </div>
      </div>
    </div>
  `
}
