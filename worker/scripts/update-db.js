/**
 * Update Geo Database Script
 * ==========================
 *
 * This script updates the geographic database by executing SQL files.
 * It can be run in either local or remote mode and supports various parameters.
 *
 * Usage:
 *   node update-db.js [options]
 *
 * Options:
 *   --remote         Execute against the remote database (default: local)
 *   --delete         Drop existing tables before creating new ones
 *   --start-index=N  Skip the first N SQL files (useful for resuming after errors)
 *   --db=NAME        Specify the database name (default: landnotes-geo-db)
 *   --sql-dir=PATH   Specify the directory containing SQL files (required)
 *
 * Examples:
 *   node scripts/update-db.js --remote --delete --db=landnotes-events-by-month-db --sql-dir=local_assets/sql/events_by_month_region/
 *   node scripts/update-db.js --remote --delete --db=landnotes-events-by-page-db --sql-dir=local_assets/sql/events_by_page_and_year/
 *   node scripts/update-db.js --remote --delete --db=landnotes-events-db --sql-dir=local_assets/sql/events/
 *   node scripts/update-db.js --remote --delete --db=landnotes-geo-db --sql-dir=local_assets/sql/places_db/
 *
 * Notes:
 *   - SQL files are read from the directory specified by --sql-dir
 *   - The script processes all .sql files in alphabetical order
 *   - If an error occurs, the script will retry after a 5-second delay
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if --remote flag is provided
const isRemote = process.argv.includes('--remote');
const executionMode = isRemote ? '--remote' : '';
console.log(`Running in ${isRemote ? 'remote' : 'local'} mode`);

// Check if --delete flag is provided
const deleteTables = process.argv.includes('--delete');
console.log(`Table deletion is ${deleteTables ? 'enabled' : 'disabled'}`);

// Parse the start-index parameter
const startIndexArg = process.argv.find((arg) => arg.startsWith('--start-index='));
const startIndex = startIndexArg ? parseInt(startIndexArg.split('=')[1], 10) || 0 : 0;
console.log(`Skipping first ${startIndex} files`);

// Parse the db parameter
const dbArg = process.argv.find((arg) => arg.startsWith('--db='));
if (!dbArg) {
	console.error('Error: Database name must be specified with --db=NAME');
	process.exit(1);
}
const dbName = dbArg.split('=')[1];
console.log(`Using database: ${dbName}`);

// Parse the sql-dir parameter
const sqlDirArg = process.argv.find((arg) => arg.startsWith('--sql-dir='));
if (!sqlDirArg) {
	console.error('Error: SQL directory must be specified with --sql-dir=PATH');
	process.exit(1);
}
const sqlDir = sqlDirArg.split('=')[1];
console.log(`Using SQL directory: ${sqlDir}`);

const files = fs
	.readdirSync(sqlDir)
	.filter((file) => file.endsWith('.sql'))
	.sort();
console.log(files);

// Only execute deletion commands if --delete flag is provided
if (deleteTables) {
	const tablesToDrop = ['geodata', 'places', 'events', 'pages', 'events_by_month_region', 'text_search'];

	console.log(`Dropping ${tablesToDrop.length} tables...`);

	for (let i = 0; i < tablesToDrop.length; i++) {
		const tableName = tablesToDrop[i];
		console.log(`Dropping table ${i + 1}/${tablesToDrop.length}: ${tableName}`);
		execSync(`npx wrangler d1 execute ${executionMode} ${dbName} --command "DROP TABLE IF EXISTS ${tableName};"`);
	}

	console.log('All tables dropped successfully.');
}

// Skip the first N files by using slice
const filesToProcess = files.slice(startIndex);
console.log(`Processing ${filesToProcess.length} out of ${files.length} files`);

// Convert to an async function to handle the retry delay
const processFiles = async () => {
	for (const file of filesToProcess) {
		const filePath = path.join(sqlDir, file);
		const command = `npx wrangler d1 execute ${executionMode} -y ${dbName} --file="${filePath}"`;
		console.log(`Executing ${filePath}...`);
		console.log(command);

		let success = false;
		try {
			execSync(command, { stdio: 'inherit' });
			success = true;
		} catch (error) {
			console.error(`Error executing ${filePath}:`, error.message);
			console.log('Waiting 5 seconds before retry...');

			// Wait 5 seconds before retry
			await new Promise((resolve) => setTimeout(resolve, 5000));

			console.log(`Retrying ${filePath}...`);
			try {
				execSync(command, { stdio: 'inherit' });
				success = true;
			} catch (retryError) {
				console.error(`Retry failed for ${filePath}:`, retryError.message);
			}
		}

		if (success) {
			console.log(`Successfully processed ${filePath}`);
		} else {
			console.error(`Failed to process ${filePath} after retry`);
		}
	}
};

// Execute the async function
processFiles().catch((error) => {
	console.error('Processing failed:', error);
	process.exit(1);
});
