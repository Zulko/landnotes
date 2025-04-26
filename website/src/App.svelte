<script lang="ts">
  // -------------------------
  // IMPORTS
  // -------------------------
  // Svelte lifecycle
  import { onMount } from "svelte";

  // Components
  import WorldMap from "./lib/map/WorldMap.svelte";
  import SlidingPane from "./lib/SlidingPane/SlidingPane.svelte";
  import SearchBarMenu from "./lib/menu/SearchBarMenu.svelte";

  // Utilities
  import { appState, setStateFromURLParams } from "./lib/appState.svelte";
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
  let isNarrowScreen = $state(false);
  let currentMode = $state("places");

  let mapComponent;

  // -------------------------
  // LIFECYCLE HOOKS
  // -------------------------
  onMount(async () => {
    console.log("App starting!");
    handleResize(); // Initialize mobile detection
    setStateFromURLParamsAndMoveMap();
    window.addEventListener("popstate", setStateFromURLParamsAndMoveMap);
  });

  $effect(() => {
    if (appState.mode !== currentMode) {
      console.log("deselecting marker");
      appState.selectedMarkerId = null;
      currentMode = appState.mode;
    }
  });
  // -------------------------
  // STATE MANAGEMENT FUNCTIONS
  // -------------------------
  /**
   * Initialize app state from URL parameters
   */
  function setStateFromURLParamsAndMoveMap() {
    const urlState = setStateFromURLParams();
    if (urlState.location) {
      mapComponent.mapTravel({
        location: urlState.location,
        zoom: urlState.zoom,
        flyDuration: 0.3,
      });
    } else {
      mapComponent.mapTravel({
        location: { lat: 0, lon: 0 },
        zoom: 3,
        flyDuration: 0.3,
      });
    }
  }

  // -------------------------
  // EVENT HANDLERS
  // -------------------------

  /**
   * Handle closing of the sliding pane
   */

  /**
   * Update mobile status based on window size
   */
  function handleResize() {
    isNarrowScreen = window.innerWidth <= 768;
  }

  /**
   * Handle search selection
   */
  function onSearchSelect({ geokey, lat, lon }) {
    const selectedMarkerId = geokey;
    if (appState.selectedMarkerId !== selectedMarkerId) {
      appState.selectedMarkerId = selectedMarkerId;
    }
    mapComponent.mapTravel({
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
</script>

<svelte:window on:resize={handleResize} />

<main
  class:narrow-screen={isNarrowScreen}
  tabindex="-1"
  data-focus-target
  id="main"
>
  <div class="content-container">
    {#if appState.wikiPage}
      <div class="wiki-pane-container">
        <SlidingPane />
      </div>
    {/if}

    <div class="map-container">
      <WorldMap bind:this={mapComponent} />
      <div class="search-wrapper">
        <SearchBarMenu {onSearchSelect} />
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
  main.narrow-screen .content-container {
    flex-direction: column;
  }

  main.narrow-screen .wiki-pane-container {
    flex: 0 0 0;
    order: 2; /* Put wiki pane at the bottom */
  }

  main.narrow-screen .map-container {
    order: 1; /* Put map at the top */
    flex: 1;
  }

  /* Mobile adjustments for search bar */
  main.narrow-screen .search-wrapper {
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
