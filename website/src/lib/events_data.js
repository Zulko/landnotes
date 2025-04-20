import { inflate } from "pako";

import { cachedDecodeHybridGeohash, queryWithCache } from "./geo/geodata";

async function queryEventsById(eventIds) {
  eventIds.sort();
  const response = await fetch("query/events-by-id", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventIds),
  });
  const queryJSON = await response.json();
  const entries = queryJSON.results;
  entries.forEach((entry) => {
    entry.geokeys = entry.geokeys.split("|");
    entry.locations_latlon = entry.geokeys.map(cachedDecodeHybridGeohash);
    entry.subevents = [];
  });
  return entries;
}

export async function getEventsById({ eventIds, cachedQueries }) {
  return await queryWithCache({
    queries: eventIds,
    queryFn: queryEventsById,
    cachedQueries,
    resultId: "event_id",
  });
}
