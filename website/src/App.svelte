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
  let state
  
  const stateDefaults = {
    mode: "places",
    strictDate: true,
    date: { year: 1810, month: 3, day: "all"},
    zoom: 1,
    location: null,
    selectedMarkerId: null
  }

  /**
   * UI state
   */
  let isMobile = false;
  let isPaneOpen = false;
  let previousPaneState = false;
  let previousSelectedMarkerId = null;
  /**
   * Content state
   */
  let mapEntries = [];
  let mapDots = [];
  let mapComponent;
  let wikiPage = "";
  let cachedEntries = new Map();

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
    state = {...stateDefaults, ...urlState};
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
      updateURLParams(state, false);
    }, 100);
  });

  // When pane state changes, update map size after a slight delay to allow transitions
  $: if (previousPaneState !== isPaneOpen && mapComponent) {
    setTimeout(() => mapComponent.invalidateMapSize(), 50);
    if (!isPaneOpen) {
      state = {...state, selectedMarkerId: null};
    }
    previousPaneState = isPaneOpen;

  }

  $: if (state) {
    debounce((s) => handleStateChange(s), 500)(state);
  }

  function handleStateChange(state) {
    console.log("state changed", state);
    // Only update URL if not handling popstate and not in initial load
    if (!isHandlingPopstate && !isInitialLoad) {
      console.log("Updating URL params with history", state);
      updateURLParams(state, true);
    } else {
      console.log("Updating URL params without history", state);
      // Still update the URL, but don't add to history
      updateURLParams(state, false);
    }
  }

  $: if (state && state.selectedMarkerId !== previousSelectedMarkerId) {
    handleNewSelectedMarker(state.selectedMarkerId)
  }

  // -------------------------
  // EVENT HANDLERS
  // -------------------------

  async function handleNewSelectedMarker(newSelectedMarkerId) {
    previousSelectedMarkerId = state.selectedMarkerId
    let newMarkers;
    if (newSelectedMarkerId) {
      const query = await getGeodataFromGeokeys([newSelectedMarkerId], cachedEntries);
      const selectedMarker = query[0];
      console.log("boooooom");
      openWikiPane(selectedMarker.page_title);
      if (!mapEntries.some(marker => marker.geokey === newSelectedMarkerId)) {
        newMarkers = [...mapEntries, selectedMarker];
      } else {
        newMarkers = [...mapEntries];
      }
    }
    else {
      closeWikiPane();
      newMarkers = [...mapEntries];
      
    }
    
    addMarkerClasses(newMarkers, state.zoom)
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
      state = {...stateDefaults};
    } else {
      state = ev.state;
    }
    
    if (state.location) {
      mapComponent.goTo({location: state.location, zoom: state.zoom, flyDuration: 0})
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
  async function handleBoundsChange(event) {
    const center = event.detail.center;

    // Update URL with new location
    const zoom = event.detail.zoom;
    const location = {lat: center.lat, lon: center.lng}
    state = {...state, zoom, location}
    // Get entries for the visible map area
    const bounds = {
      minLat: event.detail.bounds._southWest.lat,
      maxLat: event.detail.bounds._northEast.lat,
      minLon: event.detail.bounds._southWest.lng,
      maxLon: event.detail.bounds._northEast.lng,
    };

    // Fetch geodata for the current bounds
    try {
      const {entriesInBounds, dotMarkers} = await getGeodataFromBounds(
        bounds,
        zoom - 1,
        cachedEntries
      );
      if (
        state.selectedMarkerId &&
        !entriesInBounds.some((entry) => entry.geokey === state.selectedMarkerId)
      ) {
        const selectedMarker = await getGeodataFromGeokeys([state.selectedMarkerId], cachedEntries);
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
  function handleMarkerClick(event) {
    if (state.selectedMarkerId !== event.detail.geokey) {
      setTimeout(() => {
        state = {...state, selectedMarkerId: event.detail.geokey}
      }, 100)
      mapComponent.goTo({location: {lat: event.detail.lat, lon: event.detail.lon}, zoom: state.zoom, flyDuration: 0.4})
    } else {
      const newZoom = Math.min(17, Math.max(12, state.zoom + 2))
      mapComponent.goTo({location: {lat: event.detail.lat, lon: event.detail.lon}, zoom: newZoom, flyDuration: 0.4})
    }
  }

  /**
   * Handle search selection
   */
  function handleSearchSelect(event) {
    state = {...state, selectedMarkerId: event.detail.geokey}
    mapComponent.goTo({location: {lat: event.detail.lat, lon: event.detail.lon}, zoom: Math.max(12, state.zoom), flyDuration: 1})
  }

  // -------------------------
  // HELPER FUNCTIONS
  // -------------------------

  /**
   * Opens the wiki pane with the specified page
   */
  function openWikiPane(page) {
    wikiPage = page;
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
      if (state.selectedMarkerId && entry.geokey == state.selectedMarkerId) {
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
      <SlidingPane bind:isOpen={isPaneOpen} page_title={wikiPage} />
    </div>

    <div class="map-container">
      <WorldMap
        bind:this={mapComponent}
        {mapEntries}
        {mapDots}
        on:boundschange={handleBoundsChange}
        on:markerclick={handleMarkerClick}
      />
      <div class="search-wrapper">
        <SearchBar 
          on:select={handleSearchSelect}
          on:modeChange={(event) => {
            if (state) {
              state = { ...state, mode: event.detail }
            }
          }}
          on:dateChange={(event) => {
            if (state) {
              state = { ...state, date: event.detail }
            }
          }}
          on:strictDateChange={(event) => {
            if (state) {
              state = { ...state, strictDate: event.detail }
            }
          }}
          mode={state?.mode}
          date={state?.date}
          strictDate={state?.strictDate}
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
