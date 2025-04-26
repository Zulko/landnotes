import { inflate } from "pako";

import { decodeHybridGeohash, getOverlappingGeoEncodings } from "./geohash";

const decodeHybridGeohashCache = new Map();

export function cachedDecodeHybridGeohash(geohash) {
  if (decodeHybridGeohashCache.has(geohash)) {
    return decodeHybridGeohashCache.get(geohash);
  }
  const result = decodeHybridGeohash(geohash);
  decodeHybridGeohashCache.set(geohash, result);
  return result;
}

export function addLatLonToEntry(entry) {
  // Todo: get rid of full_hybrid_geohash
  const full_geohash =
    entry.geohash4 ||
    entry.full_hybrid_geohash ||
    `${entry.geokey}${entry.geokey_complement}`;
  const coords = cachedDecodeHybridGeohash(full_geohash);
  entry.lat = coords.lat;
  entry.lon = coords.lon;
}

function processEntriesUnderGeokey(entry) {
  if (entry.entries_under_geokey) {
    // Decompress entries_under_geokey if it's compressed with zlib
    const decodedData = atob(entry.entries_under_geokey);
    const compressedData = new Uint8Array(
      Array.from(decodedData, (c) => c.charCodeAt(0))
    );
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

export async function queryWithCache({
  queries,
  queryFn,
  cachedQueries,
  resultId,
}) {
  const queriesInCache = queries.filter((query) => cachedQueries.has(query));

  const notInCache = queries.filter((query) => !cachedQueries.has(query));
  const cachedResults = queriesInCache
    .map((query) => cachedQueries.get(query))
    .filter((entry) => entry !== null);
  if (notInCache.length === 0) {
    return cachedResults;
  }

  const newResults = await queryFn(notInCache);
  newResults.forEach((newResult) => {
    cachedQueries.set(newResult[resultId], newResult);
  });
  notInCache.forEach((query) => {
    if (!cachedQueries.has(query)) {
      cachedQueries.set(query, null);
    }
  });
  return [...cachedResults, ...newResults];
}

async function queryPlacesByGeokey(geokeys) {
  geokeys.sort();
  const response = await fetch("query/places-by-geokey", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(geokeys),
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
 * @param {Object} params - Object containing geokeys and cachedQueries
 * @param {Array<string>} params.geokeys - Array of geokeys to fetch
 * @param {Map} params.cachedQueries - Map of already cached entries
 * @returns {Promise<Array>} - Combined array of cached and newly fetched entries
 */
export async function getPlaceDataFromGeokeys({ geokeys, cachedQueries }) {
  return await queryWithCache({
    queries: geokeys,
    queryFn: queryPlacesByGeokey,
    cachedQueries,
    resultId: "geokey",
  });
}

/**
 * Fetch geodata for the specified map bounds
 */
export async function getGeodataFromBounds({
  bounds,
  maxZoomLevel,
  cachedQueries,
}) {
  // Collect geokeys for all zoom levels up to maxZoomLevel
  const geokeys = Array.from({ length: maxZoomLevel }, (_, i) => i + 1).flatMap(
    (zoomLevel) => getOverlappingGeoEncodings(bounds, zoomLevel)
  );
  const geokeyResults = await getPlaceDataFromGeokeys({
    geokeys,
    cachedQueries,
  });

  // Create a list of dot markers from entries_under_geokey
  const dots = [];
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
        dots.push(entry);
      }
    }
  }

  const entryInfos = geokeyResults.filter((entry) => {
    return (
      entry.lat >= bounds.minLat &&
      entry.lat <= bounds.maxLat &&
      entry.lon >= bounds.minLon &&
      entry.lon <= bounds.maxLon
    );
  });
  return { entryInfos, dots };
}

export async function getEntriesfromText(searchText) {
  try {
    const response = await fetch("/query/places-textsearch", {
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
