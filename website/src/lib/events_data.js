import { inflate } from "pako";

import { cachedDecodeHybridGeohash, queryWithCache } from "./geo/geodata";

let worker = null;
// Store for pending request promises
let workerPromises = {};

function initEventsWorker() {
  // Create a single worker instance that will be reused

  console.log("Initializing worker");
  if (worker === null) {
    worker = new Worker(new URL("./events_worker.js", import.meta.url), {
      type: "module",
    });

    // Set up message handler for worker responses
    worker.addEventListener("message", (event) => {
      const { type, requestId, events, dotEvents, error } = event.data;

      if (!requestId || !workerPromises[requestId]) {
        console.error(
          "Received worker message with no matching request",
          event.data
        );
        return;
      }

      const { resolve, reject } = workerPromises[requestId];

      if (type === "response") {
        resolve({ events, dotEvents });
      } else if (type === "error") {
        reject(new Error(error));
      }

      // Clean up the promise
      delete workerPromises[requestId];
    });

    // Handle worker errors
    worker.addEventListener("error", (error) => {
      console.error("Worker error:", error);
    });
  }
}

initEventsWorker();

/**
 * Get events for the given bounds and date parameters
 * @param {Object} params - Parameters for fetching events
 * @param {Object} params.bounds - Map bounds (north, south, east, west)
 * @param {number} params.zoom - Current zoom level
 * @param {Object} params.date - Date object with year and month
 * @param {boolean} params.strictDate - Whether to strictly match the date
 * @returns {Promise<{events: Array, dotEvents: Array}>} Promise resolving to an array of events
 */
export async function getEventsForBoundsAndDate({
  bounds,
  zoom,
  date,
  strictDate,
}) {
  // Create a unique request ID
  const requestId = `query_${Date.now()}_${Math.random()}`;

  // Create a promise that will be resolved when the worker responds
  const requestPromise = new Promise((resolve, reject) => {
    workerPromises[requestId] = { resolve, reject };
  });

  // Send the request to the worker
  worker.postMessage({
    type: "getEventsForBoundsAndDate",
    requestId,
    bounds,
    zoom,
    date,
    strictDate,
  });

  // Set a timeout to reject the promise if the worker doesn't respond
  const timeoutId = setTimeout(() => {
    if (workerPromises[requestId]) {
      const { reject } = workerPromises[requestId];
      reject(new Error("Worker request timed out"));
      delete workerPromises[requestId];
    }
  }, 30000); // 30 second timeout

  try {
    // Wait for the worker to respond
    const result = await requestPromise;
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function queryEventsById(eventIds) {
  eventIds.sort();
  const response = await fetch("query/events-by-id", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventIds),
  });
  const queryJSON = await response.json();
  const entries = queryJSON.results;
  entries.forEach((entry) => {
    entry.geokeys = entry.geokeys.split("|");
    entry.locations_latlon = entry.geokeys.map(cachedDecodeHybridGeohash);
    entry.subevents = [];
  });
  return entries;
}

export async function getEventsById({ eventIds, cachedQueries }) {
  return await queryWithCache({
    queries: eventIds,
    queryFn: queryEventsById,
    cachedQueries,
    resultId: "event_id",
  });
}
