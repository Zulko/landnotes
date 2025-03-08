<script>
  import { onMount } from "svelte";
  import Map from "./lib/Map.svelte";
  let markers = [
    {
      lat: 51.508056,
      lng: -0.076111,
      name: "City with a very very long name",
      type: "city",
      page: "London",
      sizeClass: "dot",
    },
    {
      lat: 48.8566,
      lng: 2.3522,
      name: "Paris",
      type: "landmark",
      sizeClass: "full",
    },
    {
      lat: 40.7128,
      lng: -74.006,
      name: "New York",
      type: "city",
      sizeClass: "full",
    },
  ];

  let dataStatus = "not started";
  let mapBounds = {
    northEast: { lat: 0, lng: 0 },
    southWest: { lat: 0, lng: 0 },
  };
  let zoom = 13;

  function handleBoundsChange(event) {
    console.log("Map bounds updated:", event.detail);
    mapBounds = {
      northEast: event.detail.bounds._northEast,
      southWest: event.detail.bounds._southWest,
    };
    console.log("Map bounds updated:", mapBounds);
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
      {mapBounds.northEast.lng.toFixed(4)}) - SE({mapBounds.southWest.lat.toFixed(
        4
      )},
      {mapBounds.southWest.lng.toFixed(4)})</span
    >
  </div>

  <Map {markers} on:boundschange={handleBoundsChange} />
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
