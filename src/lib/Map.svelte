<script>
  import { onMount, onDestroy } from "svelte";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import { createEventDispatcher } from "svelte";

  // Props
  export let markers = [];
  export let zoom = 13;
  export let center = [51.505, -0.09]; // Default to London

  let mapElement;
  let map;
  let markerLayer;
  const dispatch = createEventDispatcher();

  onMount(() => {
    // Initialize the map
    map = L.map(mapElement).setView(center, zoom);

    // Add tile layer (OpenStreetMap)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Create a layer group for markers
    markerLayer = L.layerGroup().addTo(map);

    // Add initial markers
    updateMarkers();

    // Add event listeners for bounds changes
    map.on("moveend", handleBoundsChange);
    map.on("zoomend", handleBoundsChange);
    map.on("resize", handleBoundsChange);
  });

  onDestroy(() => {
    if (map) {
      map.off("moveend", handleBoundsChange);
      map.off("zoomend", handleBoundsChange);
      map.off("resize", handleBoundsChange);
      map.remove();
    }
  });

  // Function to handle bounds changes and dispatch the event
  function handleBoundsChange() {
    if (!map) return;

    const bounds = map.getBounds();
    dispatch("boundschange", {
      bounds: bounds,
      center: bounds.getCenter(),
      zoom: map.getZoom(),
    });
  }

  // Function to update markers when the markers prop changes
  function updateMarkers() {
    if (!map || !markerLayer) return;

    // Clear existing markers
    markerLayer.clearLayers();

    // Add new markers
    markers.forEach((marker) => {
      L.marker([marker.lat, marker.lng])
        .bindPopup(marker.popup || "")
        .addTo(markerLayer);
    });

    var textIcon = L.divIcon({
      className: "custom-div-icon", // You can style this class in CSS
      html: '<div style="background-color: white; border: 1px solid #ccc; padding: 4px;">City Name</div>',
      iconSize: [100, 40],
      iconAnchor: [50, 20],
    });
    L.marker([51.505, -0.09], { icon: textIcon }).addTo(map);
  }

  // Watch for changes to markers
  $: if (markers && map) {
    updateMarkers();
  }

  // Handle container size changes
  function handleResize() {
    if (map) {
      map.invalidateSize();
    }
  }
</script>

<div
  class="map-container"
  bind:this={mapElement}
  on:resize={handleResize}
></div>

<style>
  .map-container {
    width: 100%;
    height: 100%;
  }

  :global(.leaflet-container) {
    height: 100%;
    width: 100%;
  }
</style>
