import geohash from 'latlon-geohash';

/**
 * Adds latitude and longitude columns to a table based on geohash values
 * @param {Object} table - Arquero table with a geohash column
 * @returns {Object} Table with added lat and lon columns
 */
function addLatLonFromGeohash(table) {
  return table.derive({
    lat: d => {
      const decoded = geohash.decode(d.geohash);
      return decoded.lat;
    },
    lon: d => {
      const decoded = geohash.decode(d.geohash);
      return decoded.lon;
    }
  });
}

export { addLatLonFromGeohash };