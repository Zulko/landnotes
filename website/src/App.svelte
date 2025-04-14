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
  let mode = "places";
  let zoom = 1;
  let location = null;
  let markers = [];
  

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
  let mapComponent;
  let wikiPage = "";
  let selectedMarkerId = null;
  let cachedEntries = new Map();

  // -------------------------
  // LIFECYCLE HOOKS
  // -------------------------

  onMount(async () => {
    console.log("App starting!");
    handleResize(); // Initialize mobile detection
    

    // Read URL parameters when the app loads
    const urlState = readURLParams();
    if (urlState.selectedMarkerId) {
      selectedMarkerId = urlState.selectedMarkerId;
    }
    if (urlState.location) {
      mapComponent.goTo({location: urlState.location, zoom: urlState.zoom, flyDuration: 0})
    } else {
      mapComponent.goTo({location: {lat: 0, lon: 0}, zoom: 3, flyDuration: 0})
    }
    // Add history navigation handler
    window.addEventListener("popstate", handlePopState);
    
  });

  // When pane state changes, update map size after a slight delay to allow transitions
  $: if (previousPaneState !== isPaneOpen && mapComponent) {
    setTimeout(() => mapComponent.invalidateMapSize(), 50);
    if (!isPaneOpen) {
      selectedMarkerId = null;
    }
    previousPaneState = isPaneOpen;

  }

  $: if (previousSelectedMarkerId !== selectedMarkerId) {
    handleNewSelectedMarker(selectedMarkerId)
  }
  // -------------------------
  // EVENT HANDLERS
  // -------------------------

  async function handleNewSelectedMarker(selectedMarkerId) {
    let newMarkers;
    console.log("handleNewSelectedMarker", selectedMarkerId)
    if (selectedMarkerId) {
      const query = await getGeodataFromGeokeys([selectedMarkerId], cachedEntries);
      const selectedMarker = query[0];
      openWikiPane(selectedMarker.page_title);
      if (!markers.some(marker => marker.geokey === selectedMarkerId)) {
        newMarkers = [...markers, selectedMarker];
      } else {
        newMarkers = [...markers];
      }
    }
    else {
      closeWikiPane();
      newMarkers = [...markers];
      
    }
    addMarkerClasses(newMarkers, zoom)
    markers = newMarkers
    updateURLParams({location, zoom, selectedMarkerId})
    previousSelectedMarkerId = selectedMarkerId
  }

  /**
   * Handle browser history navigation
   */
  function handlePopState(ev: PopStateEvent) {
    const state = ev.state || {};

    if (state.location) {
      mapComponent.goTo({location: state.location, zoom: state.zoom, flyDuration: 0})
    }
    selectedMarkerId = state.selectedMarkerId;
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
    zoom = event.detail.zoom;
    location = {lat: center.lat, lon: center.lng}
    updateURLParams({location, zoom, selectedMarkerId});

    // Get entries for the visible map area
    const bounds = {
      minLat: event.detail.bounds._southWest.lat,
      maxLat: event.detail.bounds._northEast.lat,
      minLon: event.detail.bounds._southWest.lng,
      maxLon: event.detail.bounds._northEast.lng,
    };

    // Fetch geodata for the current bounds
    try {
      const entries = await getGeodataFromBounds(
        bounds,
        zoom - 1,
        cachedEntries
      );
      if (
        selectedMarkerId &&
        !entries.some((entry) => entry.geokey === selectedMarkerId)
      ) {
        const selectedMarker = await getGeodataFromGeokeys([selectedMarkerId], cachedEntries);
        entries.push(selectedMarker[0]);
      }

      // Update markers with display classes
      addMarkerClasses(entries, zoom);
      markers = entries;
    } catch (error) {
      console.error("Error fetching geodata:", error);
    }
  }

  /**
   * Handle marker click events
   */
  function handleMarkerClick(event) {
    if (selectedMarkerId !== event.detail.geokey) {
      selectedMarkerId = event.detail.geokey
      mapComponent.goTo({location: {lat: event.detail.lat, lon: event.detail.lon}, zoom, flyDuration: 1})
    } else {
      const newZoom = Math.min(17, Math.max(12, zoom + 2))
      mapComponent.goTo({location: {lat: event.detail.lat, lon: event.detail.lon}, zoom: newZoom, flyDuration: 1})
    }
  }

  /**
   * Handle search selection
   */
  function handleSearchSelect(event) {
    selectedMarkerId = event.detail.geokey;
    mapComponent.goTo({location: {lat: event.detail.lat, lon: event.detail.lon}, zoom: Math.max(12, zoom), flyDuration: 1})
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
   * Classify markers for display based on importance and zoom level
   */
  function addMarkerClasses(entries, zoomLevel) {
    // Sort entries by page length in descending order

    // Assign default display classes based on the sorted order
    // Handle selected and high-zoom markers
    for (const entry of entries) {
      if (selectedMarkerId && entry.geokey == selectedMarkerId) {
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
        {markers}
        on:boundschange={handleBoundsChange}
        on:markerclick={handleMarkerClick}
      />
      <div class="search-wrapper">
        <SearchBar on:select={handleSearchSelect} bind:mode />
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
