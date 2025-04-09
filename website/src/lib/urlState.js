import { geohashToLatLon, latLonToGeohash } from './geodata';

/**
 * Updates the URL with current application state without reloading the page
 * 
 * @param {Object} targetLocation - The map location {lat, lon, zoom}
 * @param {Object|null} selectedMarkerId - Currently selected marker, if any
 * @param {boolean} [addToHistory=false] - Whether to add this state to browser history
 */
export function updateURLParams(targetLocation, selectedMarkerId, addToHistory = false) {
  const params = new URLSearchParams();
  
  // Add map position parameters if they exist
  if (targetLocation) {
    const geohash = latLonToGeohash(targetLocation.lat, targetLocation.lon, 8);
    params.set('location', `${geohash}-${targetLocation.zoom}`);
  }
  if (selectedMarkerId) {
    params.set('selected', selectedMarkerId);
  }
  
  // Update URL without reloading the page
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  
  if (addToHistory) {
    window.history.pushState({}, '', newUrl);
  } else {
    window.history.replaceState({}, '', newUrl);
  }
}

/**
 * Reads application state from URL parameters
 * 
 * @returns {Object} - Object containing parsed parameters and selected marker
 */
export function readURLParams() {
  const params = new URLSearchParams(window.location.search);
  
  // Get map position parameters
  const result = {}
  const location = params.get('location');
  if (location) {
    const [geohash, zoom] = location.split('-');
    const { lat, lon } = geohashToLatLon(geohash);
    result.targetLocation = {lat, lon, zoom}
  }
  result.selectedMarkerId = params.get('selected');
  return result;
}

/**
 * Handles browser back/forward navigation by reading URL state
 * Use this to handle popstate events
 * 
 * @param {Function} callback - Function to call with new state
 * @returns {Function} - Event handler function for popstate event
 */
export function createHistoryStateHandler(callback) {
  return function(ev) {
    const state = ev.state || {};
    callback(state);
  };
}

/**
 * Clears all URL parameters
 */
export function clearURLParams() {
  window.history.replaceState({}, '', window.location.pathname);
}