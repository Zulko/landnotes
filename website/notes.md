every time the event parameters change,

- get all the missing event data dumps for the months and regions at hand and depending on regions (boundaries)
- store the month-region results in cachedEventsByMonthRegion
- For each region, build a LOD geokey system that is specific to the date parameters by
  - Assigning a score to each event depending on how far they are from the date.
  - Building the hybrid geotree where the best events get to go first to get the best geokeys
  - Storing the geotrees under geotreesByRegion["a"]
- Every time the date parameters change
- download whichever month-region results are missing for the regions in current bounds. Cache these
- compute again all the geotrees for all the regions at hand.
- Every time the bounds change:
  - Download the missing month-region results for the new regions, cache them.
  - Compute the geotrees for these new regions only.

These functions and their cache probably live in a webworker.

page side (in App.js):

```python

cachedEvents = Map()


async def getEventsFromWorker():
  requestId = `query_${Date.now()}_${Math.random()}`
    const queryPromise = new Promise((resolve, reject) => {
    window.eventsWorkerPromises[requestId] = { resolve, reject };
  });
  window.postMessage("getEventIdsForGeokeys", {geokeys, date, strictDate});
  return await queryPromise


async def getEvents(bounds, zoom, date, strictDate):
  events = await getEventsFromWorker(bounds, zoom, date, strictDate)
  eventsById = {event.id: event for event in events}
  eventsWithInfo = queryEventsById(eventsById.keys(), cachedEvents)
  for event in eventsWithInfo:
    eventsById[event.id] = {...eventsById[event.id], event}
  markers = eventsById.values()
  dotMarkers = events.map(event=> event.subevents).flat()
```

Worker pseudo code (should be javascript):

```python

currentDate = None
currentStrictDate = None
processedRegions = Set()
cachedEventsByMonthRegion = Map()
eventsByGeoKeyForDate = Map()


self.addEventListener('message', async (event) => {
  if (event.data.type === "getEventIdsForGeokeys"):
    const { geokeys, date, strictDate } = event.data;
    const events = await getEventsForGeokeys(geokeys, date, strictDate);
})

async def getEventsForGeokeys(geokeys, date, strictDate):
  if currentDate != date or currentStrictDate != strictDate:
    # reset the computed events geokeys!
    currentDate = date
    currentStrictDate = strictDate
    eventsByGeoKeyForDate = Map()
  regions = set([g[0] for g in geokeys])
  missing_regions = [r for r in regions if r not in processedRegions]
  # regions with empty geotrees simply receive {}
  await Promise.all([processRegion(region, date, strictDate) for region in missing_regions])
  events = [eventsByGeoKeyForDate[g] for g in geokeys]
  return events

async def processRegion(region, date, strictDate):
  months = getMonths(date, strictDate)
  missing_month_regions = [region + month in months]
  events = await getEvents({missing_month_regions, cachedQueries: cachedEventsByMonthRegion})
  assignGeokeysToEvents(events, date, strictDate)

def assignGeokeysToEvents(events, date, strictDate):

  # sort the events by order of proximity to the date
  for event in events:
    event.score = scoreEventByProximityToDate(event, date, strictDate)
  events.sort(key=lambda e: e.score, reverse=True)

  for event in events:
    prefix = ""
    for char in event.geohash:
      prefix += char

      if prefix not in eventsByGeoKeyForDate:
        eventsByGeoKeyForDate[prefix] = {event, subevents: [], same_location_events: []}
      else:
        event_for_geokey = eventsByGeoKeyForDate[prefix]
        if len(event_for_geokey["subevents"]) < 10:
          event_for_geokey["subevents"].append(event)
        if event.geohash == event_for_geokey["event"].geohash:
          event_for_geokey["same_location_events"].append(event)


def scoreEventByProximityToDate(event, date, strictDate):
  # sum the difference beteen the event start date and the date and also end date
  score = (event.start_date - date).days + (event.end_date - date).days
  return score
```
