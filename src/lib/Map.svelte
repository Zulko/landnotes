<script>
  import { onMount, onDestroy } from "svelte";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import { createEventDispatcher } from "svelte";

  // Props
  export let markers = [];
  // export let zoom = 13;
  // export let center = [51.508056, -0.076111]; // Default to London
  export let onMarkerClick = null; // Function to call when marker is clicked

  // New props for controlled centering
  export let targetLocation = null; // Format: { lat, lon, zoom }

  let mapElement;
  let map;
  let markerLayer;
  let startZoom = 0;
  // Use the traditional event dispatcher
  const dispatch = createEventDispatcher();

  let isFlying = false; // Track if map is currently in flyTo animation

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
      river: "waves",
      school: "school",
      settlement: "city",
      town: "city",
      village: "city",
      waterbody: "waves",
    };
    const icon = iconByType[marker.category] || iconByType.other;
    const unsanitized_page_title = marker.page_title.replaceAll("_", " ");
    let label = marker.name;
    if (!marker.name) {
      label = unsanitized_page_title;
    } else if (unsanitized_page_title.includes(marker.name)) {
      label = unsanitized_page_title;
    } else {
      const fullLabel = marker.name + " - " + unsanitized_page_title;
      if (fullLabel.length <= 30) {
        label = fullLabel;
      }
    }
    return `
    <div class="map-marker marker-size-${marker.sizeClass} ${
      marker.isSelected ? "marker-selected" : ""
    }" >
        <div class="marker-icon-circle">
          <img src="/icons/${icon}.svg">
        </div>
        <div class="marker-text-container">
          <div class="marker-text marker-text-outline">${label}</div>
          <div class="marker-text">${label}</div>
        </div>
      </div>
    `;
  }
  onMount(() => {
    // Initialize the map
    map = L.map(mapElement, {
      zoomControl: false, // Disable default zoom control
    }).setView([0, 0], 1);
    flyTo(targetLocation);

    // Add tile layer (OpenStreetMap)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add zoom control to bottom right
    L.control
      .zoom({
        position: "bottomright",
      })
      .addTo(map);

    // Create a layer group for markers
    markerLayer = L.layerGroup().addTo(map);

    // Add initial markers
    updateMarkers();

    // Add event listeners for bounds changes
    map.on("moveend", handleBoundsChange);
    map.on("zoomend", handleBoundsChange);
    map.on("resize", handleBoundsChange);

    // No need to return a cleanup function here as we're using onDestroy
  });

  onDestroy(() => {
    if (map) {
      map.off("moveend", handleBoundsChange);
      map.off("zoomend", handleBoundsChange);
      map.off("resize", handleBoundsChange);
      map.remove();
      map = null; // Set to null to prevent double cleanup
    }
  });

  function flyTo(targetLocation) {
    const { lat, lon, zoom: targetZoom } = targetLocation;
    // If target zoom is less than current zoom, clear markers first
    if (targetZoom < map.getZoom()) {
      markerLayer.clearLayers();
    }
    isFlying = true;
    map.flyTo([lat, lon], targetZoom, {
      animate: true,
      duration: 1, // Duration in seconds
    });

    // Set isFlying back to false after animation completes
    setTimeout(() => {
      isFlying = false;
      // Dispatch a single boundschange event after flying completes
      handleBoundsChange();
    }, 1100); // Slightly longer than animation duration to ensure it's complete

    targetLocation = null;
  }

  // Watch for changes to targetLocation and update the map view
  $: if (map && targetLocation) {
    flyTo(targetLocation);
  }

  function handleBoundsChange() {
    if (!map || isFlying) return; // Skip if map is flying

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
      const mapMarker = L.marker([marker.lat, marker.lon], {
        icon: icon,
      }).addTo(markerLayer);

      // Add click handler to dispatch custom markerclick event
      mapMarker.on("click", () => {
        dispatch("markerclick", marker);
      });
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
    &:hover > .marker-icon-circle,
    &.marker-selected > .marker-icon-circle {
      --circle-size: 32px !important;
      box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.35);
    }

    &:hover > .marker-text-container,
    &.marker-selected > .marker-text-container {
      visibility: visible;
      opacity: 1;
    }

    &.marker-selected > .marker-icon-circle {
      border: 6px solid #f00707;
      box-shadow: 8px 8px 16px rgba(0, 0, 0, 0.95);
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
    line-height: 0.9em;
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
