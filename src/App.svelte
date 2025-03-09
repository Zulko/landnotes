<script>
  import { onMount } from "svelte";
  import Map from "./lib/Map.svelte";
  import SlidingPane from "./lib/SlidingPane.svelte";
  import { getGeoEntriesInBounds, getUniqueByGeoHash } from "./lib/geodata";
  import { Mixin } from "leaflet";

  let markers = [];

  let dataStatus = "not started";
  let mapBounds = {
    northEast: { lat: 0, lon: 0 },
    southWest: { lat: 0, lon: 0 },
  };

  // State to control the sliding pane
  let isPaneOpen = false;
  let wikiPage = "";

  // State for selected marker
  let selectedMarker = null;
  let mapCenter = [51.508056, -0.076111];
  let mapZoom = 1;

  // Add a target location state
  let targetMapLocation = {
    lat: 51.508056,
    lon: -0.076111,
    zoom: 1,
  };

  // Function to open the pane with a Wikipedia page
  function openWikiPane(page) {
    wikiPage = page;
    isPaneOpen = true;
  }

  // Function to handle marker clicks
  function handleMarkerClick(event) {
    const marker = event.detail;
    selectedMarker = marker;

    // Set the target location instead of directly setting center/zoom
    targetMapLocation = {
      lat: marker.lat,
      lon: marker.lon,
      zoom: Math.max(13, mapZoom), // Ensure zoom is at least 13
    };

    openWikiPane(marker.page_title);
  }

  function addCosmeticsToEntries(entries, hashlevel) {
    if (hashlevel > 7.5) {
      for (const entry of entries) {
        entry.sizeClass = "full";
      }
    } else {
      for (const entry of entries) {
        entry.sizeClass = "dot";
      }
      for (const entry of getUniqueByGeoHash({
        entries,
        hashLength: hashlevel - 0.5,
        scoreField: "page_len",
      })) {
        entry.sizeClass = "reduced";
      }
      for (const entry of getUniqueByGeoHash({
        entries,
        hashLength: hashlevel - 1.5,
        scoreField: "page_len",
      })) {
        entry.sizeClass = "full";
      }
    }
    // Sort entries so "full" size class appears last
    entries.sort((a, b) => {
      if (a.sizeClass === "full" && b.sizeClass !== "full") return 1;
      if (a.sizeClass !== "full" && b.sizeClass === "full") return -1;
      return 0;
    });
  }
  async function handleBoundsChange(event) {
    const center = event.detail.center;
    mapZoom = event.detail.zoom;
    console.log("mapZoom", mapZoom);
    mapCenter = [center.lat, center.lon];
    const bounds = {
      minLat: event.detail.bounds._southWest.lat,
      maxLat: event.detail.bounds._northEast.lat,
      minLon: event.detail.bounds._southWest.lng,
      maxLon: event.detail.bounds._northEast.lng,
    };
    const entries = await getGeoEntriesInBounds(bounds);
    console.log(mapZoom, Math.max(1, Math.min(8, mapZoom / 2)));
    const hashlevel = Math.max(1, Math.min(8, mapZoom / 2));
    const uniqueEntries = getUniqueByGeoHash({
      entries,
      hashLength: hashlevel,
      scoreField: "page_len",
    });
    addCosmeticsToEntries(uniqueEntries, hashlevel);
    console.log("Unique entries:", uniqueEntries);
    markers = uniqueEntries;
  }
  onMount(async () => {
    console.log("App starting");
  });
</script>

<main>
  <div class="status-bar">
    <span>Status: {dataStatus}</span>
    <span>
      Bounds: NE({mapBounds.northEast.lat.toFixed(4)},
      {mapBounds.northEast.lon.toFixed(4)}) - SE({mapBounds.southWest.lat.toFixed(
        4
      )},
      {mapBounds.southWest.lon.toFixed(4)})</span
    >
    <button on:click={() => openWikiPane("London")}>Open Wikipedia</button>
  </div>

  <Map
    {markers}
    targetLocation={targetMapLocation}
    on:boundschange={handleBoundsChange}
    on:markerclick={handleMarkerClick}
  />

  <SlidingPane bind:isOpen={isPaneOpen} title={wikiPage} page_title={wikiPage}>
    <!-- Content will be handled by the iframe in SlidingPane -->
  </SlidingPane>
</main>

<style>
  main {
    width: 100%;
    height: 100vh;
    padding: 0;
    margin: 0;
    position: relative;
  }

  .status-bar {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: rgba(255, 255, 255, 0.8);
    padding: 5px 10px;
    border-radius: 4px;
    z-index: 1000;
    font-size: 14px;
    display: flex;
    gap: 10px;
  }
</style>
