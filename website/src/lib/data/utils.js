/**
 * Queries data with caching support to minimize redundant requests
 *
 * @param {Object} options - Query options
 * @param {Array<string|number>} options.queries - List of query identifiers to fetch
 * @param {Function} options.queryFn - Function to execute for queries not in cache
 * @param {Map} options.cachedQueries - Cache storage (Map) of previous query results
 * @param {string} options.resultId - Property name to use as the unique key for caching results
 * @returns {Promise<Array>} Combined results from cache and new queries
 */
export async function queryWithCache({
  queries,
  queryFn,
  cachedQueries,
  resultId,
}) {
  // Separate queries into those already in cache and those that need fetching
  const queriesInCache = queries.filter((query) => cachedQueries.has(query));
  const notInCache = queries.filter((query) => !cachedQueries.has(query));

  // Get results for queries that are in cache
  const cachedResults = queriesInCache
    .map((query) => cachedQueries.get(query))
    .filter((entry) => entry !== null);

  // If all queries were in cache, return only cached results
  if (notInCache.length === 0) {
    return cachedResults;
  }

  // Fetch new results for queries not in cache
  const newResults = await queryFn(notInCache);

  // Update cache with new results
  newResults.forEach((newResult) => {
    cachedQueries.set(newResult[resultId], newResult);
  });

  // Mark queries with no results as null in cache to avoid repeated fetching
  notInCache.forEach((query) => {
    if (!cachedQueries.has(query)) {
      cachedQueries.set(query, null);
    }
  });

  // Return combined results from cache and new queries
  return [...cachedResults, ...newResults];
}

export async function fetchFromBucket(path) {
  const bucketName = "landnotes-data-files";

  const endpoint = import.meta.env.DEV
    ? `/data/${path}`
    : `https://data.landnotes.org/${path}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${bucketName}/${path}: ${response.status}`
      );
    }
    return response.arrayBuffer();
  } catch (error) {
    console.error(`Error fetching data from bucket ${bucketName}:`, error);
    throw error;
  }
}
