import { inflate } from "pako";

import { addLatLonToEntry } from "./places_data";
import { queryWithCache } from "./utils";
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

  return events;
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

  // Assign geokeys to the events
  assignGeokeysToEvents(filteredEvents);

  // Mark this region as processed
  processedRegions.add(region);
}

function parseDate(date) {
  const [year, month, day] = date.split("/").map(Number);
  return { year, month, day };
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
  for (const event of events) {
    let prefix = "";
    for (const char of event.geohash4) {
      prefix += char;

      if (!eventsByGeoKeyForDate.has(prefix)) {
        // First event for this geokey
        eventsByGeoKeyForDate.set(prefix, {
          subeventsByZoomLevel: {},
          same_location_events: [],
          geokey: prefix,
          ...event,
        });
      } else {
        // Add to existing geokey entry
        const eventForGeokey = eventsByGeoKeyForDate.get(prefix);

        // Add as a subevent if we haven't reached the limit
        if (event.geohash4 === eventForGeokey.geohash4) {
          eventForGeokey.same_location_events.push(event);
        } else {
          let zoomLevel = prefix.length;
          while (
            event.geohash4.slice(0, zoomLevel) ===
            eventForGeokey.geohash4.slice(0, zoomLevel)
          ) {
            if (!eventForGeokey.subeventsByZoomLevel[zoomLevel]) {
              eventForGeokey.subeventsByZoomLevel[zoomLevel] = [];
            }
            if (eventForGeokey.subeventsByZoomLevel[zoomLevel].length < 10) {
              eventForGeokey.subeventsByZoomLevel[zoomLevel].push(event);
            }
            zoomLevel++;
          }
        }
      }
    }
  }
}

function daysBetweenTwoDates(date1, date2) {
  const yearGap = 365 * (date1.year - date2.year);
  const monthGap = (date1.month - date2.month) * 30;
  const dayGap = date1.day - date2.day;
  return yearGap + monthGap + dayGap;
}

function isAfter(date1, date2) {
  return (
    date1.year > date2.year ||
    (date1.year === date2.year &&
      (date1.month > date2.month ||
        (date1.month === date2.month &&
          (date1.day > date2.day || date1.day === date2.day))))
  );
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
  const eventsByMonthRegion = queryJSON.results.map((result) => {
    const compressedData = new Uint8Array(result.zlib_json_blob);
    const decompressed = inflate(compressedData, { to: "string" });
    const events = JSON.parse(decompressed);
    const monthRegion = result.month_region;
    return { monthRegion, events };
  });
  eventsByMonthRegion.forEach(({ events }) => {
    events.forEach(addLatLonToEntry);
    events.forEach((event) => {
      event.start_date = parseDate(event.start_date);
      event.end_date = parseDate(event.end_date);
    });
  });
  return eventsByMonthRegion;
}
