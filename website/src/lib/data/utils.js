export async function queryWithCache({
  queries,
  queryFn,
  cachedQueries,
  resultId,
}) {
  const queriesInCache = queries.filter((query) => cachedQueries.has(query));

  const notInCache = queries.filter((query) => !cachedQueries.has(query));
  const cachedResults = queriesInCache
    .map((query) => cachedQueries.get(query))
    .filter((entry) => entry !== null);
  if (notInCache.length === 0) {
    return cachedResults;
  }

  const newResults = await queryFn(notInCache);
  newResults.forEach((newResult) => {
    cachedQueries.set(newResult[resultId], newResult);
  });
  notInCache.forEach((query) => {
    if (!cachedQueries.has(query)) {
      cachedQueries.set(query, null);
    }
  });
  return [...cachedResults, ...newResults];
}
