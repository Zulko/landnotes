import geohash from 'latlon-geohash';

/**
 * Add latitude and longitude to rows based on geohash
 * @param {Array} rows - Array of data objects
 */
function addLatLonToRows(rows) {
  for (const row of rows) {
    if (row.geohash) {
      const { lat, lon } = geohash.decode(row.geohash);
      row.lat = lat;
      row.lon = lon;
      row.geo2 = row.geohash.substring(0, 2);
    }
  }
}
/**
 * Gets all unique 1-length geohashes that cover a bounded region
 * @param {Object} bounds - Object containing northEast and southWest coordinates
 * @returns {string[]} Array of unique 1-length geohashes
 */
function getGeohashesInBounds({minLat, maxLat, minLon, maxLon}, length=1, resolution=20) {
  
  // Calculate grid step size (aim for roughly 10x10 grid within bounds)
  const latSpan = maxLat - minLat;
  const lonSpan = maxLon - minLon;
  const latStep = Math.min(latSpan / resolution);
  const lonStep = Math.min(lonSpan / resolution);

  // Initialize set to store unique geohashes
  const geohashes = new Set();

  // Iterate through grid points
  for (let lat = minLat; lat <= maxLat + latStep; lat += latStep) {
    for (let lon = minLon; lon <= maxLon + lonStep; lon += lonStep) {
      // Get 1-length geohash for this point
      const hash = geohash.encode(lat, lon, length);
      geohashes.add(hash);
    }
  }

  return Array.from(geohashes);
}

export { addLatLonToRows, getGeohashesInBounds };
