<script>
  import { onMount, onDestroy } from "svelte";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import { createEventDispatcher } from "svelte";

  // Props
  export let markers = [];
  export let zoom = 13;
  export let center = [51.508056, -0.076111]; // Default to London

  let mapElement;
  let map;
  let markerLayer;
  const dispatch = createEventDispatcher();

  function computeMarkerHtml(marker) {
    const iconByType = {
      adm1st: "map",
      adm2nd: "map",
      adm3rd: "map",
      airport: "plane-takeoff",
      building: "building",
      church: "church",
      city: "city",
      country: "flag",
      county: "map",
      edu: "school",
      event: "newspaper",
      forest: "trees",
      glacier: "mountain-snow",
      island: "tree-palm",
      isle: "tree-palm",
      landmark: "landmark",
      locality: "locality",
      mountain: "mountain-snow",
      other: "pin",
      railwaystation: "train-front",
      river: "river",
      school: "school",
      settlement: "city",
      town: "city",
      village: "city",
      waterbody: "waves",
    };
    const icon = iconByType[marker.type] || iconByType.other;

    return `
    <div class="map-marker marker-size-${marker.sizeClass}">
        <div class="marker-icon-circle">
          <img src="/icons/${icon}.svg">
        </div>
        <div class="marker-text-container">
          <div class="marker-text marker-text-outline">${
            marker.name || marker.page
          }</div>
          <div class="marker-text">${marker.name || marker.page}</div>
        </div>
      </div>
    `;
  }
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
      const markerHtml = computeMarkerHtml(marker);
      const icon = L.divIcon({
        className: "custom-div-icon",
        html: markerHtml,
        iconSize: [128, 32],
      });
      L.marker([marker.lat, marker.lng], { icon: icon }).addTo(markerLayer);
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

  :global(.map-marker) {
    transition:
      transform 0.1s ease,
      filter 0.1s ease;
    display: block;
    text-align: center;

    &:hover {
      transform: scale(1.1);
      filter: brightness(1.2);
      z-index: 1000 !important; /* Ensure hovered markers appear above others */
    }
    &:hover > .marker-icon-circle {
      --circle-size: 32px !important;
      box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.35);
    }

    &:hover > .marker-text-container {
      visibility: visible;
      opacity: 1;
    }
    &.marker-size-full > .marker-text-container {
      visibility: visible;
      opacity: 1;
    }

    &.marker-size-full > .marker-icon-circle {
      --circle-size: 32px;
      box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.35);
    }

    &.marker-size-reduced > .marker-icon-circle {
      --circle-size: 24px;
    }

    &.marker-size-dot > .marker-icon-circle {
      --circle-size: 12px;
    }

    &.marker-size-tinydot > .marker-icon-circle {
      --circle-size: 4px;
    }

    & > .marker-icon-circle {
      width: var(--circle-size);
      height: var(--circle-size);
      background-color: white;
      border-radius: 50%;
      border: 2px solid #222;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto; /* Center the circle in its parent div */
      transition:
        width 0.1s ease,
        height 0.1s ease;
    }
    & > .marker-icon-circle img {
      width: calc(var(--circle-size) * 0.7);
      height: calc(var(--circle-size) * 0.7);
      margin: 0; /* Remove bottom margin to help with centering */
      display: block; /* Ensure the image behaves as a block */
      transition:
        width 0.1s ease,
        height 0.1s ease;
    }
  }

  :global(.marker-text-container) {
    margin-top: -5px;
    font-size: 14px;
    line-height: 0.8em;
    position: relative;
    text-align: center;
    visibility: hidden;
    opacity: 0;
    transition:
      visibility 0.1s ease,
      opacity 0.1s ease;
    & > .marker-text-outline {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      font-weight: bold;
      color: white;
      -webkit-text-stroke: 6px white;
      text-stroke: 6px white;
      z-index: 1;
    }
  }

  :global(.marker-text) {
    font-weight: bold;
    color: #111;
    position: relative;
    z-index: 2;
  }
  :global(.marker-text-outline) {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    font-weight: bold;
    color: white;
    -webkit-text-stroke: 6px white;
    text-stroke: 6px white;
    z-index: 1;
  }
</style>
