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
    getGeodataFromGeokeys,
  } from "./lib/geo/geodata";

  // -------------------------
  // STATE MANAGEMENT
  // -------------------------

  /**
   * Map configuration and state
   */
  const stateDefaults = {
    mode: "places",
    strictDate: true,
    date: { year: 1810, month: 3, day: "all"},
    zoom: 1,
    location: null,
    selectedMarkerId: null
  }

  let appState = $state(null);
  


  /**
   * UI state
   */
  let isMobile = $state(false);
  let isPaneOpen = $state(false);
  let previousPaneState = $state(false);
  let previousSelectedMarkerId = $state(null);
  /**
   * Content state
   */
  let mapEntries = $state([]);
  let mapDots = $state([]);
  let mapComponent;
  let wikiPage = $state("");
  let cachedEntries = $state(new Map());

  // Add a flag to track when we're handling a popstate event
  let isHandlingPopstate = false;
  // Track initial page load
  let isInitialLoad = true;

  // -------------------------
  // LIFECYCLE HOOKS
  // -------------------------

  onMount(async () => {
    console.log("App starting!");
    handleResize(); // Initialize mobile detection
    
    // Read URL parameters when the app loads
    const urlState = readURLParams();
    appState = {...stateDefaults, ...urlState};
    if (urlState.location) {
      mapComponent.goTo({location: urlState.location, zoom: urlState.zoom, flyDuration: 0})
    } else {
      mapComponent.goTo({location: {lat: 0, lon: 0}, zoom: 3, flyDuration: 0})
    }
    
    // Add history navigation handler
    window.addEventListener("popstate", handlePopState);
    
    // Wait a bit and then mark initialization as complete
    setTimeout(() => {
      isInitialLoad = false;
      // Replace the initial history entry instead of adding a new one
      updateURLParams($state.snapshot(appState), false);
    }, 100);
  });

  // When pane state changes, update map size after a slight delay to allow transitions



  $effect(() => {
    debounce((s) => updateURLParamsOnStateChange(s), 500)($state.snapshot(appState));
  });

    function onPaneClose() {
    appState = {...appState, selectedMarkerId: null};
    setTimeout(() => mapComponent.invalidateMapSize(), 50);
  };

  function updateURLParamsOnStateChange(appState) {
    console.log("state changed", appState);
    // Only update URL if not handling popstate and not in initial load
    if (!isHandlingPopstate && !isInitialLoad) {
      console.log("Updating URL params with history", appState);
      updateURLParams(appState, true);
    } else {
      console.log("Updating URL params without history", appState);
      // Still update the URL, but don't add to history
      updateURLParams(appState, false);
    }
  }

  // -------------------------
  // EVENT HANDLERS
  // -------------------------

  async function handleNewSelectedMarker(selectedMarkerId) {

    console.log("handleNewSelectedMarker");
    if (selectedMarkerId === appState.selectedMarkerId) return;
    appState = {...appState, selectedMarkerId}
    
    let newMarkers;
    if (selectedMarkerId) {
      const query = await getGeodataFromGeokeys([selectedMarkerId], cachedEntries);
      const selectedMarker = query[0];
      openWikiPane(selectedMarker.page_title);
      if (!mapEntries.some(marker => marker.geokey === selectedMarkerId)) {
        newMarkers = [...mapEntries, selectedMarker];
      } else {
        newMarkers = [...mapEntries];
      }
    }
    else {
      closeWikiPane();
      newMarkers = [...mapEntries];
      
    }
    
    addMarkerClasses(newMarkers, appState.zoom)
    mapEntries = newMarkers
    
  }

  /**
   * Handle browser history navigation
   */
  function handlePopState(ev: PopStateEvent) {
    console.log("handlePopState", ev.state);
    isHandlingPopstate = true;
    
    // If state is null, use defaults
    if (!ev.state) {
      console.warn("No state in popstate event, using defaults");
      appState = {...stateDefaults};
    } else {
      appState = ev.state;
    }
    
    if (appState.location) {
      mapComponent.goTo({location: appState.location, zoom: appState.zoom, flyDuration: 0})
    }
    
    // Reset the flag after a brief timeout to allow the state update to complete
    setTimeout(() => { 
      isHandlingPopstate = false;
      console.log("Popstate handling complete");
    }, 100);
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
  async function onMapBoundsChange({bounds, center, zoom}) {
    console.log("onMapBoundsChange");
    const location = {lat: center.lat, lon: center.lng}
    appState = {...appState, zoom, location}

    // Fetch geodata for the current bounds
    try {
      const {entriesInBounds, dotMarkers} = await getGeodataFromBounds(
        bounds,
        zoom - 1,
        cachedEntries
      );
      if (
        appState.selectedMarkerId &&
        !entriesInBounds.some((entry) => entry.geokey === appState.selectedMarkerId)
      ) {
        const selectedMarker = await getGeodataFromGeokeys([appState.selectedMarkerId], cachedEntries);
        entriesInBounds.push(selectedMarker[0]);
      }

      // Update markers with display classes
      addMarkerClasses(entriesInBounds, zoom);
      mapEntries = entriesInBounds;
      mapDots = dotMarkers;
    } catch (error) {
      console.error("Error fetching geodata:", error);
    }
  }

  /**
   * Handle marker click events
   */
  function onMarkerClick({geokey, lat, lon}) {
    const selectedMarkerId = geokey;
    const location = {lat, lon}
    if (appState.selectedMarkerId !== selectedMarkerId) {
      setTimeout(() => {
        handleNewSelectedMarker(selectedMarkerId)
      }, 100)
      mapComponent.goTo({location, zoom: appState.zoom, flyDuration: 0.4})
    } else {
      const newZoom = Math.min(17, Math.max(12, appState.zoom + 2))
      mapComponent.goTo({location, zoom: newZoom, flyDuration: 0.4})
    }
  }

  /**
   * Handle search selection
   */
  function onSearchSelect({geokey, lat, lon}) {
    handleNewSelectedMarker(geokey)
    mapComponent.goTo({location: {lat, lon}, zoom: Math.max(12, appState.zoom), flyDuration: 1})
  }

  // -------------------------
  // HELPER FUNCTIONS
  // -------------------------

  /**
   * Opens the wiki pane with the specified page
   */
  function openWikiPane(pageTitle) {
    wikiPage = pageTitle;
    isPaneOpen = true;
  }

  function closeWikiPane() {
    wikiPage = "";
    isPaneOpen = false;
  }

  /**
   * Debounce function to limit how often a function is called
   * @param func The function to debounce
   * @param wait Wait time in milliseconds
   * @returns Debounced function
   */
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  /**
   * Classify markers for display based on importance and zoom level
   */
  function addMarkerClasses(entries, zoomLevel) {
    // Sort entries by page length in descending order

    // Assign default display classes based on the sorted order
    // Handle selected and high-zoom markers
    for (const entry of entries) {
      if (appState.selectedMarkerId && entry.geokey == appState.selectedMarkerId) {
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

<main class:has-open-pane={isPaneOpen} class:is-mobile={isMobile}>
  <div class="content-container">
    <div class="wiki-pane-container">
      <SlidingPane {onPaneClose} page_title={wikiPage} />
    </div>

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
          mode={appState?.mode}
          date={appState?.date}
          strictDate={appState?.strictDate}
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
    transition: flex 0.3s ease;
    height: 100%;
    z-index: 100;
  }

  .map-container {
    flex: 1;
    height: 100%;
    z-index: 50;
    position: relative;
  }

  /* When pane is open on desktop */
  main.has-open-pane:not(.is-mobile) .wiki-pane-container {
    flex: 0 0 400px; /* Default width, will be adjusted by SlidingPane component */
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
