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
				result = await queryPlacesFromGeokeysByBatch(geokeys, env.geoDB);
				return resultsToResponse(result);
			case '/query/places-textsearch':
				const { searchText } = await request.json();
				result = await queryPlacesFromText(searchText, env.geoDB);
				return resultsToResponse(result);
			case '/query/events-by-month-region':
				const monthRegions = await request.json();
				console.log(monthRegions);
				result = await queryEventsByMonthRegionByBatch(monthRegions, env.eventsByMonthDB);
				console.log(result);
				return resultsToResponse(result);
			case '/query/events-by-id':
				const eventIds = await request.json();
				result = await queryEventsByIdByBatch(
					eventIds.map((id) => id.replace(' ', '_')),
					env.eventsDB
				);
				return resultsToResponse(result);
			case '/query/events-by-page':
				const pageTitles = await request.json();
				result = await queryEventsByPage(pageTitles, env.eventsByPageDB);
				return resultsToResponse(result);
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
		return await queryFn(params, db);
	} else {
		const batchPromises = [];
		for (let i = 0; i < params.length; i += batchSize) {
			const batch = params.slice(i, i + batchSize);
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
	const stmt = db.prepare(`SELECT * from places WHERE geokey IN (${placeholders})`);
	const result = await stmt.bind(...geokeys).all();
	// Cloudflare returns zipped blobs as int arrays which isn't great forJSON, so let's
	// convert them to base64 strings
	result.results.forEach((entry) => {
		const dots = entry.dots;
		if (dots) {
			entry.dots = btoa(String.fromCharCode(...dots));
		}
	});
	console.log(result.meta.rows_read);
	return { results: result.results, rowsRead: result.meta.rows_read };
}

async function queryPlacesFromGeokeysByBatch(geokeys, geoDB) {
	return await queryByBatch({ queryFn: queryPlacesFromGeokeys, params: geokeys, db: geoDB });
}

async function queryPlacesFromText(searchText, geoDB) {
	const escapedSearchText = searchText.replace(/[-"]/g, (match) => `"${match}"`);
	const stmt = geoDB.prepare(
		'SELECT places.* ' +
			'FROM places ' +
			'JOIN (SELECT rowid ' +
			'      FROM text_search ' +
			'      WHERE text_search MATCH ? ' +
			'      LIMIT 10) AS top_matches ' +
			'ON places.rowid = top_matches.rowid '
	);
	return await stmt.bind(escapedSearchText + (escapedSearchText.length > 2 ? '*' : '')).all();
}

async function queryEventsByMonthRegion(monthRegions, eventsByMonthDB) {
	const placeholders = monthRegions.map(() => '?').join(',');
	const stmt = eventsByMonthDB.prepare(`SELECT * from events_by_month_region WHERE month_region IN (${placeholders})`);
	const result = await stmt.bind(...monthRegions).all();
	return { results: result.results, rowsRead: result.meta.rows_read };
}

async function queryEventsByMonthRegionByBatch(monthRegions, eventsByMonthDB) {
	return await queryByBatch({ queryFn: queryEventsByMonthRegion, params: monthRegions, db: eventsByMonthDB });
}

async function queryEventsById(eventIds, eventsDB) {
	const placeholders = eventIds.map(() => '?').join(',');
	const stmt = eventsDB.prepare(`SELECT * from events WHERE event_id IN (${placeholders})`);
	const result = await stmt.bind(...eventIds).all();
	return { results: result.results, rowsRead: result.meta.rows_read };
}

async function queryEventsByIdByBatch(eventIds, eventsDB) {
	return await queryByBatch({ queryFn: queryEventsById, params: eventIds, db: eventsDB });
}

async function queryEventsByPage(pageTitles, eventsByPageDB) {
	const placeholders = pageTitles.map(() => '?').join(',');
	const stmt = eventsByPageDB.prepare(`SELECT * from pages WHERE page_title IN (${placeholders})`);
	const result = await stmt.bind(...pageTitles).all();
	result.results.forEach((entry) => {
		entry.zlib_json_blob = btoa(String.fromCharCode(...entry.zlib_json_blob));
	});
	return { results: result.results, rowsRead: result.meta.rows_read };
}
