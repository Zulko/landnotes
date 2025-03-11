import Loki from 'lokijs';
import ngeohash from 'ngeohash'; // Import ngeohash for better performance
import pako from 'pako';
const basePath = import.meta.env.BASE_URL;
// Initialize a LokiJS database



/**
 * Get geo entries within bounds - optimized version
 * @param {Object} bounds - Object with minLat, maxLat, minLon, maxLon
 * @returns {Promise<Array>} Array of geo entries within bounds
 */
export async function getGeoEntriesInBounds(bounds, hashlevel) {
  // Make sure worker is initialized
  if (!window.geodataWorker) {
    initWorker();
  }
  
  // Create a unique request ID
  const requestId = `query_${Date.now()}_${Math.random()}`;
  
  // Create a promise that will be resolved when the worker returns results
  const queryPromise = new Promise((resolve, reject) => {
    window.geodataWorkerPromises[requestId] = { resolve, reject };
  });
  
  // Send query to worker
  window.geodataWorker.postMessage({
    type: 'queryBounds',
    requestId,
    hashlevel,
    bounds,
    basePath: import.meta.env.BASE_URL
  });
  
  // Wait for worker to return results
  return await queryPromise;
}

export async function getEntriesfromText(searchQuery) {
  // Make sure worker is initialized
  if (!window.geodataWorker) {
    initWorker();
  }

  // Create a unique request ID
  const requestId = `query_${Date.now()}_${Math.random()}`;
  
  // Create a promise that will be resolved when the worker returns results
  const queryPromise = new Promise((resolve, reject) => {
    window.geodataWorkerPromises[requestId] = { resolve, reject };
  });

  // Send query to worker
  window.geodataWorker.postMessage({
    type: 'textSearch',
    requestId,
    searchQuery
  });

  // Wait for worker to return results
  return await queryPromise;
}

/**
 * Get unique entries by geohash with optimized algorithm
 * @param {Object} params - Object with entries, hashLength, and scoreField
 * @returns {Array} Array of unique entries by geohash
 */
export function getUniqueByGeoHash({entries, hashLength, scoreField}) {
  // Use Map for better performance with large datasets
  const hashMap = new Map();
  
  for (let i = 0; i < entries.length; i++) {
    const item = entries[i];
    const hash = item.geohash.substring(0, hashLength);
    
    if (!hashMap.has(hash) || hashMap.get(hash)[scoreField] < item[scoreField]) {
      hashMap.set(hash, item); // Keep the highest-scoring record
    }
  }
  
  return Array.from(hashMap.values());
}

// Initialize the worker once
function initWorker() {
  window.geodataWorker = new Worker(new URL('./geodataWorker.js', import.meta.url), { type: 'module' });
  window.geodataWorkerPromises = {};
  
  window.geodataWorker.addEventListener('message', (event) => {
    const { type, url, results, error, requestId } = event.data;
    
    if (type === 'queryResults' && window.geodataWorkerPromises[requestId]) {
      window.geodataWorkerPromises[requestId].resolve(results);
      delete window.geodataWorkerPromises[requestId];
    }
    else if (type === 'error') {
      const promiseKey = url || requestId;
      if (window.geodataWorkerPromises[promiseKey]) {
        window.geodataWorkerPromises[promiseKey].reject(new Error(error));
        delete window.geodataWorkerPromises[promiseKey];
      }
    }
  });
}

// Additional utility functions for working with the geodata can be added here 