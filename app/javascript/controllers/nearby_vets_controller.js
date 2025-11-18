// app/javascript/controllers/nearby_vets_controller.js
import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="nearby-vets"
export default class extends Controller {
  static targets = ["map"]

  connect() {
    console.log("[nearby-vets] connected")

    // Bind this controller instance so Google can call it via the global callback
    window.initMap = this.initMap.bind(this)

    // If Google is already loaded (Turbo back nav, etc.)
    if (window.google && window.google.maps) {
      this.initMap()
    }
  }

  initMap() {
    console.log("[nearby-vets] initMap called")

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser!")
      return
    }

    navigator.geolocation.getCurrentPosition(
      this.successCallback.bind(this),
      this.errorCallback.bind(this)
    )
  }

  successCallback(position) {
    console.log("[nearby-vets] successCallback", position)

    const userLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    }

    // Create the map centered on the user
    this.map = new google.maps.Map(this.mapTarget, {
      center: userLocation,
      zoom: 14
    })

    // User marker
    new google.maps.Marker({
      map: this.map,
      position: userLocation,
      title: "You are here"
    })

    // ---- NEW: use classic PlacesService.nearbySearch ----
    this.placesService = new google.maps.places.PlacesService(this.map)

    const request = {
      location: userLocation,
      radius: 5000,                // 5 km
      type: "veterinary_care"
    }

    console.log("[nearby-vets] sending nearbySearch request", request)

    this.placesService.nearbySearch(request, (results, status) => {
      console.log("[nearby-vets] nearbySearch status:", status)
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
        alert("No nearby vets found or Places API error: " + status)
        return
      }

      results.forEach(place => this.createVetMarker(place))
    })
  }

  errorCallback(error) {
    console.error("[nearby-vets] geolocation error", error)
    alert("We couldn't get your location. Please enable location access and reload the page.")
  }

  createVetMarker(place) {
    const marker = new google.maps.Marker({
      map: this.map,
      position: place.geometry.location,
      title: place.name
    })

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <strong>${place.name}</strong><br>
        ${place.vicinity || place.formatted_address || "Address not available"}<br>
        ${place.rating ? "⭐ " + place.rating + "/5" : ""}
      `
    })

    marker.addListener("click", () => {
      infoWindow.open(this.map, marker)
    })
  }
}
