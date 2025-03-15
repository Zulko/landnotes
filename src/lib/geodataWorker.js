// Web worker for processing geodata files

// Import pako for gzip decompression
// Since this is a worker, we need to use importScripts for older browsers
// or rely on the bundler to handle this import
import pako from 'pako';
import ngeohash from 'ngeohash';
import Fuse from 'fuse.js';
import { getUniqueByGeoHash } from './geodata.js';
// Initialize the database in the worker


class Trie {
  constructor({indexKey, scoreFn}) {
    this.root = {}; // Root node is just an empty object
    this.indexKey = indexKey;
    this.scoreFn = scoreFn;
  }

  insert(object) {
    let node = this.root;
    for (const char of object[this.indexKey]) {
      if (!node[char]) {
        node[char] = {}; // Create a new node if missing
      }
      node = node[char];
    }
    node["$"] = object; // Store the object at the end of the key
  }

  getEntriesWithPrefix(prefix) {
    let node = this.root;
    for (const char of prefix) {
      if (!node[char]) {
        return []; // Prefix not found
      }
      node = node[char];
    }
    return this._collectEntries(node);
  }

  getBestEntry(prefix) {
    let node = this.root;
    for (const char of prefix) {
      if (!node[char]) {  
        return null// Prefix not found
      }
      node = node[char]
    }
    if (node["$"]) {
      return node["$"]
    } else {
      return node["bestEntry"]
    }
  }
  

  _collectEntries(node) {
    let results = [];
    if (node["$"]) results.push(node["$"]); // If it stores an object, add it

    for (const char in node) {
      if (char !== "$") {
        results.push(...this._collectEntries(node[char]));
      }
    }
    return results;
  }

  computeBestEntriesRecursively(startingPrefix = "") {
    let node = this.root;
    for (const char of startingPrefix) {
      node = node[char]
    }
    this._computeNodeBestEntry(node);
  }
  _computeNodeBestEntry(node, depth = 0) {
    node["bestScore"] = 0;
    node["bestEntry"] = null;
    for (const child of Object.values(node)) {
      if (child && typeof child === 'object') {
        if (child["$"]) {
          const score = this.scoreFn(child["$"]);
          if (score > node["bestScore"]) {
            node["bestScore"] = score;
            node["bestEntry"] = child["$"];
            node["bestEntry"]['depth'] = depth;
          }
        } else {
          this._computeNodeBestEntry(child, depth + 1);
          
          if (child['bestScore'] > node["bestScore"]) {
            node["bestScore"] = child["bestScore"];
            node["bestEntry"] = child["bestEntry"];
            node["bestEntry"]['depth'] = depth;
          }
        }
      }
    }
  }
}

// Keep track of ingested files with their download state
// null = never downloaded, Promise = downloading, true = downloaded
const ingestedFiles = new Map();

// Initialize Fuse instance for search
let fuseIndex = null
let searchableData = [];

function scoreFn(row) {
  let score = row.page_len;
  if (!row.name) {
    score += 1000000;
  }
  return score;
}
const geoTrie = new Trie({indexKey: "geohash", scoreFn: scoreFn});



function buildSearchIndex() {
  // Collect all items from both collections for searching
  
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
    row.id = `${row.geohash}-${row.page_title}`;

    return row;
  });
}

// Function to download and process geodata files
async function downloadAndProcessGeodataFiles(fileUrls) {
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
          for (const row of rows) {
            geoTrie.insert(row);
            searchableData.push(row);
          }

          const prefix = url.includes('geo3_unique.csv.gz') ? '' : url.match(/(\w+)\.csv\.gz/)[1]
          geoTrie.computeBestEntriesRecursively(prefix)
          
          ingestedFiles.set(url, true);
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
  
  return downloadPromises.length > 0; // Return whether any new files were downloaded
}

// Function to select, filter and deduplicate entries based on bounds
function selectEntries(bounds, hashlevel) {
  const { minLat, maxLat, minLon, maxLon } = bounds;

  const geohashes = ngeohash.bboxes(minLat, minLon, maxLat, maxLon, Math.min(hashlevel+1, 8));
  let results = geohashes.map(g => geoTrie.getBestEntry(g));
  
  // Filter out null entries and entries outside the bounds
  results = results.filter(r => 
    r !== null && 
    r.lat >= minLat && 
    r.lat <= maxLat && 
    r.lon >= minLon && 
    r.lon <= maxLon
  );

  // Sort by page length (larger pages first)
  results.sort((a, b) => b.page_len - a.page_len);

  // Deduplicate if there are too many results
  if (results.length > 200) {
    // Use the imported getUniqueByGeoHash function instead of manual deduplication
    results = getUniqueByGeoHash({
      entries: results,
      hashLength: hashlevel,
      scoreField: 'page_len'
    });
    results = results.slice(0, 200);
  }
  
  return results;
}

// Set up event listener for messages from the main thread
self.addEventListener('message', async (event) => {
  try {
    const { type, requestId, params } = event.data;
    
    if (type === 'textSearch') {      
      // Perform search if we have an index
      if (fuseIndex) {
        
        const results = fuseIndex.search(params.searchQuery, {
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
      const { minLat, maxLat, minLon, maxLon } = params.bounds;
      
      // Determine which files to load
      const geo1List = ngeohash.bboxes(minLat, minLon, maxLat, maxLon, 1);
      let fileUrls = [];
      
      if (geo1List.length > 5) {
        // Very unzoomed! Use the geo3 precomputed table
        fileUrls = [`${params.basePath}geodata/geo3_unique.csv.gz`];
      } else {
        fileUrls = geo1List.map(g => `${params.basePath}geodata/${g}.csv.gz`);
      }
      
      // Load missing data
      const newFilesDownloaded = await downloadAndProcessGeodataFiles(fileUrls);

      // Use the new function to select entries
      const results = selectEntries({minLat, maxLat, minLon, maxLon}, params.hashlevel);
      
      // Return results to main thread
      self.postMessage({ 
        type: 'queryResults', 
        requestId: event.data.requestId,
        results 
      });
      if (newFilesDownloaded) {
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