import { addLatLonToRows, getGeohashesInBounds } from './geohash';
import Loki from 'lokijs';
import pako from 'pako';  // Import pako for gzip decompression

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
 * Loads a CSV.gz file from a specified URL and adds it to LokiJS collection
 * @param {string} url - URL of the CSV.gz file to load
 * @returns {Promise<Object>} LokiJS collection containing the loaded data
 */
export async function loadCsvGzFile(url) {
  try {
    // Make sure URL starts with correct path
    const fullUrl = url.startsWith('/') ? url : `/${url}`;
    console.log(`Fetching from: ${fullUrl}`);
    
    // Fetch the gzipped CSV file
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download file from ${fullUrl}: ${response.status} ${response.statusText}`);
    }

    // Print first 100 characters of response
    const csvText = await response.text();
    // Parse the CSV into an array of objects
    const rows = parseCsv(csvText);
    
    // Add lat/lon columns if geohash column exists
    const startTime = performance.now();
    if (rows.length > 0 && 'geohash' in rows[0]) {
      addLatLonToRows(rows);
    }
    const endTime = performance.now();
    console.log(`Processed geohash check and lat/lon addition in ${(endTime - startTime).toFixed(2)}ms`);
    
    console.log(`Loaded data from ${fullUrl} with ${rows.length} rows`);
    
    return rows;
  } catch (error) {
    console.error(`Error loading data from ${url}:`, error);
    return []; // Return empty array instead of throwing to make app more resilient
  }
}

/**
 * Parse CSV text into an array of objects
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
    console.log(`CSV has ${lines.length} lines. First line: ${lines[0]}`);
    
    const headers = lines[0].split(',').map(h => h.trim());
    console.log(`Found headers: ${headers.join(', ')}`);
    
    if (lines.length === 1) {
      console.warn("CSV only has a header line, no data");
      return [];
    }
    
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row = {};
      
      headers.forEach((header, i) => {
        row[header] = values[i];
      });
      
      return row;
    });
    
    const endTime = performance.now();
    console.log(`Successfully parsed ${rows.length} rows from CSV in ${(endTime - startTime).toFixed(2)}ms`);
    if (rows.length > 0) {
      console.log(`Sample row: ${JSON.stringify(rows[0])}`);
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
  
  console.log(`Updated geodata collection now has ${geoCollection.count()} rows`);
  return newRows;
}

export async function getGeoEntriesInBounds({minLat, maxLat, minLon, maxLon}) {
// Handle possible null/undefined bounds
  const geohashes_1 = getGeohashesInBounds({minLat, maxLat, minLon, maxLon}, 1);
  
  if (!Array.isArray(geohashes_1) || geohashes_1.length === 0) {
    console.warn("No geohashes found for the current bounds");
    return [];
  }
  
  if (geohashes_1.length > 5) {
    if (!ingestedFiles.includes("_geodata/geo2_unique.csv.gz")) {
      // Use consistent path format
      const fileUrl = "_geodata/geo2_unique.csv.gz";
      try {
        const rows = await loadCsvGzFile(fileUrl);
        tinyGeoCollection.insert(rows);
        ingestedFiles.push(fileUrl);
      } catch (error) {
        console.error("Failed to load tiny geodata:", error);
        return [];
      }
    }

    return tinyGeoCollection.find().filter(
      doc => doc.lat > minLat &&
      doc.lat < maxLat &&
      doc.lon > minLon &&
      doc.lon < maxLon
    );
  } else {
    // Download and ingest any new geohash files that haven't been processed yet
    // Use consistent path format without leading dot or slash
    const newGeohashes = geohashes_1.filter(g => !ingestedFiles.includes(`_geodata/${g}.csv.gz`));
    
    if (newGeohashes.length > 0) {
      // Collect all rows first before doing a single bulk insert
      
      // Load all files in parallel but collect results before inserting
      const loadResults = await Promise.all(newGeohashes.map(async (g) => {
        const url = `_geodata/${g}.csv.gz`;
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

      // Do a single bulk insert with all rows
      
      if (allRows.length > 0) {
        console.time('bulk_insert');
        geoCollection.insert(allRows);
        console.timeEnd('bulk_insert');
        console.log('Collection size:', geoCollection.count());
      }
    }
    
    const geohashes_2 = getGeohashesInBounds({minLat, maxLat, minLon, maxLon}, 2);
    return geoCollection.find({ 
      geo2: { '$in': geohashes_2 } 
    }).filter(doc => 
      doc.lat > minLat && 
      doc.lat < maxLat && 
      doc.lon > minLon && 
      doc.lon < maxLon
    );
  }
}

export function getUniqueByGeoHash({entries, hashLength, scoreField}) {
  return Object.values(
    entries.reduce((acc, item) => {
      const hash = item.geohash.substring(0, hashLength);
      if (!acc[hash] || acc[hash][scoreField] < item[scoreField]) {
        acc[hash] = item; // Keep the highest-scoring record
      }
      return acc;
    }, {})
  );
}

// Additional utility functions for working with the geodata can be added here 