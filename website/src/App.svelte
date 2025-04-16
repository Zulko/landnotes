<script lang="ts">
  // -------------------------
  // IMPORTS
  // -------------------------
  // Svelte lifecycle
  import { onMount } from "svelte";
  import { fly, fade } from 'svelte/transition';

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

  let appState = $state(stateDefaults);
  /**
   * Content state
   */
  let mapEntries = $state([]);
  let mapDots = $state([]);
  let mapComponent;
  let wikiPage = $state("");
  let cachedEntries = $state(new Map());

  // Add a flag to track when we're handling a popstate event
  let dontPushToHistory = $state(false);
  let isMobile = $state(false);

  // -------------------------
  // LIFECYCLE HOOKS
  // -------------------------


    // -------------------------
  // HELPER FUNCTIONS
  // -------------------------

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

  onMount(async () => {
    console.log("App starting!");
    handleResize(); // Initialize mobile detection
    setStateFromURLParams()
    window.addEventListener("popstate", handlePopState);
  });

  // When pane state changes, update map size after a slight delay to allow transitions

  $effect(() => {
    debouncedUpdateURLParams($state.snapshot(appState));
    
  });

  function setStateFromURLParams() {
    dontPushToHistory = true;
    const urlState = readURLParams();
    if (urlState.selectedMarkerId) {
      handleNewSelectedMarker(urlState.selectedMarkerId);
    }
    appState = {...stateDefaults, ...urlState};
    if (urlState.location) {
      mapComponent.goTo({location: urlState.location, zoom: urlState.zoom, flyDuration: 0.3})
    } else {
      mapComponent.goTo({location: {lat: 0, lon: 0}, zoom: 3, flyDuration: 0.3})
    }
    setTimeout(() => {
      console.log("releasing the lock")
      dontPushToHistory = false;
    }, 3000)
  }
    

  function onPaneClose() {
    appState.selectedMarkerId = null;
    handleNewSelectedMarker(null);
    setTimeout(() => mapComponent.invalidateMapSize(), 50);
  };

  function updateURLParamsOnStateChange(appState) {
    if (dontPushToHistory) return;
    console.log("state changed", appState);
    // Only update URL if not handling popstate and not in initial load
    console.log("Updating URL params with history", appState);
    updateURLParams(appState, true);
  }

  const debouncedUpdateURLParams = debounce(updateURLParamsOnStateChange, 500);

  // -------------------------
  // EVENT HANDLERS
  // -------------------------

  async function handleNewSelectedMarker(selectedMarkerId) {

    console.log("handleNewSelectedMarker");
    if (selectedMarkerId === appState.selectedMarkerId) return;
    
    let newMarkers;
    if (selectedMarkerId) {
      const query = await getGeodataFromGeokeys([selectedMarkerId], cachedEntries);
      const selectedMarker = query[0];
      wikiPage = selectedMarker.page_title;
      if (!mapEntries.some(marker => marker.geokey === selectedMarkerId)) {
        newMarkers = [...mapEntries, selectedMarker];
      } else {
        newMarkers = [...mapEntries];
      }
    }
    else {
      newMarkers = [...mapEntries];
      
    }
    
    addMarkerClasses(newMarkers, appState.zoom)
    mapEntries = newMarkers
    
  }

  /**
   * Handle browser history navigation
   */
  function handlePopState(ev: PopStateEvent) {
    console.log("POPPPPP")
    setStateFromURLParams()
    setTimeout(() => {
      console.log("focusing on main")
      document.getElementById("main").focus();
    }, 3000)
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
        appState.selectedMarkerId = selectedMarkerId;
      }, 400)
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
    const selectedMarkerId = geokey;
    if (appState.selectedMarkerId !== selectedMarkerId) {
      handleNewSelectedMarker(selectedMarkerId)
      appState.selectedMarkerId = selectedMarkerId;
    }
    mapComponent.goTo({location: {lat, lon}, zoom: Math.max(12, appState.zoom), flyDuration: 1})
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
