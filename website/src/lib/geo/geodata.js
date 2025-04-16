import { inflate } from "pako";

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
    const decompressed = inflate(compressedData, { to: "string" });
    const entriesUnderGeokey = JSON.parse(decompressed);
    entry.entries_under_geokey = entriesUnderGeokey;

    // Convert geohashes to lat/lon coordinates for each key in entries_under_geokey
    for (const key in entry.entries_under_geokey) {
      if (entry.entries_under_geokey.hasOwnProperty(key)) {
        const geohashes = entry.entries_under_geokey[key];
        entry.entries_under_geokey[key] = geohashes.map((geohash) => {
          const coords = decodeHybridGeohash(geohash);
          return { geokey: `dot-${geohash}`, ...coords };
        });
      }
    }
  }
}

async function queryWithCache({ queries, queryFn, cachedQueries, resultId }) {
  const inCachedEntries = queries.filter((query) => cachedQueries.has(query));
  const notInCachedEntries = queries.filter(
    (query) => !cachedQueries.has(query)
  );
  const cachedEntriesResults = inCachedEntries
    .map((query) => cachedQueries.get(query))
    .filter((entry) => entry !== null);
  if (notInCachedEntries.length === 0) {
    return cachedEntriesResults;
  }

  const results = await queryFn(notInCachedEntries);
  results.forEach((result) => {
    cachedQueries.set(result[resultId], result);
  });
  notInCachedEntries.forEach((query) => {
    if (!cachedQueries.has(query)) {
      cachedQueries.set(query, null);
    }
  });
  return [...cachedEntriesResults, ...results];
}

async function queryGeoData(geoKeys) {
  geoKeys.sort();
  const response = await fetch("query/geo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(geoKeys),
  });
  const queryJSON = await response.json();
  const entries = queryJSON.results;
  entries.forEach(addLatLonToEntry);
  entries.forEach(processEntriesUnderGeokey);
  return entries;
}
/**
 * Fetches geodata for a list of geokeys, using cached entries when available
 *
 * @param {Array<string>} geoKeys - Array of geokeys to fetch
 * @param {Map} cachedEntries - Map of already cached entries
 * @returns {Promise<Array>} - Combined array of cached and newly fetched entries
 */
export async function getGeodataFromGeokeys(geoKeys, cachedEntries) {
  return await queryWithCache({
    queries: geoKeys,
    queryFn: queryGeoData,
    cachedQueries: cachedEntries,
    resultId: "geokey",
  });
}

/**
 * Fetch geodata for the specified map bounds
 */
export async function getGeodataFromBounds(
  bounds,
  maxZoomLevel,
  cachedEntries
) {
  // Collect geokeys for all zoom levels up to maxZoomLevel
  const geoKeys = Array.from({ length: maxZoomLevel }, (_, i) => i + 1).flatMap(
    (zoomLevel) => getOverlappingGeoEncodings(bounds, zoomLevel)
  );
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
    return (
      entry.lat >= bounds.minLat &&
      entry.lat <= bounds.maxLat &&
      entry.lon >= bounds.minLon &&
      entry.lon <= bounds.maxLon
    );
  });
  return { dotMarkers, entriesInBounds };
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
