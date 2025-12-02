// app/javascript/utils/location_card_horizontal.js

import {
  formatRating,
  getFormattedAddress,
  generateDirectionsUrl,
  getAllOpeningHours,
  createAppointmentSection,
  getOpeningStatus
} from "utils/vet_card_utils"
import { distanceInMeters, formatDistanceLabel } from "utils/distance_utils"
import { createDirectionsButton } from "utils/vet_card_utils"

/**
 * Creates a horizontal location card in Google Maps style.
 * Compact cards used for the horizontal scrolling list in Nearby Vets.
 *
 * @param {Object} place - Place object from Google Places API
 * @param {Function} onCardClick - Click handler for the card
 * @param {Function} onCardHover - Hover handler for highlighting marker
 * @param {boolean} hasIntake - Whether the user has an active intake
 * @param {Function} onExpandChange - Callback when expansion toggles
 * @param {Object|null} userLocation - User lat/lng for distance display
 * @param {boolean} isNearest - Whether this place is the nearest
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
  const titleText = truncateTitle(place.displayName)
  const address = getFormattedAddress(place)
  const distanceText = userLocation ? formatDistance(userLocation, place.location) : null
  const todayHours = getOpeningStatus(place)
  const metaLine = buildMetaLine(distanceText, todayHours, isNearest)
  const phoneNumber = formatPhoneNumber(place.phoneNumber)
  const phoneHref = buildTelHref(place.phoneNumber)

  const categoryLabel = place.categoryLabel || 'VETERINARY'
  const categoryClass = place.category || 'veterinary'

  const openingHours = getAllOpeningHours(place)
  const directionsUrl = generateDirectionsUrl(place)

  card.innerHTML = `
    <div class="location-card-content">
      <div class="location-card-info">
        <div class="location-card-header">
          <h3 class="location-card-title" title="${place.displayName}">${titleText}</h3>
          <span class="location-card-rating">${ratingText}</span>
        </div>
        <p class="location-card-category">${categoryLabel}</p>
        <p class="location-card-address">${address}</p>
        <div class="location-card-divider"></div>
        ${phoneNumber ? `
          <div class="location-card-contact">
            <a class="phone-link" href="${phoneHref}" onclick="event.stopPropagation()">
              <i class="fa-solid fa-phone"></i>
              <span class="phone-number">${phoneNumber}</span>
            </a>
          </div>
        ` : ''}
        <div class="location-card-divider compact"></div>
        ${metaLine ? `<p class="location-card-meta">${metaLine}</p>` : ''}
      </div>
      <button class="location-card-expand-btn" type="button" aria-label="Expand card" title="Expand">
        <span class="expand-handle" aria-hidden="true"></span>
        <span class="visually-hidden">Expand</span>
      </button>
    </div>
    <div class="location-card-expanded hidden">
      ${openingHours ? `<div class="location-card-hours">${openingHours}</div>` : ''}
        ${createDirectionsButton(directionsUrl)}
        ${createAppointmentSection(hasIntake, true)}
      </div>
    </div>
  `

  card.classList.add(`category-${categoryClass}`)

  const expandSection = card.querySelector('.location-card-expanded')
  const expandButton = card.querySelector('.location-card-expand-btn')

  if (expandButton && expandSection) {
    expandSection.style.display = 'none'

    expandButton.addEventListener('click', (event) => {
      event.stopPropagation()
      const willShow = expandSection.classList.contains('hidden')
      setCardExpanded(card, willShow)
      onExpandChange(willShow)
    })
  }

  card.addEventListener("click", (e) => {
    if (e.target.closest('.location-card-expand-btn') || e.target.closest('.directions-btn')) return
    onCardClick(place)
  })

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
  const label = formatDistanceLabel(meters, { suffix: " km" })
  return label
}

function truncateTitle(name, maxLength = 25) {
  if (!name || name.length <= maxLength) return name || ''
  return `${name.slice(0, maxLength)}...`
}

function buildMetaLine(distanceText, todayHours, isNearest) {
  const parts = []

  if (distanceText) {
    parts.push(`<span class="meta-label">Distance</span> <span class="meta-value">${distanceText}</span>`)
  }

  if (isNearest) {
    parts.push(`<span class="meta-pill">Nearest</span>`)
  }

  if (todayHours) {
    parts.push(`<span class="meta-label">Today</span> <span class="meta-value">${todayHours}</span>`)
  }

  return parts.join('<span class="meta-separator">·</span>')
}

function buildTelHref(phone) {
  if (!phone) return '#'
  const digitsOnly = phone.toString().replace(/[^\d+]/g, '')
  return `tel:${digitsOnly}`
}

function formatPhoneNumber(phone) {
  if (!phone) return null
  return phone.toString()
}

/**
 * Updates card's active state.
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
 * Programmatically expands/collapses a card.
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
