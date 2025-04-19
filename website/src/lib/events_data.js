import { inflate } from "pako";

import {
  cachedDecodeHybridGeohash,
  addLatLonToEntry,
  queryWithCache,
} from "./geo/geodata";
import { getOverlappingGeoEncodings } from "./geo/geohash";

function dateAndBoundsToMonthRegions({ date, bounds, strictDate = false }) {
  const regions = getOverlappingGeoEncodings(bounds, 1);
  let months = [];
  if (date.month === "all") {
    months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, ""];
  } else {
    months = strictDate ? [date.month] : [date.month, ""];
  }

  const monthRegions = [];
  for (const region of regions) {
    for (const month of months) {
      monthRegions.push(`${date.year}-${month}-${region}`);
    }
  }
  return monthRegions;
}

function deduplicate(array, keyProperty) {
  const uniqueMap = new Map();
  array.forEach((item) => {
    if (!uniqueMap.has(item[keyProperty])) {
      uniqueMap.set(item[keyProperty], item);
    }
  });
  return Array.from(uniqueMap.values());
}

async function queryEventsByMonthRegion(monthRegions) {
  const query = await fetch("query/events-by-month-region", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(monthRegions),
  });
  const queryJSON = await query.json();
  const eventsByMonthRegion = queryJSON.results.map((result) => {
    const compressedData = new Uint8Array(result.zlib_json_blob);
    const decompressed = inflate(compressedData, { to: "string" });
    const events = JSON.parse(decompressed);
    const monthRegion = result.month_region;
    return { monthRegion, events };
  });
  eventsByMonthRegion.forEach(({ events }) => {
    events.forEach(addLatLonToEntry);
  });
  return eventsByMonthRegion;
}

export async function getEventListsFromDateAndBounds({
  date,
  bounds,
  strictDate = false,
  cachedQueries,
}) {
  const monthRegions = dateAndBoundsToMonthRegions({
    date,
    bounds,
    strictDate,
  });
  const eventsByMonthRegion = await queryWithCache({
    queries: monthRegions,
    queryFn: queryEventsByMonthRegion,
    cachedQueries,
    resultId: "monthRegion",
  });
  const allEvents = eventsByMonthRegion.flatMap(({ events }) => events);
  return deduplicate(allEvents, "event_id");
}

// /**
//  * Fetches geodata for a list of geokeys, using cached entries when available
//  *
//  * @param {Array<string>} geoKeys - Array of geokeys to fetch
//  * @param {Map} cachedEntries - Map of already cached entries
//  * @returns {Promise<Array>} - Combined array of cached and newly fetched entries
//  */
// export async function getEventDataFromMonthRegions({
//   monthRegions,
//   cachedEntries,
// }) {
//   // Filter geokeys that are already in the cache
//   const inCachedEntries = monthRegions.filter((entry) =>
//     cachedEntries.has(entry)
//   );
//   const notInCachedEntries = monthRegions.filter(
//     (entry) => !cachedEntries.has(entry)
//   );

//   // Get entries from cache
//   const cachedEntriesResults = inCachedEntries
//     .map((entry) => cachedEntries.get(entry))
//     .filter((entry) => entry !== null);
//   // If all geokeys were in cache, return early
//   if (notInCachedEntries.length === 0) {
//     return cachedEntriesResults;
//   }

//   // Sort geokeys for consistent query patterns
//   notInCachedEntries.sort();

//   // Fetch entries that aren't in the cache
//   const query = await fetch("query/geo", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(geoKeysNotInCachedEntries),
//   });

//   const queryJSON = await query.json();
//   const entries = queryJSON.results;
//   console.time("addLatLonToEntry");
//   entries.forEach(addLatLonToEntry);
//   entries.forEach(processEntriesUnderGeokey);
//   console.timeEnd("addLatLonToEntry");
//   // Update the cache
//   geoKeysNotInCachedEntries.forEach((geokey) => {
//     cachedEntries.set(geokey, null);
//   });
//   entries.forEach((entry) => {
//     cachedEntries.set(entry.geokey, entry);
//   });

//   // Return combined results
//   return [...cachedEntriesResults, ...entries];
// }
