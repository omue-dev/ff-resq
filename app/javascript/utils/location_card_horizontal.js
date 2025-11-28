// app/javascript/utils/location_card_horizontal.js

import {
  formatRating,
  getFormattedAddress,
  generateDirectionsUrl,
  getAllOpeningHours,
  createAppointmentSection,
  getOpeningStatus
} from "./vet_card_utils"

/**
 * Creates a horizontal location card in Google Maps style
 * Compact card for horizontal scrolling list
 *
 * @param {Object} place - Place object from Google Places API
 * @param {Function} onCardClick - Click handler for the card
 * @param {Function} onCardHover - Hover handler for highlighting marker
 * @returns {HTMLElement} Horizontal card DOM element
 */
export function createHorizontalLocationCard(place, onCardClick, onCardHover, hasIntake = false, onExpandChange = () => {}, userLocation = null, isNearest = false) {
  const card = document.createElement("div")
  card.className = "location-card-horizontal"
  card.dataset.placeId = place.id
  card.tabIndex = 0
  card.setAttribute("role", "button")
  card.setAttribute("aria-label", `${place.displayName} auswählen`)

  const ratingText = formatRating(place)
  const address = getFormattedAddress(place)
  const distanceText = userLocation ? formatDistance(userLocation, place.location) : null
  const todayHours = getOpeningStatus(place)

  // Get category info
  const categoryLabel = place.categoryLabel || 'Vet'
  const categoryClass = place.category || 'vets'

  const openingHours = getAllOpeningHours(place)
  const directionsUrl = generateDirectionsUrl(place)

  card.innerHTML = `
    <div class="location-card-content">
      <div class="location-card-icon">
        <i class="fas fa-briefcase-medical"></i>
      </div>
      <div class="location-card-info">
        <div class="location-card-header">
          <h3 class="location-card-title">${place.displayName}</h3>
          <span class="location-card-rating">${ratingText}</span>
        </div>
        <p class="location-card-category">${categoryLabel}</p>
        <p class="location-card-address">${address}</p>
        ${distanceText ? `<p class="location-card-distance">${distanceText}${isNearest ? ' · Nächstgelegen' : ''}</p>` : ''}
        ${todayHours ? `<p class="location-card-today">${todayHours}</p>` : ''}
      </div>
      <button class="location-card-expand-btn" type="button" aria-label="Expand card" title="Expand">
        <span class="expand-handle" aria-hidden="true"></span>
        <span class="visually-hidden">Expand</span>
      </button>
    </div>
    <div class="location-card-expanded hidden">
      ${openingHours ? `<div class="location-card-hours">${openingHours}</div>` : ''}
      <div class="card-actions">
        <a href="${directionsUrl}" target="_blank" class="directions-btn" onclick="event.stopPropagation()">Get Directions</a>
        ${createAppointmentSection(hasIntake, true)}
      </div>
    </div>
  `

  // Add category-specific class for styling
  card.classList.add(`category-${categoryClass}`)

  const expandSection = card.querySelector('.location-card-expanded')
  const expandButton = card.querySelector('.location-card-expand-btn')

  // Toggle expand/collapse
  if (expandButton && expandSection) {
    // default hidden
    expandSection.style.display = 'none'

    expandButton.addEventListener('click', (event) => {
      event.stopPropagation()
      const willShow = expandSection.classList.contains('hidden')
      setCardExpanded(card, willShow)
      onExpandChange(willShow)
    })
  }

  // Click handler
  card.addEventListener("click", (e) => {
    if (e.target.closest('.location-card-expand-btn') || e.target.closest('.directions-btn')) return
    onCardClick(place)
  })

  // Hover handler for marker highlighting
  card.addEventListener("mouseenter", () => {
    onCardHover(place, true)
  })

  card.addEventListener("mouseleave", () => {
    onCardHover(place, false)
  })

  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onCardClick(place)
    }
  })

  return card
}

function formatDistance(origin, destination) {
  const meters = distanceInMeters(origin, destination)
  if (!isFinite(meters)) return null
  const km = meters / 1000
  const rounded = km >= 10 ? km.toFixed(0) : km.toFixed(1)
  return `${rounded} km entfernt`
}

function distanceInMeters(origin, destination) {
  if (!origin || !destination) return Infinity
  const toRad = (deg) => (deg * Math.PI) / 180
  const originLat = typeof origin.lat === 'function' ? origin.lat() : origin.lat
  const originLng = typeof origin.lng === 'function' ? origin.lng() : origin.lng
  const destLat = typeof destination.lat === 'function' ? destination.lat() : destination.lat
  const destLng = typeof destination.lng === 'function' ? destination.lng() : destination.lng

  if ([originLat, originLng, destLat, destLng].some((v) => typeof v !== 'number')) return Infinity

  const R = 6371000
  const dLat = toRad(destLat - originLat)
  const dLng = toRad(destLng - originLng)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(originLat)) * Math.cos(toRad(destLat)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Updates card's active state
 * @param {HTMLElement} card - Card element
 * @param {boolean} isActive - Whether card should be active
 */
export function setCardActive(card, isActive) {
  if (isActive) {
    card.classList.add('active')
  } else {
    card.classList.remove('active')
  }
}

/**
 * Programmatically expands/collapses a card
 * @param {HTMLElement} card - Card element
 * @param {boolean} expanded - Whether card should be expanded
 */
export function setCardExpanded(card, expanded) {
  const expandSection = card.querySelector('.location-card-expanded')
  const expandButton = card.querySelector('.location-card-expand-btn')

  if (!expandSection || !expandButton) return

  if (expanded) {
    expandSection.classList.remove('hidden')
    expandSection.style.display = 'block'
    expandButton.classList.add('expanded')
  } else {
    expandSection.classList.add('hidden')
    expandSection.style.display = 'none'
    expandButton.classList.remove('expanded')
  }
}
