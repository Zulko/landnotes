import { fromCSV } from 'arquero';
import { addLatLonFromGeohash } from './geohash';
/**
 * Loads a CSV.gz file from a specified URL and returns an Arquero table
 * @param {string} url - URL of the CSV.gz file to load
 * @returns {Promise<Object>} Arquero table containing the loaded data
 */
export async function loadCsvGzFile(url) {
  try {
    // Fetch the gzipped CSV file
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download file from ${url}: ${response.status} ${response.statusText}`);
    }
    
    // Get the compressed data
    const compressedData = await response.arrayBuffer();
    
    // Decompress the gzip data
    const decompressedData = await decompressGzip(compressedData);
    
    // Convert to text
    const csvText = new TextDecoder().decode(decompressedData);
    
    // Parse the CSV into an Arquero table
    let table = fromCSV(csvText);
    
    // Add lat/lon columns if geohash column exists
    if (table.columns().includes('geohash')) {
      table = addLatLonFromGeohash(table);
    }
    
    console.log(`Loaded data from ${url} with ${table.numRows()} rows and ${table.numCols()} columns`);
    
    return table;
  } catch (error) {
    console.error(`Error loading data from ${url}:`, error);
    throw error;
  }
}



/**
 * Decompresses gzipped data
 * @param {ArrayBuffer} compressedData - The gzipped data as ArrayBuffer
 * @returns {Promise<Uint8Array>} - Decompressed data
 */
async function decompressGzip(compressedData) {
  // Use DecompressionStream API (modern browsers)
  const ds = new DecompressionStream('gzip');
  const decompressedStream = new Response(compressedData).body.pipeThrough(ds);
  const response = new Response(decompressedStream);
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Downloads and processes the main geodata CSV file
 * @returns {Promise<Object>} Arquero table containing the geodata
 */
export async function loadGeoData() {
  try {
    const table = await loadCsvGzFile('/_geodata/geo2_unique.csv.gz');
    return table;
  } catch (error) {
    console.error('Error loading main geodata:', error);
    throw error;
  }
}

// Initialize and export the table
let geoTable = null;

/**
 * Initializes the geodata table
 */
export async function initGeoData() {
  if (!geoTable) {
    geoTable = await loadGeoData();
  }
  return geoTable;
}

/**
 * Gets the current geodata table
 * @returns {Object|null} The Arquero table or null if not initialized
 */
export function getGeoTable() {
  return geoTable;
}

/**
 * Adds data from a CSV.gz file to the existing geodata table
 * @param {string} url - URL of the CSV.gz file to load
 * @param {Object} options - Options for adding the data
 * @param {string[]} [options.keyColumns=[]] - Columns to use for joining, if merging
 * @param {boolean} [options.replace=false] - Whether to replace the existing table instead of joining
 * @param {string} [options.joinType='left'] - Join type if merging ('left', 'right', 'inner', 'outer')
 * @returns {Promise<Object>} Updated Arquero table
 */
export async function addDataFromUrl(url, options = {}) {
  const { 
    keyColumns = [], 
    replace = false,
    joinType = 'left'
  } = options;
  
  // Load the new data
  const newTable = await loadCsvGzFile(url);
  
  // If we should replace or there's no existing table, just set it
  if (replace || geoTable === null) {
    geoTable = newTable;
    return geoTable;
  }
  
  // If key columns are provided, join the tables
  if (keyColumns.length > 0) {
    geoTable = geoTable.join(newTable, keyColumns, keyColumns, null, { left: true });
  } else {
    // Otherwise, concatenate the tables (assuming compatible schemas)
    try {
      geoTable = geoTable.concat(newTable);
    } catch (error) {
      console.error('Failed to concatenate tables, schemas may be incompatible:', error);
      throw new Error('Failed to add data: tables have incompatible schemas');
    }
  }
  
  console.log(`Updated geodata table now has ${geoTable.numRows()} rows and ${geoTable.numCols()} columns`);
  return geoTable;
}

// Additional utility functions for working with the geodata can be added here 