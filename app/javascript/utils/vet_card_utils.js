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
 */
export function getOpeningStatus(place) {
  if (place.regularOpeningHours?.weekdayDescriptions) {
    const today = new Date().getDay()
    const dayIndex = VET_DISPLAY_CONFIG.dayIndexMapping[today]
    const todayHours = place.regularOpeningHours.weekdayDescriptions[dayIndex]

    if (todayHours) {
      // Extract just the hours part (remove day name)
      const hours = todayHours.split(': ')[1]
      return hours || ''
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
      // Split the weekday string into name ("Monday") and times ("10:00, 12:00")
      const [dayName, times] = day.split(': ');

      // Determine if this row represents the current day
      const today = new Date().getDay();
      const currentDayIndex = VET_DISPLAY_CONFIG.dayIndexMapping[today];
      const thisDayIndex = place.regularOpeningHours.weekdayDescriptions.indexOf(day);
      const isToday = thisDayIndex === currentDayIndex;

      // Fallback in case times is missing or null
      const timesSafe = times || '';

      // If we have times: keep the commas and add <br> after each one
      // If it's empty: show "Closed"
      const timeHtml = timesSafe.trim() !== ''
        ? `<span class="hours-slot">${timesSafe.replace(/,\s*/g, ',<br>')}</span>`
        : '<span class="hours-slot">Closed</span>';

      // Build the HTML for this weekday
      return `
        <div class="hours-row ${isToday ? 'hours-today' : ''}">
          <span class="hours-day">${dayName}</span>
          <span class="hours-time">${timeHtml}</span>
        </div>
      `;
    })
    .join('');


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
  const aiAppointmentEnabled = document.body?.dataset.aiAppointment === 'true'
  if (!hasIntake || !aiAppointmentEnabled) return ''

  const onclickAttr = stopPropagation ? ' onclick="event.stopPropagation()"' : ''

  return `
    <button data-action="click->appointment#makeAppointment"
            data-appointment-target="button"
            class="appointment-btn"${onclickAttr}>
      ${SVG_ICONS.calendar}
      <span style="padding-left:5px">Make Appointment</span>
    </button>
    <div class="appointment-status" data-appointment-target="status"></div>
    <div class="appointment-response hidden" data-appointment-target="notes"></div>
  `
}

/**
 * Creates the GetDirections Button
 * @param {*} directionsUrl
 * @returns
 */
export function createDirectionsButton(directionsUrl) {
  return `
  <div class="card-actions">
        <a href="${directionsUrl}" target="_blank" class="directions-btn" onclick="event.stopPropagation()">
         ${SVG_ICONS.directions}
        <span style="padding-left:5px">Get Directions</span></a>
  `
}
