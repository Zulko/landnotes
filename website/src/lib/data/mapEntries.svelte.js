/**
 * Map Entries Management Module
 *
 * This module is responsible for updating the map entries (markers and dots) in response to
 * changes in the application state and map bounds. It handles:
 *
 * - Fetching and displaying place data when in "places" mode
 * - Fetching and displaying event data when in "events" mode
 * - Maintaining cached data to improve performance
 * - Updating marker display classes based on selection state
 * - Synchronizing map entries with the current view parameters (zoom, bounds, date filters)
 *
 * The module uses Svelte's reactive system to automatically update the map when relevant
 * state changes occur, such as mode switches, date changes, or map movement.
 */

import { appState, uiState } from "../appState.svelte";
import { getPlaceDataFromGeokeys, getGeodataFromBounds } from "./places_data";
import { getEventsById, getEventsForBoundsAndDate } from "./events_data";

export const mapEntries = $state({ markerInfos: [], dots: [] });
export const mapBounds = $state({});

let cachedPlaceData = new Map();
let placeEntriesRequestId = 0;
let eventEntriesRequestId = 0;
let selectedMarkerRequestId = 0;
let handledSelectedMarkerId = null;

$effect.root(() => {
  $effect(() => {
    handleNewSelectedMarker(appState.selectedMarkerId);
  });
  $effect(() => {
    const _mapBounds = $state.snapshot(mapBounds);
    if (Object.keys(_mapBounds).length === 0) return;
    if (appState.mode === "events") {
      const { zoom, date, strictDate } = appState;
      const _date = $state.snapshot(date);
      updateMapEventEntries({
        zoom,
        date: _date,
        mapBounds: _mapBounds,
        strictDate,
      });
    }
  });
  $effect(() => {
    const _mapBounds = $state.snapshot(mapBounds);
    if (Object.keys(_mapBounds).length === 0) return;
    if (appState.mode === "places") {
      const { zoom } = appState; // variables observed + mapBounds
      updateMapPlaceEntries({ zoom, mapBounds: _mapBounds });
    }
  });
});

/**
 * Fetches and updates map markers with geographical data based on the current map bounds and zoom level.
 * @param {Object} options - The options object
 * @param {Object} options.mapBounds - The current bounds of the map view
 * @param {number} options.zoom - The current zoom level of the map
 */
async function updateMapPlaceEntries({ mapBounds, zoom }) {
  const requestId = ++placeEntriesRequestId;
  const willBeLoadingTimeOut = setTimeout(() => {
    uiState.dataIsLoading = true;
  }, 500);
  try {
    const { entryInfos, dots } = await getGeodataFromBounds({
      bounds: mapBounds,
      maxZoomLevel: zoom - 1,
      cachedQueries: cachedPlaceData,
    });

    if (requestId !== placeEntriesRequestId || appState.mode !== "places") {
      return;
    }

    // Make sure the selected marker is included
    if (
      appState.selectedMarkerId &&
      !entryInfos.some((entry) => entry.geokey === appState.selectedMarkerId)
    ) {
      const selectedMarker = await getPlaceDataFromGeokeys({
        geokeys: [appState.selectedMarkerId],
        cachedQueries: cachedPlaceData,
      });
      if (requestId !== placeEntriesRequestId || appState.mode !== "places") {
        return;
      }
      if (selectedMarker[0]) {
        entryInfos.push(selectedMarker[0]);
      }
    }
    updateMapEntriesFromQueryResults({ entryInfos, dots });
  } catch (error) {
    if (requestId === placeEntriesRequestId) {
      console.error("Error updating place map entries:", error);
    }
  } finally {
    clearTimeout(willBeLoadingTimeOut);
    if (requestId === placeEntriesRequestId && appState.mode === "places") {
      uiState.dataIsLoading = false;
    }
  }
}

/**
 * Fetches and updates map markers with event data based on the current map bounds, zoom level, date, and strict date.
 * @param {Object} options - The options object
 * @param {Object} options.mapBounds - The current bounds of the map view
 * @param {number} options.zoom - The current zoom level of the map
 * @param {Object} options.date - The current date of the map
 * @param {boolean} options.strictDate - Whether to use strict date filtering
 * @returns {Promise<Object>} - Object containing event information and dots for the map
 */
async function updateMapEventEntries({ mapBounds, zoom, date, strictDate }) {
  const requestId = ++eventEntriesRequestId;
  const willBeLoadingTimeOut = setTimeout(() => {
    uiState.dataIsLoading = true;
  }, 500);
  try {
    const { events, dotEvents } = await getEventsForBoundsAndDate({
      date,
      bounds: mapBounds,
      zoom: zoom - 1,
      strictDate,
    });
    if (requestId !== eventEntriesRequestId || appState.mode !== "events") {
      return;
    }

    const eventIds = events.map((event) => event.event_id);
    const eventInfos = await getEventsById(eventIds);
    if (requestId !== eventEntriesRequestId || appState.mode !== "events") {
      return;
    }

    const eventInfosById = new Map(
      eventInfos.map((eventInfo) => [eventInfo.event_id, eventInfo])
    );

    const eventsWithInfos = events.map((event) => {
      const eventInfo = eventInfosById.get(event.event_id) || {};
      return { ...eventInfo, ...event };
    });

    updateMapEntriesFromQueryResults({
      entryInfos: eventsWithInfos,
      dots: dotEvents,
    });
  } catch (error) {
    if (requestId === eventEntriesRequestId) {
      console.error("Error updating event map entries:", error);
    }
  } finally {
    clearTimeout(willBeLoadingTimeOut);
    if (requestId === eventEntriesRequestId && appState.mode === "events") {
      uiState.dataIsLoading = false;
    }
  }
}

function updateMapEntriesFromQueryResults({ entryInfos, dots }) {
  const normalizedInfos = entryInfos.map(normalizeMapEntryInfo);
  const preExistingEntries = mapEntries.markerInfos.filter((entry) =>
    normalizedInfos.some((e) => e.id === entry.id)
  );
  const newEntries = normalizedInfos.filter(
    (entry) => !mapEntries.markerInfos.some((e) => e.id === entry.id)
  );
  const allMarkerInfos = [...preExistingEntries, ...newEntries];
  updateDisplayClasses(allMarkerInfos);
  mapEntries.markerInfos = allMarkerInfos;
  mapEntries.dots = dots;
}

function updateDisplayClasses(entries) {
  const selectedId = appState.selectedMarkerId;
  for (const entry of entries) {
    if (selectedId && entry.id == selectedId) {
      entry.displayClass = "selected";
    } else if (appState.zoom > 17 || entry.geokey.length <= appState.zoom - 2) {
      entry.displayClass = "full";
    } else if (entry.geokey.length <= appState.zoom - 1) {
      entry.displayClass = "reduced";
    } else {
      entry.displayClass = "dot";
    }
  }
}

async function handleNewSelectedMarker(selectedMarkerId) {
  if (selectedMarkerId === handledSelectedMarkerId) return;
  const requestId = ++selectedMarkerRequestId;

  if (!selectedMarkerId) {
    handledSelectedMarkerId = null;
    // a marker got deselected. Let's just update the display classes
    updateDisplayClasses(mapEntries.markerInfos);
    mapEntries.markerInfos = [...mapEntries.markerInfos];
    return;
  }

  const selectedMode = appState.mode;
  let query;
  if (selectedMode === "places") {
    query = await getPlaceDataFromGeokeys({
      geokeys: [selectedMarkerId],
      cachedQueries: cachedPlaceData,
    });
  } else {
    query = await getEventsById([selectedMarkerId]);
  }

  if (
    requestId !== selectedMarkerRequestId ||
    selectedMarkerId !== appState.selectedMarkerId ||
    selectedMode !== appState.mode ||
    !query[0]
  ) {
    return;
  }

  const selectedMarker = normalizeMapEntryInfo(query[0]);
  handledSelectedMarkerId = selectedMarkerId;
  appState.wikiSection = selectedMarker.page_section;
  appState.wikiPage = selectedMarker.pageTitle;
  appState.paneTab = "wikipedia";
  const newMarkers = [...mapEntries.markerInfos];
  if (
    !mapEntries.markerInfos.some((marker) => marker.id === selectedMarkerId)
  ) {
    newMarkers.push(selectedMarker);
  }
  updateDisplayClasses(newMarkers);
  mapEntries.markerInfos = newMarkers;
}

/**
 * Adapts marker data to a consistent format regardless of type (place or event)
 * @param {Object} entry - Original data entry
 * @returns {Object} - Normalized marker data
 */
export function normalizeMapEntryInfo(entry) {
  // Determine marker type
  const isEvent = Boolean(entry.when);

  // Return a normalized object with consistent property names
  const pageTitle = entry.page_title
    ? entry.page_title.replaceAll("_", " ")
    : "";
  return {
    ...entry,
    id: isEvent ? entry.event_id : entry.geokey,
    name: entry.name || pageTitle,
    pageTitle,
    displayClass: entry.displayClass || "dot",
    category: entry.category || "other",
    isEvent,
  };
}
