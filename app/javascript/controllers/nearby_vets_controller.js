// app/javascript/controllers/nearby_vets_controller.js
import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="nearby-vets"
export default class extends Controller {
  static targets = ["map"]

  connect() {
    console.log("[nearby-vets] connected")

    // Wait for Google Maps to load
    this.waitForGoogleMaps()
  }

  waitForGoogleMaps() {
    if (window.google && window.google.maps) {
      this.initMap()
    } else {
      // Poll every 100ms until Google Maps is loaded
      setTimeout(() => this.waitForGoogleMaps(), 100)
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

  async successCallback(position) {
    console.log("[nearby-vets] successCallback", position)

    const userLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    }

    console.log("[nearby-vets] User location:", userLocation)
    console.log("[nearby-vets] Accuracy:", position.coords.accuracy, "meters")

    // Create the map centered on the user
    this.map = new google.maps.Map(this.mapTarget, {
      center: userLocation,
      zoom: 14,
      mapId: "NEARBY_VETS_MAP"  // Required for AdvancedMarkerElement
    })

    // User marker
    new google.maps.marker.AdvancedMarkerElement({
      map: this.map,
      position: userLocation,
      title: "You are here"
    })

    // Use the new Place API with searchNearby
    const { Place } = await google.maps.importLibrary("places")

    const request = {
      locationRestriction: {
        center: userLocation,
        radius: 5000  // 5 km
      },
      includedTypes: ["veterinary_care"],
      maxResultCount: 20,
      fields: ["displayName", "location", "formattedAddress", "rating"]
    }

    console.log("[nearby-vets] sending searchNearby request", request)

    const { places } = await Place.searchNearby(request)

    console.log("[nearby-vets] searchNearby results:", places)

    if (!places || places.length === 0) {
      alert("No nearby vets found")
      return
    }

    places.forEach(place => this.createVetMarker(place))
  }

  errorCallback(error) {
    console.error("[nearby-vets] geolocation error", error)
    alert("We couldn't get your location. Please enable location access and reload the page.")
  }

  createVetMarker(place) {
    const marker = new google.maps.marker.AdvancedMarkerElement({
      map: this.map,
      position: place.location,
      title: place.displayName
    })

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <strong>${place.displayName}</strong><br>
        ${place.formattedAddress || "Address not available"}<br>
        ${place.rating ? "⭐ " + place.rating + "/5" : ""}
      `
    })

    marker.addListener("click", () => {
      infoWindow.open(this.map, marker)
    })
  }
}
