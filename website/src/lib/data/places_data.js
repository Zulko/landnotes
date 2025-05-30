import { inflate } from "pako";

import { decodeHybridGeohash, getOverlappingGeoEncodings } from "./geohash";
import { queryWithCache } from "./utils";
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
  if (entry.dots) {
    // Decompress dots if it's compressed with zlib
    const decodedData = atob(entry.dots);
    const compressedData = new Uint8Array(
      Array.from(decodedData, (c) => c.charCodeAt(0))
    );
    const decompressed = inflate(compressedData, { to: "string" });
    const entriesUnderGeokey = JSON.parse(decompressed);
    entry.dots = entriesUnderGeokey;

    // Convert geohashes to lat/lon coordinates for each key in dots
    for (const key in entry.dots) {
      if (entry.dots.hasOwnProperty(key)) {
        const geohashes = entry.dots[key];
        entry.dots[key] = geohashes.map((geohash) => {
          const coords = decodeHybridGeohash(geohash);
          return { geokey: `dot-${geohash}`, ...coords };
        });
      }
    }
  }
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
  if (geokeys.length > 1000) {
    throw new Error("geokeys issue");
  }
  const geokeyResults = await getPlaceDataFromGeokeys({
    geokeys,
    cachedQueries,
  });

  // Create a list of dot markers from dots
  const dots = [];
  const seenCoordinates = new Set(); // Track coordinates we've already processed
  let totalEntries = 0;
  for (const result of geokeyResults) {
    if (!result.dots) continue;
    if (!result.dots[maxZoomLevel]) continue;
    // Process each entry at this zoom level
    for (const entry of result.dots[maxZoomLevel]) {
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

export async function getEntriesfromText(searchText, mode = "places") {
  try {
    const response = await fetch(`/query/${mode}-textsearch`, {
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
    if (mode === "places") {
      entries.forEach(addLatLonToEntry);
    }
    return entries;
  } catch (error) {
    console.error("Error searching for locations:", error);
    return [];
  }
}
