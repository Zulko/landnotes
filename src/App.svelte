<script>
  import { onMount } from "svelte";
  import Map from "./lib/Map.svelte";
  import SlidingPane from "./lib/SlidingPane.svelte";
  import { getGeoEntriesInBounds, getUniqueByGeoHash } from "./lib/geodata";
  import { updateURLParams, readURLParams } from "./lib/urlState";

  let markers = [];

  // State to control the sliding pane
  let isPaneOpen = false;
  let wikiPage = "";

  // State for selected marker
  let selectedMarker = null;
  let mapZoom = 1;

  // Add a target location state
  let targetMapLocation = {
    lat: 51.508056,
    lon: -0.076111,
    zoom: 1,
  };

  // Track if we need to select a marker once data is loaded

  // Detect mobile view
  let isMobile = false;

  // Function to open the pane with a Wikipedia page
  function openWikiPane(page) {
    wikiPage = page;
    isPaneOpen = true;
  }

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

  function addMarkerClasses(entries, hashlevel) {
    console.log("selectedMarker", selectedMarker);
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
        console.log({ entry });
        entry.displayClass = "selected";
      }
    }
    return entries;
  }
  async function handleBoundsChange(event) {
    const center = event.detail.center;
    mapZoom = event.detail.zoom;

    // Update targetMapLocation with the new center and zoom
    const urlTargetMapLocation = {
      lat: center.lat,
      lon: center.lng,
      zoom: mapZoom,
    };
    updateURLParams(urlTargetMapLocation, selectedMarker);

    const bounds = {
      minLat: event.detail.bounds._southWest.lat,
      maxLat: event.detail.bounds._northEast.lat,
      minLon: event.detail.bounds._southWest.lng,
      maxLon: event.detail.bounds._northEast.lng,
    };

    const entries = await getGeoEntriesInBounds(bounds);
    let hashlevel = Math.max(1, Math.min(8, mapZoom / 2));
    let uniqueEntries = getUniqueByGeoHash({
      entries,
      hashLength: hashlevel,
      scoreField: "page_len",
    });
    if (uniqueEntries.length > 400) {
      console.log("uniqueEntries", uniqueEntries.length, "so reducing");
      uniqueEntries.sort((a, b) => b.page_len - a.page_len);
      uniqueEntries = uniqueEntries.slice(0, 400);
    }
    if (
      selectedMarker &&
      !uniqueEntries.some((entry) => entry.id === selectedMarker.id)
    ) {
      uniqueEntries.push(selectedMarker);
    }
    console.log("nMarkers", uniqueEntries.length);

    addMarkerClasses(uniqueEntries, hashlevel);
    markers = uniqueEntries;
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
        {markers}
        targetLocation={targetMapLocation}
        on:boundschange={handleBoundsChange}
        on:markerclick={handleMarkerClick}
      />
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
  }

  .content-container {
    display: flex;
    width: 100%;
    height: 100%;
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
</style>
