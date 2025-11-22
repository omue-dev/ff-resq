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
  static targets = ["map", "list"]

  async connect() {
    console.log("[nearby-vets] connected")

    // Wait for Google Maps API to load
    await waitForGoogleMaps()
    this.initMap()
  }

  async initMap() {
    console.log("[nearby-vets] initMap called")

    try {
      // Get user's current location
      const userLocation = await getUserLocation()

      // Create the map with default styling
      this.map = createMap(this.mapTarget, userLocation)

      // Add user location marker
      createUserMarker(this.map, userLocation)

      // Search for nearby vets
      const places = await searchNearbyVets(userLocation)

      // Clear the list and populate with results
      this.listTarget.innerHTML = ""

      places.forEach((place) => {
        createVetMarker(this.map, place)
        this.renderVetCard(place)
      })
    } catch (error) {
      this.handleError(error)
    }
  }

  renderVetCard(place) {
    const ratingText = place.rating ? `${place.rating}/5` : "No rating"
    const address = place.formattedAddress || "Address not available"

    const card = document.createElement("div")
    card.className = "vet-card"

    card.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">${place.displayName}</h5>
        <p class="card-text">${address}</p>
        <p class="card-text"><strong>Rating:</strong> ⭐ ${ratingText}</p>
      </div>
    `

    this.listTarget.appendChild(card)
  }

  handleError(error) {
    console.error("[nearby-vets] Error:", error)
  }
}
