/**
 * Shared distance utilities for mapping features.
 */

/**
 * Compute haversine distance between two points.
 *
 * @param {{lat:number|Function, lng:number|Function}} origin
 * @param {{lat:number|Function, lng:number|Function}} destination
 * @returns {number} distance in meters (Infinity if inputs invalid)
 */
export function distanceInMeters(origin, destination) {
  if (!origin || !destination) return Infinity

  const toRad = (deg) => (deg * Math.PI) / 180 // turn degrees into radians so math works

  // Read latitude/longitude; handle both plain numbers and google.maps.LatLng objects
  const originLat = typeof origin.lat === 'function' ? origin.lat() : origin.lat
  const originLng = typeof origin.lng === 'function' ? origin.lng() : origin.lng
  const destLat = typeof destination.lat === 'function' ? destination.lat() : destination.lat
  const destLng = typeof destination.lng === 'function' ? destination.lng() : destination.lng

  // If any coordinate is missing, return Infinity so callers can ignore bad data
  if ([originLat, originLng, destLat, destLng].some((v) => typeof v !== 'number')) return Infinity

  // Apply the haversine distance formula (great-circle distance on a sphere)
  const R = 6371000 // approximate Earth radius in meters
  const dLat = toRad(destLat - originLat) // change in latitude
  const dLng = toRad(destLng - originLng) // change in longitude

  // Portion of the formula that accounts for Earth’s curvature
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(toRad(originLat)) * Math.cos(toRad(destLat)) * Math.sin(dLng / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) // central angle between points

  return R * c // final distance in meters
}

/**
 * Format a distance label in km (1 decimal under 10km, whole km otherwise).
 *
 * @param {number} meters
 * @param {Object} [options]
 * @param {string} [options.suffix=" km"] - suffix to append
 * @returns {string|null}
 */
export function formatDistanceLabel(meters, options = {}) {
  if (!isFinite(meters)) return null
  const km = meters / 1000
  const rounded = km >= 10 ? km.toFixed(0) : km.toFixed(1)
  const suffix = options.suffix ?? " km"
  return `${rounded}${suffix}`
}
