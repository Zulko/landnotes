<script lang="ts">
  // -------------------------
  // IMPORTS
  // -------------------------
  // Svelte lifecycle
  import { onMount } from "svelte";

  // Components
  import WorldMap from "./lib/WorldMap.svelte";
  import SlidingPane from "./lib/SlidingPane.svelte";
  import SearchBar from "./lib/SearchBar.svelte";

  // Utilities
  import { updateURLParams, readURLParams } from "./lib/urlState";
  import {
    getGeodataFromBounds,
    getPlaceDataFromGeokeys,
  } from "./lib/geo/geodata";
  import * as eventsWorkerClient from "./lib/events_worker_client";
  import { getEventsById } from "./lib/events_data";
  // -------------------------
  // STATE VARIABLES & DEFAULTS
  // -------------------------
  const stateDefaults = {
    mode: "places",
    strictDate: true,
    date: { year: 1810, month: 3, day: "all" },
    zoom: 1,
    location: null,
    selectedMarkerId: null,
  };

  let mapBounds = $state({});
  let appState = $state(stateDefaults);
  let mapEntries = $state([]);
  let mapDots = $state([]);
  let wikiPage = $state("");
  let dontPushToHistory = $state(false);
  let isMobile = $state(false);

  let mapComponent;
  let cachedPlaceData = new Map();
  let cachedEventsById = new Map();
  // -------------------------
  // LIFECYCLE HOOKS
  // -------------------------
  onMount(async () => {
    console.log("App starting!");
    handleResize(); // Initialize mobile detection
    setStateFromURLParams();
    window.addEventListener("popstate", setStateFromURLParams);
  });

  $effect(() => {
    debouncedUpdateURLParams($state.snapshot(appState));
  });

  $effect(() => {
    console.log("TRIGGERED");
    if (!Object.keys(mapBounds).length) return;
    if (appState.mode === "events") {
      updateMarkersWithEventsData({
        mapBounds: $state.snapshot(mapBounds),
        zoom: appState.zoom,
        date: $state.snapshot(appState.date),
        strictDate: appState.strictDate,
      });
    } else {
      updateMarkersWithGeoData({
        mapBounds: $state.snapshot(mapBounds),
        zoom: appState.zoom,
      });
    }
  });

  // -------------------------
  // HELPER FUNCTIONS
  // -------------------------
  /**
   * Debounce function to limit how often a function is called
   */
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // -------------------------
  // STATE MANAGEMENT FUNCTIONS
  // -------------------------
  /**
   * Initialize app state from URL parameters
   */
  function setStateFromURLParams() {
    dontPushToHistory = true;
    const urlState = readURLParams();
    if (urlState.selectedMarkerId) {
      handleNewSelectedMarker(urlState.selectedMarkerId);
    }
    appState = { ...stateDefaults, ...urlState };

    if (urlState.location) {
      mapComponent.goTo({
        location: urlState.location,
        zoom: urlState.zoom,
        flyDuration: 0.3,
      });
    } else {
      mapComponent.goTo({
        location: { lat: 0, lon: 0 },
        zoom: 3,
        flyDuration: 0.3,
      });
    }

    setTimeout(() => {
      dontPushToHistory = false;
    }, 3000);
  }

  /**
   * Update URL parameters when state changes
   */
  function updateURLParamsOnStateChange(appState) {
    if (dontPushToHistory) return;
    updateURLParams(appState, true);
  }

  const debouncedUpdateURLParams = debounce(updateURLParamsOnStateChange, 500);

  // -------------------------
  // EVENT HANDLERS
  // -------------------------

  /**
   * Handle closing of the sliding pane
   */
  function onPaneClose() {
    appState.selectedMarkerId = null;
    handleNewSelectedMarker(null);
    setTimeout(() => mapComponent.invalidateMapSize(), 50);
  }

  /**
   * Update mobile status based on window size
   */
  function handleResize() {
    isMobile = window.innerWidth <= 768;
  }

  /**
   * Process map bounds changes and fetch new markers
   */
  function onMapBoundsChange({ bounds, center, zoom }) {
    mapBounds = bounds;
    appState.zoom = zoom;
    appState.location = { lat: center.lat, lon: center.lng };
  }

  async function updateMarkersWithGeoData({ mapBounds, zoom }) {
    const { entriesInBounds, dotMarkers } = await getGeodataFromBounds({
      bounds: mapBounds,
      maxZoomLevel: zoom - 1,
      cachedQueries: cachedPlaceData,
    });

    // Make sure the selected marker is included
    if (
      appState.selectedMarkerId &&
      !entriesInBounds.some(
        (entry) => entry.geokey === appState.selectedMarkerId
      )
    ) {
      const selectedMarker = await getPlaceDataFromGeokeys({
        geokeys: [appState.selectedMarkerId],
        cachedQueries: cachedPlaceData,
      });
      entriesInBounds.push(selectedMarker[0]);
    }

    // Update markers with display classes
    addMarkerClasses(entriesInBounds, appState.zoom);
    mapEntries = entriesInBounds;
    mapDots = dotMarkers;
  }

  async function updateMarkersWithEventsData({
    mapBounds,
    zoom,
    date,
    strictDate,
  }) {
    const { events, dotEvents } =
      await eventsWorkerClient.getEventsForBoundsAndDate({
        date,
        bounds: mapBounds,
        zoom: zoom - 1,
        strictDate,
      });
    const eventInfos = await getEventsById({
      eventIds: events.map((event) => event.event_id),
      cachedQueries: cachedEventsById,
    });
    console.log({ eventInfos });
    const eventInfosById = new Map(
      eventInfos.map((eventInfo) => [eventInfo.event_id, eventInfo])
    );
    const eventsWithInfos = events.map((event) => ({
      ...eventInfosById.get(event.event_id),
      ...event,
    }));
    addMarkerClasses(eventsWithInfos, appState.zoom);
    console.log({ eventInfosById, eventsWithInfos, dotEvents });
    mapEntries = eventsWithInfos;
    mapDots = dotEvents;
  }

  /**
   * Handle marker click events
   */
  function onMarkerClick({ geokey, lat, lon }) {
    const selectedMarkerId = geokey;
    const location = { lat, lon };

    if (appState.selectedMarkerId !== selectedMarkerId) {
      handleNewSelectedMarker(selectedMarkerId);
      appState.selectedMarkerId = selectedMarkerId;
      mapComponent.goTo({ location, zoom: appState.zoom, flyDuration: 0.3 });
    } else {
      const newZoom = Math.min(17, Math.max(12, appState.zoom + 2));
      mapComponent.goTo({ location, zoom: newZoom, flyDuration: 0.4 });
    }
  }

  /**
   * Handle search selection
   */
  function onSearchSelect({ geokey, lat, lon }) {
    const selectedMarkerId = geokey;
    if (appState.selectedMarkerId !== selectedMarkerId) {
      handleNewSelectedMarker(selectedMarkerId);
      appState.selectedMarkerId = selectedMarkerId;
    }
    mapComponent.goTo({
      location: { lat, lon },
      zoom: Math.max(12, appState.zoom),
      flyDuration: 1,
    });
  }

  // -------------------------
  // MARKER MANAGEMENT FUNCTIONS
  // -------------------------
  /**
   * Update the selected marker and associated data
   */
  async function handleNewSelectedMarker(selectedMarkerId) {
    if (selectedMarkerId === appState.selectedMarkerId) return;

    let newMarkers;
    if (selectedMarkerId) {
      const query = await getPlaceDataFromGeokeys({
        geokeys: [selectedMarkerId],
        cachedQueries: cachedPlaceData,
      });
      const selectedMarker = query[0];
      wikiPage = selectedMarker.page_title;

      if (!mapEntries.some((marker) => marker.geokey === selectedMarkerId)) {
        newMarkers = [...mapEntries, selectedMarker];
      } else {
        newMarkers = [...mapEntries];
      }
    } else {
      newMarkers = [...mapEntries];
    }

    addMarkerClasses(newMarkers, appState.zoom);
    mapEntries = newMarkers;
  }

  /**
   * Classify markers for display based on importance and zoom level
   */
  function addMarkerClasses(entries, zoomLevel) {
    for (const entry of entries) {
      if (
        appState.selectedMarkerId &&
        entry.geokey == appState.selectedMarkerId
      ) {
        entry.displayClass = "selected";
      } else if (zoomLevel > 17 || entry.geokey.length <= zoomLevel - 2) {
        entry.displayClass = "full";
      } else if (entry.geokey.length <= zoomLevel - 1) {
        entry.displayClass = "reduced";
      } else {
        entry.displayClass = "dot";
      }
    }
    return entries;
  }
</script>

<svelte:window on:resize={handleResize} />

<main class:is-mobile={isMobile} tabindex="-1" data-focus-target id="main">
  <div class="content-container">
    {#if appState.selectedMarkerId}
      <div class="wiki-pane-container">
        <SlidingPane {onPaneClose} {wikiPage} />
      </div>
    {/if}

    <div class="map-container">
      <WorldMap
        bind:this={mapComponent}
        {mapEntries}
        {mapDots}
        {onMapBoundsChange}
        {onMarkerClick}
      />
      <div class="search-wrapper">
        <SearchBar
          {onSearchSelect}
          bind:mode={appState.mode}
          bind:date={appState.date}
          bind:strictDate={appState.strictDate}
        />
      </div>
    </div>
  </div>
</main>

<style>
  main {
    width: 100%;
    height: 100vh;
    padding: 0;
    margin: 0;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .content-container {
    display: flex;
    width: 100%;
    height: 100%;
    flex: 1;
  }

  .wiki-pane-container {
    flex: 0 0 0;
    transition: flex 1s ease;
    height: 100%;
    z-index: 100;
  }

  .map-container {
    flex: 1;
    height: 100%;
    z-index: 50;
    position: relative;
  }

  /* Mobile layout */
  main.is-mobile .content-container {
    flex-direction: column;
  }

  main.is-mobile .wiki-pane-container {
    flex: 0 0 0;
    order: 2; /* Put wiki pane at the bottom */
  }

  main.is-mobile .map-container {
    order: 1; /* Put map at the top */
    flex: 1;
  }

  /* Mobile adjustments for search bar */
  main.is-mobile .search-wrapper {
    top: 3px;
    width: 90%;
    padding: 0;
  }

  .search-wrapper {
    position: absolute;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    max-width: 500px;
    z-index: 1000;
    background-color: none;
    border-radius: 20px;
    padding: 5px;
  }
</style>
