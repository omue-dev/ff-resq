// app/javascript/controllers/nearby_vets_controller.js
import { Controller } from "@hotwired/stimulus"
import {
  waitForGoogleMaps,
  getUserLocation,
  createMap,
  createUserMarker,
  createVetMarker,
  searchNearbyVets
} from "utils/google_maps_utils"

// Connects to data-controller="nearby-vets"
export default class extends Controller {
  static targets = ["map", "listModal", "detailModal", "vetList"]
  static values = {
    intakeId: Number,
    userMarkerIcon: String
  }

  async connect() {
    console.log("[nearby-vets] connected")
    console.log("[nearby-vets] intakeId:", this.intakeIdValue)

    // Wait for Google Maps API to load
    await waitForGoogleMaps()
    this.initMap()
  }

  get hasIntake() {
    return this.hasIntakeIdValue && this.intakeIdValue > 0
  }

  async initMap() {
    console.log("[nearby-vets] initMap called")

    try {
      // Get user's current location
      const userLocation = await getUserLocation()

      // Create the map with default styling
      this.map = createMap(this.mapTarget, userLocation)

      // Add user location marker
      createUserMarker(this.map, userLocation, this.userMarkerIconValue)

      // Search for nearby vets
      const places = await searchNearbyVets(userLocation)

      // Store places for later use
      this.places = places

      // Create bounds to fit all markers
      const bounds = new google.maps.LatLngBounds()
      bounds.extend(userLocation)

      // Add vet markers with click handlers
      places.forEach((place) => {
        const marker = createVetMarker(this.map, place)

        // Extend bounds to include this marker
        if (place.location) {
          bounds.extend(place.location)
        }

        // Add click listener to show modal
        if (marker) {
          marker.addListener("click", () => {
            this.showVetDetails(place)
          })
        }
      })

      // Fit map to show all markers
      this.map.fitBounds(bounds)

    } catch (error) {
      this.handleError(error)
    }
  }

  showAllVets() {
    // Clear previous list
    this.vetListTarget.innerHTML = ""

    // Render all vet cards
    this.places.forEach((place) => {
      const card = this.createVetCard(place)
      this.vetListTarget.appendChild(card)
    })

    // Show list modal
    this.listModalTarget.classList.remove('hidden')
    this.listModalTarget.style.display = "flex"
  }

  createVetCard(place) {
    const ratingText = place.rating ? `⭐ ${place.rating}/5` : "No rating"
    const address = place.formattedAddress || "Address not available"
    const openingHours = this.getOpeningStatus(place)
    const googleMapsUrl = this.generateDirectionsUrl(place)

    const card = document.createElement("div")
    card.className = "vet-card"

    const appointmentSection = this.hasIntake
      ? `<button data-action="click->appointment#makeAppointment" data-appointment-target="button" class="appointment-btn" onclick="event.stopPropagation()">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M16 2v4M8 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
           </svg>
           <span>Make Appointment</span>
         </button>
         <div class="appointment-status" data-appointment-target="status"></div>
         <div class="appointment-response hidden" data-appointment-target="notes"></div>`
      : ''

    card.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">${place.displayName}</h5>
        <p class="card-text">${address}</p>
        <p class="card-text"><strong>Rating:</strong> ${ratingText}</p>
        ${openingHours ? `<p class="card-text opening-hours">${openingHours}</p>` : ''}
        <div class="card-actions">
          <a href="${googleMapsUrl}" target="_blank" class="directions-btn" onclick="event.stopPropagation()">
            <span>Get Directions</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
          ${appointmentSection}
        </div>
      </div>
    `

    // Click handler to show detail modal (not on buttons)
    card.addEventListener("click", (e) => {
      if (!e.target.closest('.directions-btn') && !e.target.closest('.appointment-btn')) {
        this.closeListModal()
        this.showVetDetails(place)
      }
    })

    return card
  }

  getOpeningStatus(place) {
    if (place.regularOpeningHours?.weekdayDescriptions) {
      const today = new Date().getDay()
      const dayIndex = today === 0 ? 6 : today - 1 // Convert Sunday=0 to Monday=0
      const todayHours = place.regularOpeningHours.weekdayDescriptions[dayIndex]

      if (todayHours) {
        // Extract just the hours part (remove day name)
        const hours = todayHours.split(': ')[1]
        return `<strong>Today:</strong> ${hours}`
      }
    }
    return null
  }

  generateDirectionsUrl(place) {
    if (place.location) {
      const lat = typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat
      const lng = typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    }
    return '#'
  }

  showVetDetails(place) {
    const ratingText = place.rating ? `⭐ ${place.rating}/5` : "No rating"
    const address = place.formattedAddress || "Address not available"
    const openingHours = this.getOpeningStatus(place)
    const googleMapsUrl = this.generateDirectionsUrl(place)

    const appointmentSection = this.hasIntake
      ? `<button data-action="click->appointment#makeAppointment" data-appointment-target="button" class="appointment-btn">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M16 2v4M8 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
           </svg>
           <span>Make Appointment</span>
         </button>
         <div class="appointment-status" data-appointment-target="status"></div>
         <div class="appointment-response hidden" data-appointment-target="notes"></div>`
      : ''

    // Replace the entire modal content with a vet card
    const modalContent = this.detailModalTarget.querySelector('.vet-modal-content')
    modalContent.innerHTML = `
      <button data-action="click->nearby-vets#closeDetailModal" class="vet-modal-close">×</button>
      <div class="vet-card vet-card-detail">
        <div class="card-body">
          <h5 class="card-title">${place.displayName}</h5>
          <p class="card-text">${address}</p>
          <p class="card-text"><strong>Rating:</strong> ${ratingText}</p>
          ${openingHours ? `<p class="card-text opening-hours">${openingHours}</p>` : ''}
          <div class="card-actions">
            <a href="${googleMapsUrl}" target="_blank" class="directions-btn">
              <span>Get Directions</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            ${appointmentSection}
          </div>
        </div>
      </div>
    `

    // Show detail modal
    this.detailModalTarget.classList.remove('hidden')
    this.detailModalTarget.style.display = "flex"
  }

  closeListModal() {
    this.listModalTarget.classList.add('hidden')
    this.listModalTarget.style.display = "none"
  }

  closeDetailModal() {
    this.detailModalTarget.classList.add('hidden')
    this.detailModalTarget.style.display = "none"
  }

  handleError(error) {
    console.error("[nearby-vets] Error:", error)
  }
}
