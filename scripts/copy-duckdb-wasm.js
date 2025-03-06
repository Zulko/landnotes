const fs = require('fs');
const path = require('path');

// Source path (from node_modules)
const sourceDir = path.resolve(__dirname, '../node_modules/@duckdb/duckdb-wasm/dist');
// Destination path (public directory)
const destDir = path.resolve(__dirname, '../public');

// Files to copy
const files = [
  'duckdb-mvp.wasm',
  'duckdb-eh.wasm', 
  'duckdb-browser-mvp.worker.js',
  'duckdb-browser-eh.worker.js'
];

// Make sure destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy each file
files.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const destPath = path.join(destDir, file);
  
  try {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied ${file} to public directory`);
  } catch (error) {
    console.error(`Error copying ${file}:`, error);
  }
}); 