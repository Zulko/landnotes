import {inflate} from "pako";

import { decodeHybridGeohash, getOverlappingGeoEncodings } from "./geohash";

const decodeHybridGeohashCache = new Map();
function cachedDecodeHybridGeohash(geohash) {
  if (decodeHybridGeohashCache.has(geohash)) {
    return decodeHybridGeohashCache.get(geohash);
  }
  const result = decodeHybridGeohash(geohash);
  decodeHybridGeohashCache.set(geohash, result);
  return result;
}


function addLatLonToEntry(entry) {
    const full_geokey = `${entry.geokey}${entry.geokey_complement}`;
    const coords = cachedDecodeHybridGeohash(full_geokey);
    entry.lat = coords.lat;
    entry.lon = coords.lon;
}

function processEntriesUnderGeokey(entry) {
  if (entry.entries_under_geokey) {
    // Decompress entries_under_geokey if it's compressed with zlib
    const compressedData = new Uint8Array(entry.entries_under_geokey);
    const decompressed = inflate(compressedData, { to: 'string' });
    const entriesUnderGeokey = JSON.parse(decompressed);
    entry.entries_under_geokey = entriesUnderGeokey;
    
    // Convert geohashes to lat/lon coordinates for each key in entries_under_geokey
    for (const key in entry.entries_under_geokey) {
      if (entry.entries_under_geokey.hasOwnProperty(key)) {
        const geohashes = entry.entries_under_geokey[key];
        entry.entries_under_geokey[key] = geohashes.map(geohash => {
          const coords = decodeHybridGeohash(geohash);
          return {geokey: `dot-${geohash}`, ...coords};
        });
      }
    }
  }
}
/**
 * Fetches geodata for a list of geokeys, using cached entries when available
 * 
 * @param {Array<string>} geoKeys - Array of geokeys to fetch
 * @param {Map} cachedEntries - Map of already cached entries
 * @returns {Promise<Array>} - Combined array of cached and newly fetched entries
 */
export async function getGeodataFromGeokeys(geoKeys, cachedEntries) {
  // Filter geokeys that are already in the cache
  const geoKeysInCachedEntries = geoKeys.filter((geoKey) =>
    cachedEntries.has(geoKey)
  );
  const geoKeysNotInCachedEntries = geoKeys.filter(
    (geoKey) => !cachedEntries.has(geoKey)
  );
  
  // Get entries from cache
  const cachedEntriesResults = geoKeysInCachedEntries.map((geoKey) =>
    cachedEntries.get(geoKey)
  ).filter((entry) => entry !== null);
  // If all geokeys were in cache, return early
  if (geoKeysNotInCachedEntries.length === 0) {
    return cachedEntriesResults;
  }

  // Sort geokeys for consistent query patterns
  geoKeysNotInCachedEntries.sort();

  // Fetch entries that aren't in the cache
  const query = await fetch("query/geo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(geoKeysNotInCachedEntries),
  });

  const queryJSON = await query.json();
  const entries = queryJSON.results;
  console.time("addLatLonToEntry");
  entries.forEach(addLatLonToEntry);
  entries.forEach(processEntriesUnderGeokey);
  console.timeEnd("addLatLonToEntry");
  // Update the cache
  geoKeysNotInCachedEntries.forEach((geokey) => {
    cachedEntries.set(geokey, null);
  });
  entries.forEach((entry) => {
    cachedEntries.set(entry.geokey, entry);
  });
  
  // Return combined results
  return [...cachedEntriesResults, ...entries];
}

/**
 * Fetch geodata for the specified map bounds
 */
export async function getGeodataFromBounds(bounds, maxZoomLevel, cachedEntries) {
  // Collect geokeys for all zoom levels up to maxZoomLevel
  const geoKeys = Array.from(
    { length: maxZoomLevel },
    (_, i) => i + 1
  ).flatMap((zoomLevel) => getOverlappingGeoEncodings(bounds, zoomLevel));

  const geokeyResults = await getGeodataFromGeokeys(geoKeys, cachedEntries);

  // Create a list of dot markers from entries_under_geokey
  const dotMarkers = [];
  const seenCoordinates = new Set(); // Track coordinates we've already processed
  let totalEntries = 0;
  for (const result of geokeyResults) {
    if (!result.entries_under_geokey) continue;
    if (!result.entries_under_geokey[maxZoomLevel]) continue;
      // Process each entry at this zoom level
    for (const entry of result.entries_under_geokey[maxZoomLevel]) {
      totalEntries++;
      if (seenCoordinates.has(entry.geokey)) continue;
      seenCoordinates.add(entry.geokey);
      
      // Check if the coordinates are within bounds
      if (
        entry.lat >= bounds.minLat && 
        entry.lat <= bounds.maxLat &&
        entry.lon >= bounds.minLon && 
        entry.lon <= bounds.maxLon
      ) {
        dotMarkers.push(entry);
      }
    }
  }
  
  const entriesInBounds = geokeyResults.filter((entry) => {
    return entry.lat >= bounds.minLat && entry.lat <= bounds.maxLat &&
      entry.lon >= bounds.minLon && entry.lon <= bounds.maxLon;
  });
  return {dotMarkers, entriesInBounds};
}

export async function getEntriesfromText(searchText) {
  try {
    const response = await fetch("/query/geo-text-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ searchText }),
    });

    if (!response.ok) {
      throw new Error(`Search request failed with status ${response.status}`);
    }

    const data = await response.json();
    const entries = data["results"];
    entries.forEach(addLatLonToEntry);
    return entries;
  } catch (error) {
    console.error("Error searching for locations:", error);
    return [];
  }
}