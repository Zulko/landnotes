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
		let result;
		switch (url.pathname) {
			case '/query/places-by-geokey':
				const geokeys = await request.json();
				results = await queryPlacesFromGeokeysByBatch(geokeys, env.geoDB);
				return resultsToResponse(results);
			case '/query/places-textsearch':
				const { searchText } = await request.json();
				result = await queryPlacesFromText(searchText, env.geoDB);
				return resultsToResponse(result);
			case '/query/events-by-month-region':
				const { monthRegions } = await request.json();
				results = await queryEventsByMonthRegion(monthRegions, env.geoDB);
				return resultsToResponse(results);
			case '/message':
				return new Response('Hello, World!');
			case '/random':
				return new Response(crypto.randomUUID());
			default:
				return new Response('Not Found', { status: 404 });
		}
	},
};

function resultsToResponse(results) {
	return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}

async function queryByBatch({ queryFn, params, db, batchSize = 80 }) {
	let allResults = { rowsRead: 0, results: [] };

	if (params.length <= batchSize) {
		return await queryFn(db, params);
	} else {
		const batchPromises = [];
		for (let i = 0; i < params.length; i += BATCH_SIZE) {
			const batch = params.slice(i, i + BATCH_SIZE);
			batchPromises.push(queryFn(batch, db));
		}
		const batchResults = await Promise.all(batchPromises);
		for (const batchResult of batchResults) {
			allResults.rowsRead += batchResult.rowsRead;
			allResults.results = allResults.results.concat(batchResult.results);
		}
		return allResults;
	}
}

async function queryPlacesFromGeokeys(geokeys, db) {
	const placeholders = geokeys.map(() => '?').join(',');
	const stmt = db.prepare(`SELECT * from geodata WHERE geokey IN (${placeholders})`);
	const result = await stmt.bind(...geokeys).all();
	console.log(result.meta.rows_read);
	return { results: result.results, rowsRead: result.meta.rows_read };
}

async function queryPlacesFromGeokeysByBatch(geokeys, geoDB) {
	return await queryByBatch({ queryFn: queryPlacesFromGeokeys, params: geokeys, db: geoDB });
}

async function queryPlacesFromText(searchText, geoDB) {
	const escapedSearchText = searchText.replace(/[-"]/g, (match) => `"${match}"`);
	stmt = geoDB.prepare(
		'SELECT geodata.* ' +
			'FROM geodata ' +
			'JOIN (SELECT rowid ' +
			'      FROM text_search ' +
			'      WHERE text_search MATCH ? ' +
			'      LIMIT 10) AS top_matches ' +
			'ON geodata.rowid = top_matches.rowid '
	);
	return await stmt.bind(escapedSearchText + (escapedSearchText.length > 2 ? '*' : '')).all();
	return result;
}

async function queryEventsByMonthRegion(monthRegions, eventsByMonthDB) {
	const placeholders = monthRegions.map(() => '?').join(',');
	const stmt = eventsByMonthDB.prepare(`SELECT * from events_by_month_region WHERE month_region IN (${placeholders})`);
	return await stmt.bind(...monthRegions).all();
}

async function queryEventsByMonthRegionByBatch(monthRegions, eventsByMonthDB) {
	return await queryByBatch({ queryFn: queryEventsByMonthRegion, params: monthRegions, db: eventsByMonthDB });
}
