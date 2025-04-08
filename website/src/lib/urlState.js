/**
 * Updates the URL with current application state without reloading the page
 * 
 * @param {Object} targetLocation - The map location {lat, lon, zoom}
 * @param {Object|null} selectedMarker - Currently selected marker, if any
 * @param {boolean} [addToHistory=false] - Whether to add this state to browser history
 */
export function updateURLParams(targetLocation, selectedMarker, addToHistory = false) {
  const params = new URLSearchParams();
  
  // Add map position parameters if they exist
  if (targetLocation) {
    if (targetLocation.lat) params.set('lat', targetLocation.lat.toFixed(6));
    if (targetLocation.lon) params.set('lon', targetLocation.lon.toFixed(6));
    if (targetLocation.zoom) params.set('zoom', Math.round(targetLocation.zoom).toString());
  }
  
  // Add selected marker as base64-encoded JSON if present
  // Only store essential marker data to keep URL smaller
  if (selectedMarker) {
    try {
      // Only keep essential marker fields to reduce URL size
      const essentialMarkerData = {
        id: selectedMarker.id,
        page_title: selectedMarker.page_title,
        page_len: selectedMarker.page_len,
        geohash: selectedMarker.geohash,
        lat: selectedMarker.lat.toFixed(6),
        lon: selectedMarker.lon.toFixed(6),
        zoom: selectedMarker.zoom
      };
      
      const markerJson = JSON.stringify(essentialMarkerData);
      // Use encodeURIComponent before btoa to handle Unicode characters
      const markerBase64 = btoa(encodeURIComponent(markerJson));
      params.set('marker', markerBase64);
    } catch (e) {
      console.error('Error encoding marker data:', e);
    }
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
  const lat = parseFloat(params.get('lat'));
  const lon = parseFloat(params.get('lon'));
  const zoom = parseInt(params.get('zoom'));
  const markerBase64 = params.get('marker');
  
  const result = {
    targetLocation: null,
    selectedMarker: null
  };
  
  // Update location if valid parameters exist
  if (!isNaN(lat) && !isNaN(lon) && !isNaN(zoom)) {
    result.targetLocation = {
      lat,
      lon,
      zoom
    };
  }
  
  // If there's a marker parameter, decode the base64 data
  if (markerBase64) {
    try {
      const markerJson = decodeURIComponent(atob(markerBase64));
      result.selectedMarker = JSON.parse(markerJson);
      result.selectedMarker.lat = parseFloat(result.selectedMarker.lat);
      result.selectedMarker.lon = parseFloat(result.selectedMarker.lon);
      result.selectedMarker.page_len = parseInt(result.selectedMarker.page_len);
    } catch (e) {
      console.error('Error decoding marker data:', e);
    }
  }
  
  return result;
}

/**
 * Handles browser back/forward navigation by reading URL state
 * Use this to handle popstate events
 * 
 * @param {Function} stateUpdateCallback - Function to call with new state
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