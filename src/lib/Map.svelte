<script>
  import { onMount, onDestroy } from 'svelte';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';

  // Props
  export let markers = [];
  export let zoom = 13;
  export let center = [51.505, -0.09]; // Default to London

  let mapElement;
  let map;
  let markerLayer;

  onMount(() => {
    // Initialize the map
    map = L.map(mapElement).setView(center, zoom);
    
    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Create a layer group for markers
    markerLayer = L.layerGroup().addTo(map);
    
    // Add initial markers
    updateMarkers();
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });

  // Function to update markers when the markers prop changes
  function updateMarkers() {
    if (!map || !markerLayer) return;
    
    // Clear existing markers
    markerLayer.clearLayers();
    
    // Add new markers
    markers.forEach(marker => {
      L.marker([marker.lat, marker.lng])
        .bindPopup(marker.popup || '')
        .addTo(markerLayer);
    });
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

<div class="map-container" bind:this={mapElement} on:resize={handleResize}></div>

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