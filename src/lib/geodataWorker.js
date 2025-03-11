// Web worker for processing geodata files

// Import pako for gzip decompression
// Since this is a worker, we need to use importScripts for older browsers
// or rely on the bundler to handle this import
import pako from 'pako';
import ngeohash from 'ngeohash';
import Loki from 'lokijs';
import Fuse from 'fuse.js';
import { getUniqueByGeoHash } from './geodata';
// Initialize the database in the worker
const db = new Loki('geodata.db', {
  autoload: true,
  autosave: false,
  throttledSaves: false
});

// Create collections
const geoCollection = db.addCollection('geodata', {
  indices: ['geo2', 'category'],
  adaptiveBinaryIndices: false,
  transactional: false,
  clone: false,
  disableMeta: true
});

const tinyGeoCollection = db.addCollection('tinygeodata', {
  indices: ['geo2', 'category'],
  adaptiveBinaryIndices: false,
  transactional: false,
  clone: false,
  disableMeta: true
});

// Keep track of ingested files with their download state
// null = never downloaded, Promise = downloading, true = downloaded
const ingestedFiles = new Map();

// Initialize Fuse instance for search
let fuseIndex = null
let searchableData = [];

// Function to build or rebuild the search index
function buildSearchIndex() {
  // Collect all items from both collections for searching
  searchableData = geoCollection.chain().data();
  
  // Configure Fuse options for searching
  const fuseOptions = {
    keys: ['page_title', 'name', 'category'],
    threshold: 0.3,
    ignoreLocation: false,
    includeScore: true,
    shouldSort: true,
    minMatchCharLength: 2
  };
  
  // Create new Fuse index
  fuseIndex = new Fuse(searchableData, fuseOptions);
}




// Function to process a CSV file from gzipped data
async function loadCsvGzFile(url) {
  let rows = [];
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  try {
    const decompressed = pako.inflate(new Uint8Array(buffer), { to: 'string' });
    return parseCsv(decompressed);
  } catch (err) {
    // If decompression fails, treat as plain text
    const text = new TextDecoder().decode(buffer);
    return parseCsv(text);
  }
}

function parseCsv(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split('\t');
  
  return lines.slice(1).filter(line => line.trim().length > 0).map(line => {
    const values = line.split('\t');
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i];
    });
    const latLon = ngeohash.decode(row.geohash);
    row.lat = latLon.latitude;
    row.lon = latLon.longitude;
    row.geo2 = row.geohash.substring(0, 2);
    row.id = `${row.geohash}-${row.page_title}`;

    return row;
  });
}

// Function to handle database queries
function queryGeoTable(table, minLat, maxLat, minLon, maxLon) {
  const geohashes_2 = ngeohash.bboxes(minLat, minLon, maxLat, maxLon, 2);
  return table.chain()
    .find({ geo2: { '$in': geohashes_2 }})
    .where(obj => obj.lat >= minLat && obj.lat <= maxLat && obj.lon >= minLon && obj.lon <= maxLon)
    .data();
}



// Set up event listener for messages from the main thread
self.addEventListener('message', async (event) => {
  try {
    const { type, bounds, basePath, searchQuery, requestId, hashlevel } = event.data;
    
    if (type === 'textSearch') {      
      // Perform search if we have an index
      if (fuseIndex) {
        
        const results = fuseIndex.search(searchQuery, {
          threshold: 0.2,
          minMatchCharLength: 3,
          distance: 10
        })
        self.postMessage({
          type: 'queryResults',
          requestId,
          results: results.map(result => result.item)
        });
      } else {
        // Return empty result if no index available
        self.postMessage({
          type: 'queryResults',
          requestId,
          results: []
        });
      }
    }
    else if (type === 'queryBounds') {
      // Handle bounds query
      const { minLat, maxLat, minLon, maxLon } = bounds;
      
      // Determine which files to load
      const geohashes_1 = ngeohash.bboxes(minLat, minLon, maxLat, maxLon, 1);
      let fileUrls = [];
      let table = null;
      
      if (geohashes_1.length > 5) {
        table = tinyGeoCollection;
        fileUrls = [`${basePath}geodata/geo3_unique.csv.gz`];
      } else {
        table = geoCollection;
        fileUrls = geohashes_1.map(g => `${basePath}geodata/${g}.csv.gz`);
      }
      
      // Load missing data
      
      const downloadPromises = [];
      
      for (const url of fileUrls) {
        // Initialize entries for files we've never seen before
        if (!ingestedFiles.has(url)) {
          ingestedFiles.set(url, null);
        }
        
        // If file is not downloaded and not currently downloading
        if (ingestedFiles.get(url) === null) {
          // Create and store download promise
          const downloadPromise = (async () => {
            try {
              const rows = await loadCsvGzFile(url);
              table.insert(rows);
              ingestedFiles.set(url, true);
              return rows;
            } catch (error) {
              // In case of error, reset status so it can be tried again
              ingestedFiles.set(url, null);
              throw error;
            }
          })();
          
          ingestedFiles.set(url, downloadPromise);
          downloadPromises.push(downloadPromise);
        } 
        // If file is currently downloading, add the existing promise
        else if (ingestedFiles.get(url) instanceof Promise) {
          downloadPromises.push(ingestedFiles.get(url));
        }
        // Otherwise file is already downloaded, nothing to do
      }
      
      // Wait for all downloads to complete
      if (downloadPromises.length > 0) {
        
        await Promise.all(downloadPromises);
        
      }
      
      // Query the data
      const allResults = queryGeoTable(table, minLat, maxLat, minLon, maxLon)


      let results = getUniqueByGeoHash({
        entries: allResults,
        hashLength: hashlevel,
        scoreField: "page_len",
      });
      if (results.length > 400) {
        results.sort((a, b) => b.page_len - a.page_len);
        results = results.slice(0, 400);
      }
      
      // Return results to main thread
      self.postMessage({ 
        type: 'queryResults', 
        requestId: event.data.requestId,
        results 
      });
      if (downloadPromises.length > 0) {
        buildSearchIndex();
      }
    }
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      url: event.data.url,
      requestId: event.data.requestId,
      error: error.message 
    });
  }
});

// Let the main thread know the worker is ready
self.postMessage({ type: 'ready' }); 