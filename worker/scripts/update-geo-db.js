const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if --remote flag is provided
const isRemote = process.argv.includes('--remote');
const executionMode = isRemote ? '--remote' : '';
console.log(`Running in ${isRemote ? 'remote' : 'local'} mode`);

// Check if --delete flag is provided
const shouldDelete = process.argv.includes('--delete');
console.log(`Table deletion is ${shouldDelete ? 'enabled' : 'disabled'}`);

// Parse the start-index parameter
const startIndexArg = process.argv.find((arg) => arg.startsWith('--start-index='));
const startIndex = startIndexArg ? parseInt(startIndexArg.split('=')[1], 10) || 0 : 0;
console.log(`Skipping first ${startIndex} files`);

const sqlDir = 'local_assets/sql_dump';
const files = fs.readdirSync(sqlDir).filter((file) => file.endsWith('.sql'));
console.log(files);

// Only execute deletion commands if --delete flag is provided
if (shouldDelete) {
	execSync(`npx wrangler d1 execute ${executionMode} landnotes-geo-db --command "DROP TABLE IF EXISTS geodata;"`);
	execSync(`npx wrangler d1 execute ${executionMode} landnotes-geo-db --command "DROP TABLE IF EXISTS places;"`);
	execSync(`npx wrangler d1 execute ${executionMode} landnotes-geo-db --command "DROP TABLE IF EXISTS text_search;"`);
}

// Skip the first N files by using slice
const filesToProcess = files.slice(startIndex);
console.log(`Processing ${filesToProcess.length} out of ${files.length} files`);

// Convert to an async function to handle the retry delay
const processFiles = async () => {
	for (const file of filesToProcess) {
		const filePath = path.join(sqlDir, file);
		const command = `npx wrangler d1 execute ${executionMode} -y landnotes-geo-db --file="${filePath}"`;
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
