import { inflate } from "pako";
import { queryWithCache } from "./utils";

const pageEventsCache = new Map();

async function queryPageEventsLists(pageTitles) {
  try {
    const response = await fetch("query/events-by-page", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pageTitles),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }

    const queryJSON = await response.json();
    const eventsByPage = queryJSON.results.map((result) => {
      const decodedData = atob(result.zlib_json_blob);
      const compressedData = new Uint8Array(
        Array.from(decodedData, (c) => c.charCodeAt(0))
      );
      const decompressed = inflate(compressedData, { to: "string" });
      const events = JSON.parse(decompressed);
      const page_title = result.page_title;
      return { page_title, events };
    });
    return eventsByPage;
  } catch (error) {
    console.error("Error fetching page events:", error);
    return [];
  }
}

export async function getPageEvents(pageTitle) {
  const eventsByPage = await queryWithCache({
    queries: [pageTitle],
    queryFn: queryPageEventsLists,
    cachedQueries: pageEventsCache,
    resultId: "page_title",
  });
  console.log("eventsByPage", eventsByPage);
  return eventsByPage[0].events;
}
