// app/javascript/controllers/nearby_vets_controller.js
import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="nearby-vets"
export default class extends Controller {
  static targets = ["map", "list"]

  connect() {
    console.log("[nearby-vets] connected")

    // If Google Maps is already loaded (Turbo back etc.)
    if (window.google && window.google.maps) {
      this.initMap()
      return
    }

    // Otherwise wait for the script to load
    const script = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    )

    if (script) {
      script.addEventListener(
        "load",
        () => {
          this.initMap()
        },
        { once: true }
      )
    }
  }

  initMap() {
    console.log("[nearby-vets] initMap called")

    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      this.successCallback.bind(this),
      this.errorCallback.bind(this)
    )
  }

  async successCallback(position) {
    const userLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    }

    // Create the map
    this.map = new google.maps.Map(this.mapTarget, {
      center: userLocation,
      zoom: 14,
    })

    // ✅ User marker (classic Marker, no Map ID required)
    new google.maps.Marker({
      map: this.map,
      position: userLocation,
      title: "You are here",
    })

    // Nearby Search (NEW Places API)
    const request = {
      fields: [
        "displayName",
        "location",
        "formattedAddress",
        "rating",
        "id",
        "types",
      ],
      locationRestriction: {
        center: userLocation, // { lat, lng }
        radius: 5000,         // 5km
      },
      includedTypes: ["veterinary_care"],
      maxResultCount: 5,
      rankPreference: google.maps.places.SearchNearbyRankPreference.DISTANCE,
    }

    try {
      const { places } = await google.maps.places.Place.searchNearby(request)
      console.log("[nearby-vets] New Places results:", places)

      this.listTarget.innerHTML = ""

      ;(places || []).forEach((place) => {
        this.createVetMarker(place)
        this.renderVetCard(place)
      })
    } catch (error) {
      console.error("Places API error:", error)
    }
  }

  // ✅ Vet markers using classic Marker
  createVetMarker(place) {
    if (!place.location) return

    new google.maps.Marker({
      map: this.map,
      position: place.location, // Place API returns a LatLng object – this is fine
      title: place.displayName,
    })
  }

  renderVetCard(place) {
    const el = document.createElement("div")
    el.className = "col-12 col-md-6"

    const ratingText = place.rating ? `⭐ ${place.rating}/5` : "No rating"
    const address = place.formattedAddress || "Address not available"

    el.innerHTML = `
      <div class="card h-100">
        <div class="card-body">
          <h5 class="card-title mb-1">${place.displayName}</h5>
          <p class="card-text mb-1">${address}</p>
          <p class="card-text"><strong>Rating:</strong> ${ratingText}</p>
        </div>
      </div>
    `

    this.listTarget.appendChild(el)
  }

  errorCallback(err) {
    console.error("Geolocation error:", err)
  }
}
