<script>
  import { onMount, afterUpdate } from "svelte";
  import Map from "./lib/Map.svelte";
  import SlidingPane from "./lib/SlidingPane.svelte";
  import SearchBar from "./lib/SearchBar.svelte";
  import { getGeoEntriesInBounds, getUniqueByGeoHash } from "./lib/geodata";
  import { updateURLParams, readURLParams } from "./lib/urlState";

  let markers = [];

  // State to control the sliding pane
  let isPaneOpen = false;
  let wikiPage = "";

  // State for selected marker
  let selectedMarker = null;
  let mapZoom = 1;
  let mapCenter = null;

  // Add a target location state
  let targetMapLocation = {
    lat: 51.508056,
    lon: -0.076111,
    zoom: 3,
  };

  // Search state
  let searchText = "";

  // Detect mobile view
  let isMobile = false;

  // all the entries found for the region (not just the ones displayed)
  let allEntriesInRegion = [];

  let mapComponent; // Reference to the Map component

  // Previous pane state to detect changes
  let previousPaneState = false;

  // Function to open the pane with a Wikipedia page
  function openWikiPane(page) {
    wikiPage = page;
    isPaneOpen = true;
  }

  // After each update, check if the pane state changed
  afterUpdate(() => {
    if (previousPaneState !== isPaneOpen && mapComponent) {
      // Small delay to allow CSS transitions to start
      setTimeout(() => {
        mapComponent.invalidateMapSize();
      }, 50);
      previousPaneState = isPaneOpen;
    }
  });

  // Function to handle marker clicks
  async function handleMarkerClick(event) {
    const marker = event.detail;
    selectedMarker = marker;
    const hashlevel = Math.max(1, Math.min(8, mapZoom / 2));
    markers = addMarkerClasses([...markers], hashlevel);
    openWikiPane(marker.page_title);
    targetMapLocation = {
      lat: marker.lat,
      lon: marker.lon,
      zoom: Math.max(13, mapZoom), // Ensure zoom is at least 13
    };

    // Update URL only for user-initiated actions
    updateURLParams(targetMapLocation, selectedMarker);
  }

  // Handle search selection
  function handleSearchSelect(event) {
    const selectedEntry = event.detail;
    selectedMarker = selectedEntry;
    const hashlevel = Math.max(1, Math.min(8, mapZoom / 2));
    markers = addMarkerClasses([...markers], hashlevel);
    openWikiPane(selectedEntry.page_title);
    targetMapLocation = {
      lat: selectedEntry.lat,
      lon: selectedEntry.lon,
      zoom: Math.max(13, mapZoom), // Ensure zoom is at least 13
    };

    // Update URL
    updateURLParams(targetMapLocation, selectedMarker);
  }

  function addMarkerClasses(entries, hashlevel) {
    if (hashlevel > 7.5) {
      for (const entry of entries) {
        entry.displayClass = "full";
      }
    } else {
      for (const entry of entries) {
        entry.displayClass = "dot";
      }
      for (const entry of getUniqueByGeoHash({
        entries,
        hashLength: hashlevel - 0.5,
        scoreField: "page_len",
      })) {
        entry.displayClass = "reduced";
      }
      for (const entry of getUniqueByGeoHash({
        entries,
        hashLength: hashlevel - 1.5,
        scoreField: "page_len",
      })) {
        entry.displayClass = "full";
      }
    }
    for (const entry of entries) {
      if (selectedMarker && entry.id == selectedMarker.id) {
        entry.displayClass = "selected";
      }
    }
    return entries;
  }

  async function handleBoundsChange(event) {
    const center = event.detail.center;
    mapCenter = {
      lat: center.lat,
      lon: center.lng,
    };
    mapZoom = event.detail.zoom;
    // Update targetMapLocation with the new center and zoom
    const urlTargetMapLocation = { ...mapCenter, zoom: mapZoom };
    updateURLParams(urlTargetMapLocation, selectedMarker);

    const bounds = {
      minLat: event.detail.bounds._southWest.lat,
      maxLat: event.detail.bounds._northEast.lat,
      minLon: event.detail.bounds._southWest.lng,
      maxLon: event.detail.bounds._northEast.lng,
    };

    let hashlevel = Math.max(1, Math.min(8, mapZoom / 2));
    let entries = await getGeoEntriesInBounds(bounds, hashlevel);
    if (
      selectedMarker &&
      !entries.some((entry) => entry.id === selectedMarker.id)
    ) {
      entries.push(selectedMarker);
    }

    addMarkerClasses(entries, hashlevel);
    markers = entries;
  }

  function handleResize() {
    isMobile = window.innerWidth <= 768;
  }

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
  });
</script>

<svelte:window on:resize={handleResize} />

<main class:has-open-pane={isPaneOpen} class:is-mobile={isMobile}>
  <div class="content-container">
    <div class="wiki-pane-container">
      <SlidingPane
        bind:isOpen={isPaneOpen}
        title={wikiPage}
        page_title={wikiPage}
      />
    </div>

    <div class="map-container">
      <Map
        bind:this={mapComponent}
        {markers}
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
