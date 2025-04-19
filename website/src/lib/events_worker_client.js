/**
 * Client-side module for interacting with the events worker
 */

// Store for pending request promises
let workerPromises = {};

// Create a single worker instance that will be reused
let workerInstance = null;

/**
 * Initialize the worker if it hasn't been initialized yet
 * @returns {Worker} The initialized worker
 */
function initWorker() {
  console.log("Initializing worker");
  if (workerInstance === null) {
    workerInstance = new Worker(
      new URL("./events_worker.js", import.meta.url),
      {
        type: "module",
      }
    );

    // Set up message handler for worker responses
    workerInstance.addEventListener("message", (event) => {
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
    workerInstance.addEventListener("error", (error) => {
      console.error("Worker error:", error);
    });
  }

  return workerInstance;
}

const worker = initWorker();

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
  const payload = {
    type: "getEventsForBoundsAndDate",
    requestId,
    bounds,
    zoom,
    date,
    strictDate,
  };
  console.log("Sending request to worker", payload);
  worker.postMessage(payload);

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

/**
 * Terminate the worker and clean up resources
 */
export function terminateWorker() {
  if (worker) {
    worker.terminate();
    workerInstance = null;
    workerPromises = {};
  }
}

/**
 * Get the current worker instance
 * @returns {Worker|null} The current worker instance or null if not initialized
 */
export function getWorker() {
  return worker;
}
