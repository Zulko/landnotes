// Web worker for processing geodata files

// Import pako for gzip decompression
// Since this is a worker, we need to use importScripts for older browsers
// or rely on the bundler to handle this import
import pako from 'pako';
import ngeohash from 'ngeohash';
import Loki from 'lokijs';

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

// Keep track of ingested files
const ingestedFiles = [];

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
    const { type, bounds, basePath } = event.data;
    
    if (type === 'textSearch') {
      console.log("bla")
    }
    else if (type === 'queryBounds') {
      // Handle bounds query
      const { minLat, maxLat, minLon, maxLon } = bounds;
      
      // Determine which files to load
      const geohashes_1 = ngeohash.bboxes(minLat, minLon, maxLat, maxLon, 1);
      let fileUrls = [];
      let table = null;
      
      if (geohashes_1.length > 3) {
        table = tinyGeoCollection;
        fileUrls = [`${basePath}geodata/geo3_unique.csv.gz`];
      } else {
        table = geoCollection;
        fileUrls = geohashes_1.map(g => `${basePath}geodata/${g}.csv.gz`);
      }
      
      // Load missing data
      const needDownload = fileUrls.filter(url => !ingestedFiles.includes(url));
      for (const url of needDownload) {
        const rows = await loadCsvGzFile(url);
        table.insert(rows);
        ingestedFiles.push(url);
      }
      
      // Query the data
      const results = queryGeoTable(table, minLat, maxLat, minLon, maxLon);
      
      // Return results to main thread
      self.postMessage({ 
        type: 'queryResults', 
        requestId: event.data.requestId,
        results 
      });
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