/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		let stmt
		let result
		switch (url.pathname) {
			case '/query/geo':
				
				const geokeys = await request.json();
			    // Process in batches of 80 if needed
			    const BATCH_SIZE = 80;
			    let allResults = { rowsRead: 0, results: [] };
			    
                // Helper function to execute a batch of geokeys
                async function executeGeoBatch(db, keys) {
                    const placeholders = keys.map(() => '?').join(',');
                    const stmt = db.prepare(
                        `SELECT * from geodata WHERE geokey IN (${placeholders})`
                    );
                    const result = await stmt.bind(...keys).all();
					console.log(result.meta.rows_read);
					return {results: result.results, rowsRead: result.meta.rows_read}
                }
                
			    if (geokeys.length <= BATCH_SIZE) {
			        // Process in a single batch
					allResults = await executeGeoBatch(env.geoDB, geokeys);
			    } else {
			        // Process in batches of 80
			        const batchPromises = [];
			        // Use array chunking pattern for more elegant batch processing
			        const batches = Array.from(
			            { length: Math.ceil(geokeys.length / BATCH_SIZE) },
			            (_, i) => geokeys.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
			        );
			        batches.forEach(batch => batchPromises.push(executeGeoBatch(env.geoDB, batch)));
			        const batchResults = await Promise.all(batchPromises);
			        for (const batchResult of batchResults) {
			            allResults.rowsRead += batchResult.rowsRead;
			            allResults.results = allResults.results.concat(batchResult.results);
			        }
			    }
     			
				return new Response(JSON.stringify(allResults), { headers: { "Content-Type": "application/json" } });
			case '/query/geo-text-search':
				// Text-based search using the fts5 table - optimized version
				const { searchText } = await request.json();
				
				// Escape special characters in the search text
				const escapedSearchText = searchText.replace(/[-"]/g, (match) => `"${match}"`);
				stmt = env.geoDB.prepare(
					"SELECT geodata.* " +
					"FROM geodata " +
					"JOIN (SELECT rowid " +
					"      FROM text_search " +
					"      WHERE text_search MATCH ? " +
					"      LIMIT 10) AS top_matches " +
					"ON geodata.rowid = top_matches.rowid "
				);
				result = await stmt.bind(escapedSearchText + (escapedSearchText.length > 2 ?  "*" : "")).all();
				return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
			case '/message':
				return new Response('Hello, World!');
			case '/random':
				return new Response(crypto.randomUUID());
			default:
				return new Response('Not Found', { status: 404 });
		}
	},
};
