<script>
  import { onMount, afterUpdate } from "svelte";
  import WorldMap from "./lib/WorldMap.svelte";
  import SlidingPane from "./lib/SlidingPane.svelte";
  import SearchBar from "./lib/SearchBar.svelte";
  import { getGeoEntriesInBounds, getUniqueByGeoHash } from "./lib/geodata";
  import { updateURLParams, readURLParams } from "./lib/urlState";

  // ---------------
  // STATE VARIABLES
  // ---------------

  // Map state
  let mapComponent;
  let mapZoom = 1;
  let mapCenter = null;
  let targetMapLocation = {
    lat: 51.508056,
    lon: -0.076111,
    zoom: 3,
  };
  let markers = [];
  let allEntriesInRegion = [];

  // UI state
  let isMobile = false;
  let isPaneOpen = false;
  let previousPaneState = false;

  // Content state
  let wikiPage = "";
  let selectedMarker = null;

  // ----------------
  // LIFECYCLE HOOKS
  // ----------------

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

  // Check if the pane state changed and invalidate map size if needed
  afterUpdate(() => {
    if (previousPaneState !== isPaneOpen && mapComponent) {
      // Small delay to allow CSS transitions to start
      setTimeout(() => {
        mapComponent.invalidateMapSize();
      }, 50);
      previousPaneState = isPaneOpen;
    }
  });

  // ----------------
  // EVENT HANDLERS
  // ----------------

  // Handle window resize events
  function handleResize() {
    isMobile = window.innerWidth <= 768;
  }

  // Handle map bounds changing
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

    let hashlevel = Math.max(1, Math.min(8, 1 + Math.floor(0.42 * mapZoom)));

    let entries = await getGeoEntriesInBounds(bounds, hashlevel);

    // Make sure the selected marker stays visible
    if (
      selectedMarker &&
      !entries.some((entry) => entry.id === selectedMarker.id)
    ) {
      entries.push(selectedMarker);
    }

    addMarkerClasses(entries, hashlevel);
    markers = entries;
  }

  // Handle marker click events
  async function handleMarkerClick(event) {
    focusOnEntry(event.detail);
  }

  // Handle search selection
  function handleSearchSelect(event) {
    focusOnEntry(event.detail);
  }

  // ----------------
  // HELPER FUNCTIONS
  // ----------------

  // Function to open the pane with a Wikipedia page
  function openWikiPane(page) {
    wikiPage = page;
    isPaneOpen = true;
  }

  // Common function to handle focusing on a map entry (from search or marker click)
  function focusOnEntry(entry) {
    selectedMarker = entry;
    const hashlevel = Math.max(1, Math.min(8, mapZoom / 2));
    markers = addMarkerClasses([...markers], hashlevel);
    openWikiPane(entry.page_title);

    targetMapLocation = {
      lat: entry.lat,
      lon: entry.lon,
      zoom: Math.max(12, mapZoom), // Ensure zoom is at least 12
    };

    // Update URL
    updateURLParams(targetMapLocation, selectedMarker);
  }

  // Classify markers for display based on importance and zoom level
  function addMarkerClasses(entries, hashlevel) {
    // Sort entries by page length in descending order
    entries.sort((a, b) => b.page_len - a.page_len);
    const dotCount = Math.floor(entries.length * 0.5);

    // Assign default display classes based on the sorted order
    for (let i = 0; i < entries.length; i++) {
      entries[i].displayClass =
        i >= entries.length - dotCount ? "dot" : "reduced";
    }

    // Handle selected and high-zoom markers
    for (const entry of entries) {
      if (selectedMarker && entry.id == selectedMarker.id) {
        entry.displayClass = "selected";
      } else if (hashlevel == 8) {
        entry.displayClass = "full";
      }
    }

    // Get unique entries by geohash at a lower level to reduce density
    const uniqueEntries = getUniqueByGeoHash({
      entries,
      hashLength: hashlevel - 1,
      scoreField: "page_len",
    });

    // Mark these unique entries with 'full' class
    uniqueEntries.forEach((entry) => {
      if (entry.displayClass != "selected") {
        entry.displayClass = "full";
      }
    });

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
