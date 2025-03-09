/**
 * Updates the URL with current map state without reloading the page
 * @param {Object} targetLocation - The map location {lat, lon, zoom}
 * @param {Object|null} selectedMarker - Currently selected marker, if any
 */
export function updateURLParams(targetLocation, selectedMarker) {
  const params = new URLSearchParams();
  
  // Add map position parameters
  params.set('lat', targetLocation.lat.toFixed(6));
  params.set('lon', targetLocation.lon.toFixed(6));
  params.set('zoom', targetLocation.zoom.toString());
  
  // Add selected marker as base64-encoded JSON if present
  if (selectedMarker) {
    try {
      const markerJson = JSON.stringify(selectedMarker);
      const markerBase64 = btoa(encodeURIComponent(markerJson));
      params.set('marker', markerBase64);
    } catch (e) {
      console.error('Error encoding marker data:', e);
    }
  }
  
  // Update URL without reloading the page
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}

/**
 * Reads map state from URL parameters
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
    } catch (e) {
      console.error('Error decoding marker data:', e);
    }
  }
  
  return result;
} 