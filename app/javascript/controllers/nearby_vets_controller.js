// app/javascript/controllers/nearby_vets_controller.js

import { Controller } from "@hotwired/stimulus"
import {
  waitForGoogleMaps,
  getUserLocation,
  createMap,
  createUserMarker,
  createVetMarker,
  searchAllAnimalServices
} from "utils/google_maps_utils"
import { distanceInMeters } from "utils/distance_utils"
import {
  createHorizontalLocationCard,
  setCardActive,
  setCardExpanded
} from "utils/location_card_horizontal"
import { getVetMarkerIcon, getActiveVetMarkerIcon } from "config/google_maps_config"

/**
 * NearbyVetsController
 * --------------------
 * Orchestrates the Google Maps vets experience:
 * - acquires user location and renders the map
 * - fetches vets/shelters/rescue places and shows markers + cards
 * - syncs horizontal card selection with active markers and map bounds
 * - manages category filtering and basic UX (hover, scroll sync)
 */
export default class extends Controller {
  /**
   * Stimulus target elements
   * @type {string[]}
   */
  static targets = [
    "map",
    "horizontalList",
  ]

  /**
   * Stimulus values
   * @type {Object}
   * @property {number} intakeId - Active intake ID (enables appointment features)
   * @property {string} userMarkerIcon - Custom icon URL for user location marker
   */
  static values = {
    intakeId: Number,
    userMarkerIcon: String
  }

  /**
   * Initialize state
   */
  initialize() {
    this.allPlaces = []
    this.markers = new Map() // Map of place.id -> marker instances
    this.activeCategory = 'all'
    this.activeCard = null
    this.activePlaceId = null
    this.handleHorizontalScroll = null
    this.scrollRaf = null
    this.userLocation = null
    this.infoWindow = null
  }

  /**
   * Lifecycle callback when controller connects to DOM
   * Initializes Google Maps and starts the map setup
   * @async
   * @returns {Promise<void>}
   */
  async connect() {
    console.log("[nearby-vets] connected")
    console.log("[nearby-vets] intakeId:", this.intakeIdValue)

    // Wait for Google Maps API to load
    await waitForGoogleMaps()
    this.initMap()
  }

  /**
   * Checks if user has an active intake
   * Used to determine if appointment features should be enabled
   * @returns {boolean} True if user has a valid intake ID
   */
  get hasIntake() {
    return this.hasIntakeIdValue && this.intakeIdValue > 0
  }

  /**
   * Initializes the Google Map with user location and nearby animal services
   *
   * @async
   * @returns {Promise<void>}
   * @throws {Error} If geolocation fails or API request fails
   */
  async initMap() {
    console.log("[nearby-vets] initMap called")

    try {
      // Get user's current location (with fallback prompt)
      const userLocation = await this.getLocationWithFallback()
      this.userLocation = userLocation

      // Create the map with default styling
      this.map = createMap(this.mapTarget, userLocation)

      // Add user location marker
      createUserMarker(this.map, userLocation, this.userMarkerIconValue)

      // Search for all animal services
      const results = await searchAllAnimalServices(userLocation)

      // Combine all places into a single array and attach distance
      this.allPlaces = [
        ...results.vets,
        ...results.shelters,
        ...results.rescue
      ].map(place => this.addDistance(place))

      // Sort by distance ascending
      this.allPlaces.sort((a, b) => (a.distanceMeters || Infinity) - (b.distanceMeters || Infinity))

      // Store places for later use (legacy compatibility)
      this.places = this.allPlaces

      // Create bounds to fit all markers
      const bounds = new google.maps.LatLngBounds()
      bounds.extend(userLocation)

      // Add markers for all places
      this.allPlaces.forEach((place) => {
        const marker = createVetMarker(this.map, {
          ...place,
          markerTitle: this.markerTitleFor(place)
        })

        // Store marker reference
        if (marker && place.id) {
          this.markers.set(place.id, marker)
        }

        // Extend bounds to include this marker
        if (place.location) {
          bounds.extend(place.location)
        }

        // Add click listener to show modal
        if (marker) {
          marker.addListener("click", () => {
            this.collapseAllCards()
            this.highlightCard(place)
            this.expandCard(place, true)
            this.updateActiveMarker(place.id)
          })
        }
      })

      // Fit map to show all markers
      this.map.fitBounds(bounds)
      // Prevent over-zooming; keep an overview similar to screenshot 2
      if (this.map.getZoom() > 12) {
        this.map.setZoom(12)
      }

      // Render horizontal location cards
      this.renderHorizontalList(this.allPlaces)

    } catch (error) {
      this.handleError(error)
    }
  }

  /**
   * Collapse all horizontal cards
   * @returns {void}
   */
  collapseAllCards() {
    const cards = this.horizontalListTarget?.querySelectorAll('.location-card-horizontal') || []
    cards.forEach(card => setCardExpanded(card, false))
  }

  /**
   * Renders the horizontal scrolling list of location cards
   * @param {Array} places - Array of place objects to render
   * @returns {void}
   */
  renderHorizontalList(places) {
    this.horizontalListTarget.innerHTML = ""
    this.activeCard = null
    this.updateActiveMarker(null)

    places.forEach((place, index) => {
      const card = createHorizontalLocationCard(
        place,
        (clickedPlace) => {
          this.highlightCard(clickedPlace)
          this.expandCard(clickedPlace, true)
          this.updateActiveMarker(clickedPlace.id)
        },
        (hoveredPlace, isHovering) => {
          this.highlightMarker(hoveredPlace, isHovering)
        },
        this.hasIntake,
        (isExpanded) => {
          this.setHorizontalScrollLock(isExpanded)
        },
        this.userLocation,
        index === 0
      )

      this.horizontalListTarget.appendChild(card)
    })

    this.setupHorizontalScrollListener()
    this.syncActiveCardWithScroll()
  }

  /**
   * Expands/collapses a horizontal card by place id
   * @param {Object} place - Place whose card to expand/collapse
   * @param {boolean} expanded - Whether to expand (true) or collapse (false)
   * @returns {void}
   */
  expandCard(place, expanded = true) {
    const card = this.horizontalListTarget.querySelector(`[data-place-id="${place.id}"]`)
    if (!card) return
    setCardExpanded(card, expanded)
    this.setHorizontalScrollLock(expanded)
    if (expanded) {
      this.centerActivePlace(place)
    }
  }

  /**
   * Locks/unlocks horizontal scroll when a card is expanded
   * @param {boolean} locked - true to lock scroll (expanded), false to unlock
   * @returns {void}
   */
  setHorizontalScrollLock(locked) {
    if (!this.horizontalListTarget) return
    this.horizontalListTarget.classList.toggle('expanded', locked)
  }

  /**
   * Sets up scroll listener to sync active marker when cards snap into view
   * @returns {void}
   */
  setupHorizontalScrollListener() {
    if (!this.horizontalListTarget) return
    if (!this.handleHorizontalScroll) {
      this.handleHorizontalScroll = () => {
        if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf)
        this.scrollRaf = requestAnimationFrame(() => this.syncActiveCardWithScroll())
      }
    }
    this.horizontalListTarget.removeEventListener('scroll', this.handleHorizontalScroll)
    this.horizontalListTarget.addEventListener('scroll', this.handleHorizontalScroll)
  }

  /**
   * Picks the card nearest the container center and marks it active
   * @returns {void}
   */
  syncActiveCardWithScroll() {
    if (!this.horizontalListTarget) return
    const cards = Array.from(this.horizontalListTarget.querySelectorAll('.location-card-horizontal'))
    if (cards.length === 0) return

    const containerRect = this.horizontalListTarget.getBoundingClientRect()
    const containerCenter = containerRect.left + containerRect.width / 2

    let nearestCard = null
    let minDistance = Infinity

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect()
      const cardCenter = rect.left + rect.width / 2
      const distance = Math.abs(cardCenter - containerCenter)
      if (distance < minDistance) {
        minDistance = distance
        nearestCard = card
      }
    })

    if (nearestCard && nearestCard !== this.activeCard) {
      this.setActiveCardFromElement(nearestCard)
    }
  }

  /**
   * Activates a card and its marker based on a DOM element (no scroll)
   * @param {HTMLElement} card - The card element to activate
    * @returns {void}
   */
  setActiveCardFromElement(card) {
    if (!card) return
    const placeId = card.dataset.placeId
    const place = this.allPlaces.find((p) => String(p.id) === String(placeId))
    if (!place) return

    if (this.activeCard && this.activeCard !== card) {
      setCardActive(this.activeCard, false)
    }

    setCardActive(card, true)
    this.activeCard = card
    this.updateActiveMarker(place.id)
    this.centerActivePlace(place)
  }

  /**
   * Updates marker icons to reflect active card selection
   * @param {string|null} placeId - ID of the place to mark as active (or null to clear)
    * @returns {void}
   */
  updateActiveMarker(placeId) {
    if (this.activePlaceId === placeId) return

    // Reset previous active marker
    if (this.activePlaceId) {
      const prevMarker = this.markers.get(this.activePlaceId)
      if (prevMarker) {
        prevMarker.setIcon(getVetMarkerIcon())
      }
    }

    // Set new active marker
    const newMarker = placeId ? this.markers.get(placeId) : null
    const place = placeId ? this.allPlaces.find(p => String(p.id) === String(placeId)) : null
    if (newMarker) {
      newMarker.setIcon(getActiveVetMarkerIcon())
      const title = place?.distanceText ? `${place.displayName} • ${place.distanceText}` : place?.displayName
      if (title) {
        newMarker.setTitle(title)
      }
      if (!this.infoWindow && window.google && google.maps && google.maps.InfoWindow) {
        this.infoWindow = new google.maps.InfoWindow()
      }
      if (this.infoWindow) {
        this.infoWindow.setContent(`
          <div class="map-infowindow">
            <div class="map-infowindow-title">${place?.displayName || ''}</div>
            ${place?.distanceText ? `<div class="map-infowindow-distance">${place.distanceText}</div>` : ''}
          </div>
        `)
        this.infoWindow.open({
          anchor: newMarker,
          map: this.map,
          shouldFocus: false
        })
      }
    } else if (this.infoWindow) {
      this.infoWindow.close()
    }

    this.activePlaceId = placeId || null
  }

  /**
   * Highlights a card in the horizontal list
   * @param {Object} place - Place to highlight
    * @returns {void}
   */
  highlightCard(place) {
    // Remove previous active card
    if (this.activeCard) {
      setCardActive(this.activeCard, false)
    }

    // Find and activate new card
    const card = this.horizontalListTarget.querySelector(`[data-place-id="${place.id}"]`)
    if (card) {
      setCardActive(card, true)
      this.activeCard = card
      this.updateActiveMarker(place.id)
      this.centerActivePlace(place)

      // Scroll card into view
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }

  /**
   * Highlights a marker on the map
   * @param {Object} place - Place whose marker to highlight
   * @param {boolean} highlight - Whether to highlight or unhighlight
    * @returns {void}
   */
  highlightMarker(place, highlight) {
    const marker = this.markers.get(place.id)
    if (!marker) return

    if (highlight) {
      // Make marker bounce or change appearance
      marker.setAnimation(google.maps.Animation.BOUNCE)
      setTimeout(() => marker.setAnimation(null), 750)
    }
  }

  /**
   * Updates marker visibility based on active category
   * @param {string} category - Active category filter
    * @returns {void}
   */
  updateMarkersVisibility(category) {
    this.allPlaces.forEach((place) => {
      const marker = this.markers.get(place.id)
      if (!marker) return

      if (category === 'all' || place.category === category) {
        marker.setVisible(true)
      } else {
        marker.setVisible(false)
      }
    })
  }

  /**
   * Filters locations by category and updates markers/list
    * @param {Event} event - click event from category chip
    * @returns {void}
   */
  filterByCategory(event) {
    const category = event.currentTarget.dataset.category
    this.activeCategory = category

    this.toggleFilterChips(category)
    const filteredPlaces = this.filteredPlacesForCategory(category)

    this.renderHorizontalList(filteredPlaces)
    this.updateMarkersVisibility(category)
  }

  /**
   * Keeps both the user (fox) and selected place in view with padding
   * @param {Object} place - selected place
   */
  centerActivePlace(place) {
    if (!this.map || !place?.location || !this.userLocation) return

    const bounds = new google.maps.LatLngBounds()
    bounds.extend(this.userLocation)
    bounds.extend(place.location)

    this.map.fitBounds(bounds, { padding: 80 })
    // Cap max zoom so we don't go too far in
    const currentZoom = this.map.getZoom()
    if (currentZoom > 13) {
      this.map.setZoom(13)
    }
  }

  /**
   * Error handler for map initialization and API failures
   * Logs errors to console for debugging
   *
   * @param {Error} error - The error object
   * @returns {void}
   */
  handleError(error) {
    console.error("[nearby-vets] Error:", error)
  }

  /**
   * Attempt to get location; if denied, prompt for manual lat,lng
   * @returns {Promise<{lat:number, lng:number}>} resolved location
   * @throws {Error} when location cannot be determined
   */
  async getLocationWithFallback() {
    try {
      return await getUserLocation()
    } catch (error) {
      console.warn("Geolocation failed, prompting for manual location:", error)
      const manual = window.prompt("Standort nicht verfügbar. Bitte Lat,Lng eingeben (z.B. 51.2,6.4):")
      if (!manual) throw error
      const parts = manual.split(",").map(p => parseFloat(p.trim()))
      if (parts.length === 2 && parts.every(n => !isNaN(n))) {
        return { lat: parts[0], lng: parts[1] }
      }
      alert("Ungültiges Format. Bitte zwei Zahlen durch Komma trennen.")
      throw error
    }
  }

  /**
   * Adds distance fields to place
   * @param {Object} place - place object with location data
   * @returns {Object} place with distanceMeters and distanceText when possible
   */
  addDistance(place) {
    if (!this.userLocation || !place?.location) return place
    const meters = distanceInMeters(this.userLocation, place.location)
    const km = meters / 1000
    const rounded = km >= 10 ? km.toFixed(0) : km.toFixed(1)
    return {
      ...place,
      distanceMeters: meters,
      distanceText: `Distance: ${rounded} km`
    }
  }

  /**
   * Build a consistent marker title for the given place.
   * @param {Object} place
   * @returns {string}
   */
  markerTitleFor(place) {
    if (!place) return ''
    if (place.distanceText) return `${place.displayName} • ${place.distanceText}`
    return place.displayName || ''
  }

  /**
   * Compute and return filtered places for the active category.
   * @param {string} category
   * @returns {Array}
   */
  filteredPlacesForCategory(category) {
    if (category === 'all') return this.allPlaces
    return this.allPlaces.filter(place => place.category === category)
  }

  /**
   * Toggle filter chip active state based on selected category.
   * @param {string} category
   * @returns {void}
   */
  toggleFilterChips(category) {
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.category === category)
    })
  }

}
