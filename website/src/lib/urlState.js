import { geohashToLatLon, latLonToGeohash } from './geo/geohash';

/**
 * Updates the URL with current application state without reloading the page
 * 
 * @param {Object} params - The parameters object
 * @param {Object} params.location - The map location {lat, lon}
 * @param {number} params.zoom - The map zoom level
 * @param {Object|null} params.selectedMarkerId - Currently selected marker, if any
 * @param {string} params.mode - The mode of the application
 * @param {Object|null} params.date - The date of the application
 * @param {boolean} params.strictDate - Whether to use strict date filtering
 * @param {boolean} [addToHistory=false] - Whether to add this state to browser history
 */
export function updateURLParams(state, addToHistory = true) {
  const {location, zoom, selectedMarkerId, mode, date, strictDate} = state;
  console.log("updateURLParams, addToHistory:", addToHistory);
  const params = new URLSearchParams();
  
  // Add map position parameters if they exist
  if (location) {
    const geohash = latLonToGeohash(location.lat, location.lon, 8);
    params.set('location', `${geohash}-${zoom}`);
  }
  if (selectedMarkerId) {
    params.set('selected', selectedMarkerId);
  }
  if (mode === 'events') {
    if (date) {
      params.set('date', dateToString(date));
    }
    if (strictDate) {
      params.set('strictDate', strictDate ? 'true' : 'false');
    }
  }
  
  // Update URL without reloading the page
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  
  if (addToHistory) {
    console.log("adding to history", newUrl);
    window.history.pushState(state, '', newUrl);
  } else {
    console.log("replacing current history entry", newUrl);
    window.history.replaceState(state, '', newUrl);
  }
}

/**
 * Reads application state from URL parameters
 * 
 * @returns {Object} - Object containing parsed parameters and selected marker
 */
export function readURLParams() {
  const params = new URLSearchParams(window.location.search);
  console.log("window.location.search", window.location.search);
  
  // Get map position parameters
  const result = {}
  const location = params.get('location')
  if (location) {
    const [geohash, zoom] = location.split('-');
    result.location = geohashToLatLon(geohash);
    result.zoom = parseInt(zoom)
  }
  result.selectedMarkerId = params.get('selected');
  const date = params.get('date');
  if (date) {
    result.mode = 'events';
    result.date = parseDate(date);
    result.strictDate = params.get('strictDate') === 'true';
  } else {
    result.mode = 'places';
    result
  }
  return result;
}

export function parseDate(dateString) {
  if (!dateString) {
    return null    
  }
  const components = dateString.split('--')
  if (components.length === 1) {
    const year = parseInt(components[0])
    return {
      year: year,
      month: year < 1500 ? 'all' : 1,
      day: year < 1920 ? 'all' : 1
    }
  } else if (components.length === 2) {
    const [year, month] = components;
    return {
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(year) < 1920 ? 'all' : 1
    }
  } else if (components.length === 3) {
    const [year, month, day] = components;
    return {
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day)
    }
  }
}

export function dateToString(date) {
  if (!date) {
    return null
  }
  if (date.month === 'all') {
    return `${date.year}`
  } else if (date.day === 'all') {
    return `${date.year}--${date.month}`
  } else {
    return `${date.year}--${date.month}--${date.day}`
  }
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