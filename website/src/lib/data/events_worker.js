import { inflate } from "pako";

import { addLatLonToEntry } from "./places_data";
import { queryWithCache, fetchFromBucket } from "./utils";
import { parseEventDate, isAfter, daysBetweenTwoDates } from "./date_utils";
import { getOverlappingGeoEncodings } from "./geohash";

// Event worker for processing and caching geographic event data

let currentDate = null;
let currentStrictDate = null;
let dateLowerBound = null;
let dateUpperBound = null;
let processedRegions = new Set();
let cachedEventsByMonthRegion = new Map();
let eventsByGeoKeyForDate = new Map();

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  const { type, requestId, ...data } = event.data;

  try {
    switch (type) {
      case "getEventsForBoundsAndDate":
        try {
          const { bounds, zoom, date, strictDate } = data;
          const geokeys = getOverlappingGeoEncodings(bounds, zoom);
          const geokeyEvents = await getEventsForGeokeys(
            geokeys,
            date,
            strictDate
          );
          const { events, dotEvents } = filterGeokeyEvents({
            geokeyEvents,
            bounds,
            zoom,
          });
          self.postMessage({ type: "response", requestId, events, dotEvents });
        } catch (error) {
          console.error("Error in getEventsForBoundsAndDate", error);
          self.postMessage({
            type: "error",
            requestId,
            error: error.message,
            stack: error.stack,
          });
        }
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({ type: "error", requestId, error: error.message });
  }
});

function filterGeokeyEvents({ geokeyEvents, bounds, zoom }) {
  const events = geokeyEvents
    .filter(
      (event) =>
        event.lat < bounds.maxLat &&
        event.lat > bounds.minLat &&
        event.lon < bounds.maxLon &&
        event.lon > bounds.minLon
    )
    .map((event) => {
      // Create a shallow copy of the event without the subevents property
      const { subevents, ...eventWithoutSubevents } = event;
      return eventWithoutSubevents;
    });
  const dotEvents = geokeyEvents
    .map((event) => event.subeventsByZoomLevel[zoom] || [])
    .flat()
    .filter(
      (event) =>
        event.lat < bounds.maxLat &&
        event.lat > bounds.minLat &&
        event.lon < bounds.maxLon &&
        event.lon > bounds.minLon
    );
  return { events, dotEvents };
}

/**
 * Get events for a set of geokeys
 * @param {Array} geokeys - Array of geokeys to fetch events for
 * @param {Object} date - The target date
 * @param {boolean} strictDate - Whether to strictly match the date
 * @returns {Promise<Array>} Events matching the geokeys
 */
async function getEventsForGeokeys(geokeys, date, strictDate) {
  // Reset computed events if date parameters have changed
  const differentDate =
    (!currentDate && date) ||
    currentDate.year !== date.year ||
    currentDate.month !== date.month ||
    currentDate.day !== date.day ||
    currentStrictDate !== strictDate;
  if (differentDate) {
    currentDate = date;
    currentStrictDate = strictDate;
    processedRegions = new Set();
    eventsByGeoKeyForDate = new Map();
    dateLowerBound = {
      year: date.year,
      month: date.month == "all" ? 1 : date.month,
      day: date.day == "all" ? 1 : date.day,
    };
    dateUpperBound = {
      year: date.year,
      month: date.month == "all" ? 12 : date.month,
      day: date.day == "all" ? 31 : date.day,
    };
  }

  // Extract regions from geokeys (first character of each geokey)
  const regions = new Set(geokeys.map((g) => g[0]));

  // Find regions that haven't been processed yet
  const missingRegions = Array.from(regions).filter(
    (r) => !processedRegions.has(r)
  );

  // Process all missing regions
  await Promise.all(
    missingRegions.map((region) =>
      precomputeEventsForRegionAndDate(region, date, strictDate)
    )
  );
  // Collect events for all requested geokeys
  const events = geokeys
    .map((g) => eventsByGeoKeyForDate.get(g) || null)
    .filter(Boolean);

  // Deduplicate events by event_id (this is because for the events treatment in
  // particular (not for places) the low-zoom events are also stored at higer-zoom
  // levels during the precomputation step. There is probably a need for code
  // cleaning somewhere to avoid this).
  const deduplicatedEvents = deduplicate(events, "event_id");

  return deduplicatedEvents;
}

/**
 * Process a region to prepare its geokey data
 * @param {string} region - Region identifier
 * @param {Date} date - Target date
 * @param {boolean} strictDate - Whether to strictly match the date
 */
async function precomputeEventsForRegionAndDate(region, date, strictDate) {
  const monthsRegions = getMonthRegions({
    date,
    strictDate,
    regions: [region],
  });
  const eventsByMonthRegion = await queryWithCache({
    queries: monthsRegions,
    queryFn: queryEventsByMonthRegion,
    cachedQueries: cachedEventsByMonthRegion,
    resultId: "monthRegion",
  });

  const allEvents = eventsByMonthRegion.flatMap(({ events }) => events);
  const dedupEvents = deduplicate(allEvents, "event_id");
  let filteredEvents = dedupEvents;
  if (strictDate) {
    filteredEvents = dedupEvents.filter((event) => {
      return (
        isAfter(event.start_date, dateLowerBound) &&
        isAfter(dateUpperBound, event.end_date)
      );
    });
  }
  console.log({
    monthsRegions,
    eventsByMonthRegion,
    allEvents,
    dedupEvents,
    filteredEvents,
  });

  // Assign geokeys to the events
  assignGeokeysToEvents(filteredEvents);

  // Mark this region as processed
  processedRegions.add(region);
}

/**
 * Determine which months are relevant for the given date parameters
 * A month is in this context is a string of the form "YYYY-MM"
 * @param {Object} params - Parameters for fetching events
 * @param {Object} params.date - Target date
 * @param {boolean} params.strictDate - Whether to strictly match the date
 * @param {Array} params.regions - Array of regions to fetch
 * @returns {Array} Array of month identifiers
 */
function getMonthRegions({ date, strictDate, regions }) {
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

/**
 * Assign geokeys to events based on their geohash
 * @param {Array} events - Events to assign geokeys to
 */
function assignGeokeysToEvents(events) {
  // Score and sort events by proximity to the target date
  events.forEach((event) => {
    event.score = scoreEventByProximityToDate(event);
  });

  events.sort((a, b) => {
    // First sort by score (descending)
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // For events with equal scores, sort by event_id
    return a.event_id.localeCompare(b.event_id);
  });

  // Assign events to geokeys
  const geohashToGeokey = new Map();

  for (const event of events) {
    let prefix = "";
    for (const char of event.geohash4) {
      prefix += char;

      if (!eventsByGeoKeyForDate.has(prefix)) {
        if (!geohashToGeokey.has(event.geohash4)) {
          // First time seeing this geohash4, assign it to this prefix
          geohashToGeokey.set(event.geohash4, prefix);

          // Create a new entry for this prefix
          eventsByGeoKeyForDate.set(prefix, {
            subeventsByZoomLevel: {},
            same_location_events: [],
            geokey: prefix,
            ...event,
          });
        } else {
          // This geohash4 is already mapped to another geokey
          // Make this prefix point to the same events as the existing geokey
          const existingGeokey = geohashToGeokey.get(event.geohash4);
          const existingEntry = eventsByGeoKeyForDate.get(existingGeokey);
          eventsByGeoKeyForDate.set(prefix, existingEntry);
        }
      } else {
        // Prefix already exists in the map
        const zoomLevel = prefix.length;
        const existingEntry = eventsByGeoKeyForDate.get(prefix);
        if (existingEntry.geohash4 === event.geohash4) {
          existingEntry.same_location_events.push(event);
          break;
        } else {
          // Add to subeventsByZoomLevel for this zoom level
          if (!existingEntry.subeventsByZoomLevel[zoomLevel]) {
            existingEntry.subeventsByZoomLevel[zoomLevel] = [];
          }

          if (existingEntry.subeventsByZoomLevel[zoomLevel].length < 10) {
            existingEntry.subeventsByZoomLevel[zoomLevel].push(event);
          }
        }
      }
    }
  }
}

/**
 * Score an event based on how close it is to the target date
 * @param {Object} event - Event to score
 * @returns {number} Score value
 */
function scoreEventByProximityToDate(event) {
  if (
    isAfter(event.start_date, dateLowerBound) &&
    isAfter(dateUpperBound, event.end_date)
  ) {
    return 0;
  }

  return Math.max(
    Math.min(0, daysBetweenTwoDates(currentDate, event.start_date)),
    Math.min(0, daysBetweenTwoDates(event.end_date, currentDate))
  );
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
  console.log("querying", { monthRegions });
  const query = await fetch(
    `${self.location.origin}/query/events-by-month-region`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(monthRegions),
    }
  );
  const queryJSON = await query.json();
  const promisedEventsByMonthRegion = queryJSON.results.map(async (result) => {
    const decodedData = atob(result.zlib_json_blob);
    let compressedData;
    console.log({ decodedData });
    if (decodedData.startsWith("file:")) {
      const path = decodedData.slice(5);
      compressedData = await fetchFromBucket(path);
    } else {
      compressedData = new Uint8Array(
        Array.from(decodedData, (c) => c.charCodeAt(0))
      );
    }
    const decompressed = inflate(compressedData, { to: "string" });
    const events = JSON.parse(decompressed);
    const monthRegion = result.month_region;
    console.log("obtained", { monthRegion, events });
    return { monthRegion, events };
  });

  const eventsByMonthRegion = await Promise.all(promisedEventsByMonthRegion);

  eventsByMonthRegion.forEach(({ events }) => {
    events.forEach(addLatLonToEntry);
    events.forEach((event) => {
      event.start_date = parseEventDate(event.start_date);
      event.end_date = parseEventDate(event.end_date);
    });
  });

  return eventsByMonthRegion;
}
