<script lang="ts">
  // -------------------------
  // IMPORTS
  // -------------------------
  // Svelte lifecycle
  import { onMount, afterUpdate } from "svelte";

  // Components
  import WorldMap from "./lib/WorldMap.svelte";
  import SlidingPane from "./lib/SlidingPane.svelte";
  import SearchBar from "./lib/SearchBar.svelte";

  // Utilities
  import { updateURLParams, readURLParams } from "./lib/urlState";
  import {
    enrichPrefixTreeWithBounds,
    findNodesInBounds,
    getGeodataFromBounds,
  } from "./lib/geodata";
  import {
    smoothenGeoSquares,
    getConnectedPolylinesAndIsolated,
    smoothPolyline,
  } from "./lib/polylines";
  import JSZip from "jszip";

  // -------------------------
  // STATE MANAGEMENT
  // -------------------------

  /**
   * Map configuration and state
   */
  let mapComponent;
  let mapZoom = 1;
  let mapCenter = null;
  let targetMapLocation = {
    lat: 51.508056,
    lon: -0.076111,
    zoom: 3,
  };
  let markers = [];
  let cachedEntries = new Map();
  let hotSpotsTree = null;
  let hotSpotAreasInBounds = [];

  /**
   * UI state
   */
  let isMobile = false;
  let isPaneOpen = false;
  let previousPaneState = false;

  /**
   * Content state
   */
  let wikiPage = "";
  let selectedMarker = null;

  // -------------------------
  // LIFECYCLE HOOKS
  // -------------------------

  onMount(async () => {
    console.log("App starting!");
    handleResize(); // Initialize mobile detection

    // Read URL parameters when the app loads
    const urlState = readURLParams();
    if (urlState.targetLocation) {
      targetMapLocation = urlState.targetLocation;
    }
    if (urlState.selectedMarker) {
      selectedMarker = urlState.selectedMarker;
      openWikiPane(selectedMarker.page_title);
    }

    // Add history navigation handler
    window.addEventListener("popstate", handlePopState);

    // Load and process hot spots data
    try {
      // Fetch the zip file
      const response = await fetch("/geodata/hot_spots_tree.zip");
      if (!response.ok) {
        throw new Error(`Failed to load hot spots data: ${response.status}`);
      }

      // Get the zip file as array buffer
      const zipData = await response.arrayBuffer();

      // Use JSZip to extract the contents
      const zip = await JSZip.loadAsync(zipData);

      // Find the JSON file in the zip (assuming there's only one JSON file)
      let jsonFile;
      zip.forEach((relativePath, zipEntry) => {
        if (relativePath.endsWith(".json")) {
          jsonFile = zipEntry;
        }
      });

      if (!jsonFile) {
        throw new Error("No JSON file found in the zip archive");
      }

      // Extract and parse the JSON file
      const jsonContent = await jsonFile.async("string");
      const prefixTree = JSON.parse(jsonContent);

      // Enrich the prefix tree with bounds
      hotSpotsTree = enrichPrefixTreeWithBounds(prefixTree);
      console.log("Hot spots tree loaded and processed");
    } catch (error) {
      console.error("Error loading hot spots data:", error);
    }
  });

  // When pane state changes, update map size after a slight delay to allow transitions
  $: if (previousPaneState !== isPaneOpen && mapComponent) {
    setTimeout(() => mapComponent.invalidateMapSize(), 50);
    previousPaneState = isPaneOpen;
  }

  // -------------------------
  // EVENT HANDLERS
  // -------------------------

  /**
   * Handle browser history navigation
   */
  function handlePopState(ev: PopStateEvent) {
    const state = ev.state || {};

    if (state.targetLocation) {
      targetMapLocation = state.targetLocation;
    }

    if (state.selectedMarker) {
      selectedMarker = state.selectedMarker;
      openWikiPane(selectedMarker.page_title);
    } else {
      // Close the pane if no marker is selected
      isPaneOpen = false;
      wikiPage = "";
    }
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
    mapCenter = {
      lat: center.lat,
      lon: center.lng,
    };
    mapZoom = event.detail.zoom;

    // Update URL with new location
    const urlTargetMapLocation = { ...mapCenter, zoom: mapZoom };
    updateURLParams(urlTargetMapLocation, selectedMarker);

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
        mapZoom - 1,
        cachedEntries
      );
      console.log({ entries });
      if (
        selectedMarker &&
        !entries.some((entry) => entry.geokey === selectedMarker.geokey)
      ) {
        entries.push(selectedMarker);
      }
      entries.forEach((entry) => {
        cachedEntries.set(entry.geokey, entry);
      });

      // Update markers with display classes
      addMarkerClasses(entries, mapZoom);
      markers = entries;
    } catch (error) {
      console.error("Error fetching geodata:", error);
    }

    // Fetch hot spot areas in bounds
    console.time("findNodesInBounds");
    const rawHotSpotAreasInBounds = findNodesInBounds(
      hotSpotsTree,
      bounds,
      mapZoom + 3,
      "",
      []
    );

    hotSpotAreasInBounds = smoothenGeoSquares(rawHotSpotAreasInBounds, 2);
    console.timeEnd("findNodesInBounds");
  }

  /**
   * Handle marker click events
   */
  function handleMarkerClick(event) {
    focusOnEntry(event.detail);
  }

  /**
   * Handle search selection
   */
  function handleSearchSelect(event) {
    focusOnEntry(event.detail);
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

  /**
   * Focus the map on an entry and open its wiki page
   */
  function focusOnEntry(entry) {
    selectedMarker = entry;
    openWikiPane(entry.page_title);

    targetMapLocation = {
      lat: entry.lat,
      lon: entry.lon,
      zoom: Math.max(12, mapZoom), // Ensure zoom is at least 12
    };

    // Update URL - use true to add to browser history when selecting a marker
    updateURLParams(targetMapLocation, selectedMarker, true);
  }

  /**
   * Classify markers for display based on importance and zoom level
   */
  function addMarkerClasses(entries, zoomLevel) {
    // Sort entries by page length in descending order

    // Assign default display classes based on the sorted order
    // Handle selected and high-zoom markers
    for (const entry of entries) {
      if (selectedMarker && entry.geokey == selectedMarker.geokey) {
        entry.displayClass = "selected";
      } else if (entry.geokey.length <= zoomLevel - 2) {
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
        hotSpots={hotSpotAreasInBounds}
        targetLocation={targetMapLocation}
        on:boundschange={handleBoundsChange}
        on:markerclick={handleMarkerClick}
      />
      <div class="search-wrapper">
        <SearchBar on:select={handleSearchSelect} />
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

  main.is-mobile.has-open-pane .wiki-pane-container {
    flex: 0 0 70vh; /* Default height, will be adjusted by SlidingPane component */
  }

  main.is-mobile .map-container {
    order: 1; /* Put map at the top */
    flex: 1;
  }

  /* Mobile adjustments for search bar */
  main.is-mobile .search-wrapper {
    top: 10px;
    width: 90%;
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
