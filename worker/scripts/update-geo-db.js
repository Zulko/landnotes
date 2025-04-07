const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if --remote flag is provided
const isRemote = process.argv.includes('--remote');
const executionMode = isRemote ? '--remote' : '';
console.log(`Running in ${isRemote ? 'remote' : 'local'} mode`);

const sqlDir = 'local_assets/sql_dump';
const files = fs.readdirSync(sqlDir).filter(file => file.endsWith('.sql'));
console.log(files);
execSync(`npx wrangler d1 execute ${executionMode} landnotes-geo-db --command "DROP TABLE IF EXISTS geodata;"`);
execSync(`npx wrangler d1 execute ${executionMode} landnotes-geo-db --command "DROP TABLE IF EXISTS text_search;"`);
files.forEach(file => {
  const filePath = path.join(sqlDir, file);
  console.log(`Executing ${filePath}...`);
  execSync(`npx wrangler d1 execute ${executionMode} -y landnotes-geo-db --file="${filePath}"`, { stdio: 'inherit' });
});