import Loki from 'lokijs';
import ngeohash from 'ngeohash'; // Import ngeohash for better performance
const basePath = import.meta.env.BASE_URL;
// Initialize a LokiJS database

const ingestedFiles = [];
const db = new Loki('geodata.db', {
  autoload: true,
  autosave: false,  // Disable autosave for better performance
  throttledSaves: false
});

// Create a collection for geo data with optimized configuration
const geoCollection = db.addCollection('geodata', {
  indices: ['geo2', 'category'],
  adaptiveBinaryIndices: false,  // Disable adaptive indices for bulk operations
  transactional: false,  // Disable transactions for better performance
  clone: false,  // Disable object cloning for better performance
  disableMeta: true  // Disable meta properties for better performance
});

const tinyGeoCollection = db.addCollection('tinygeodata', {
  indices: ['geo2', 'category'],
  adaptiveBinaryIndices: false,
  transactional: false,
  clone: false,
  disableMeta: true
});

/**
 * @typedef {Object} GeoDocument
 * @property {string} geo2 - Geohash
 * @property {string} category - Category
 * @property {number} lat - Latitude
 * @property {number} lon - Longitude
 * @property {string} [geohash] - Original geohash
 * @property {number} [population] - Population
 */

/**
 * Add latitude and longitude to rows based on geohash - optimized version using ngeohash
 * @param {Array} rows - Array of data objects
 */
function addLatLonToRows(rows) {
  // Process all rows in a single loop for better performance
  const len = rows.length;
  for (let i = 0; i < len; i++) {
    const row = rows[i];
    if (row.geohash) {
      // Use ngeohash decode which is optimized for performance
      const latLon = ngeohash.decode(row.geohash);
      row.lat = latLon.latitude;
      row.lon = latLon.longitude;
      row.geo2 = row.geohash.substring(0, 2);
    }
  }
}

/**
 * Loads a CSV.gz file from a specified URL and adds it to LokiJS collection
 * @param {string} url - URL of the CSV.gz file to load
 * @returns {Promise<Object>} LokiJS collection containing the loaded data
 */
export async function loadCsvGzFile(url) {
  try {
    // Make sure URL starts with correct path
    const fullUrl = url.startsWith('/') ? url : `/${url}`;
    
    // Fetch the gzipped CSV file
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download file from ${fullUrl}: ${response.status} ${response.statusText}`);
    }

    // Parse CSV directly from response text
    const csvText = await response.text();
    const rows = parseCsv(csvText);
    
    return rows;
  } catch (error) {
    console.error(`Error loading data from ${url}:`, error);
    return []; // Return empty array instead of throwing to make app more resilient
  }
}

/**
 * Parse CSV text into an array of objects - optimized for speed
 * @param {string} csvText - The CSV text to parse
 * @returns {Array} - Array of objects representing CSV rows
 */
function parseCsv(csvText) {
  try {
    const startTime = performance.now();

    if (!csvText || csvText.trim() === '') {
      console.error("Empty CSV text provided to parser");
      return [];
    }
    
    const lines = csvText.trim().split('\n');
    
    const headers = lines[0].split('\t').map(h => h.trim());
    console.log("headers", headers);
    
    // Pre-allocate array for better performance
    const rows = new Array(lines.length - 1);
    
    // Process all lines in a single loop - simpler and more efficient
    const numLines = lines.length;
    const headerLength = headers.length;
    
    for (let i = 1; i < numLines; i++) {
      const values = lines[i].split('\t').map(v => v.trim());
      const row = {};
      
      for (let k = 0; k < headerLength; k++) {
        row[headers[k]] = values[k];
      }
      
      rows[i-1] = row;
    }
    
    return rows;
  } catch (error) {
    console.error("Error parsing CSV:", error);
    return [];
  }
}

/**
 * Adds data from a CSV.gz file to the existing geodata collection
 * @param {string} url - URL of the CSV.gz file to load
 * @returns {Promise<Object>} Updated LokiJS collection
 */
export async function addDataFromUrl(url) {
  // Load the new data
  const newRows = await loadCsvGzFile(url);
  
  // Add the new rows to the collection
  geoCollection.insert(newRows);
  
  return newRows;
}

/**
 * Get geo entries within bounds - optimized version
 * @param {Object} bounds - Object with minLat, maxLat, minLon, maxLon
 * @returns {Array} Array of geo entries within bounds
 */
export async function getGeoEntriesInBounds({minLat, maxLat, minLon, maxLon}) {
  // Handle possible null/undefined bounds  
  const geohashes_1 = ngeohash.bboxes(minLat, minLon, maxLat, maxLon, 1);
  
  if (!Array.isArray(geohashes_1) || geohashes_1.length === 0) {
    console.warn("No geohashes found for the current bounds");
    return [];
  }
  
  if (geohashes_1.length > 3) {
    if (!ingestedFiles.includes("geodata/geo3_unique.csv.gz")) {
      // Use consistent path format
      const fileUrl = `${basePath}geodata/geo3_unique.csv.gz`;
      try {
        const rows = await loadCsvGzFile(fileUrl);
        addLatLonToRows(rows);
        tinyGeoCollection.insert(rows);
        ingestedFiles.push(fileUrl);
      } catch (error) {
        console.error("Failed to load tiny geodata:", error);
        return [];
      }
    }

    // Type assertion for the filter method
    /** @type {GeoDocument[]} */
    const results = tinyGeoCollection.find();
    return results.filter(
      doc => doc.lat > minLat &&
      doc.lat < maxLat &&
      doc.lon > minLon &&
      doc.lon < maxLon
    );
  } else {
    // Download and ingest any new geohash files that haven't been processed yet
    // Use consistent path format without leading dot or slash
    const needDownload = geohashes_1.filter(g => !ingestedFiles.includes(`geodata/${g}.csv.gz`));
    
    if (needDownload.length > 0) {
      // needDownload all rows first before doing a single bulk insert
      
      // Load all files in parallel but collect results before inserting
      const loadResults = await Promise.all(needDownload.map(async (g) => {
        const url = `${basePath}geodata/${g}.csv.gz`;
        try {
          const rows = await loadCsvGzFile(url);
          ingestedFiles.push(url);
          return rows;
        } catch (error) {
          console.warn(`Failed to load data for geohash ${g}:`, error);
          return [];
        }
      }));
      const allRows = loadResults.flat();
         
      console.time('add_latlon');
      addLatLonToRows(allRows);
      console.timeEnd('add_latlon');

      // Do a single bulk insert with all rows
      if (allRows.length > 0) {
        geoCollection.insert(allRows);
      }
    }
    
    const geohashes_2 = ngeohash.bboxes(minLat, minLon, maxLat, maxLon, 2);
    
    const results = geoCollection.find({geo2: { '$in': geohashes_2 }});
    
    return results.filter(doc => 
      doc.lat > minLat && 
      doc.lat < maxLat && 
      doc.lon > minLon && 
      doc.lon < maxLon
    );
  }
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

// Additional utility functions for working with the geodata can be added here 