<script>
  import { onMount, onDestroy } from "svelte";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import { createMarker } from "./markers";

  // ===== PROPS =====
  let { mapEntries, mapDots, onMapBoundsChange, onMarkerClick } = $props();
  // ===== STATE VARIABLES =====
  let mapElement;
  let map;
  let markerLayer = null;
  let dotMarkerLayer = null;
  let isFlying = false;
  let hoveredMarkerId = null;
  let currentMarkers = new Map(); // key: marker.geokey, value: L.marker object
  let currentDotMarkers = new Map(); // key: marker.geokey, value: L.marker object
  let resizeObserver;
  let boundsChangeTimeout = null;
  let handleBoundChangesAfterFlyToTimeOut = null;
  let fixZoomAfterFlyToTimeOut = null;

  // ===== LIFECYCLE METHODS =====
  onMount(() => {
    initializeMap();
    updateMarkers();

    // Initialize ResizeObserver
    resizeObserver = new ResizeObserver(() => {
      if (map) map.invalidateSize();
    });
    resizeObserver.observe(mapElement);
  });

  onDestroy(() => {
    if (map) {
      map.off("moveend", handleBoundsChange);
      map.off("zoomend", handleBoundsChange);
      map.off("resize", handleBoundsChange);
      map.remove();
      map = null;
    }

    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  });

  // ===== REACTIVE DECLARATIONS =====

  $effect(() => {
    if (mapEntries && map) {
      updateMarkers();
    }
  });

  $effect(() => {
    if (mapDots && map) {
      updateDotMarkers();
    }
  });

  // ===== MAP INITIALIZATION =====
  function initializeMap() {
    // Initialize the map
    map = L.map(mapElement, {
      zoomControl: false,
      worldCopyJump: true,
    }).setView([0, 0], 2);

    // Add tile layer (OpenStreetMap)
    // L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    //   attribution:
    //     '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    // }).addTo(map);

    // Add a lightweight but visually appealing tile layer
    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      // "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      // "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      // "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      // "https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png",
      // "https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        minZoom: 2,
      }
    ).addTo(map);

    // Add zoom control to bottom right
    L.control
      .zoom({
        position: "bottomright",
      })
      .addTo(map);
    // Create layer groups for different marker types
    const markerLayers = [
      { name: "dot", zIndex: 200 },
      { name: "reduced", zIndex: 300 },
      { name: "full", zIndex: 400 },
      { name: "hovered", zIndex: 500 },
      { name: "selected", zIndex: 600 },
    ];

    markerLayers.forEach((layer) => {
      map.createPane(layer.name);
      map.getPane(layer.name).style.zIndex = layer.zIndex;
    });

    markerLayer = L.layerGroup().addTo(map);
    dotMarkerLayer = L.layerGroup().addTo(map);

    // Add event listeners
    map.on("moveend", handleBoundsChange);
    map.on("zoomend", handleBoundsChange);
    map.on("resize", handleBoundsChange);
  }

  // ===== MAP CONTROL FUNCTIONS =====
  export function goTo({ location, zoom, flyDuration }) {
    const { lat, lon } = location;
    clearTimeout(handleBoundChangesAfterFlyToTimeOut);
    clearTimeout(fixZoomAfterFlyToTimeOut);

    // If target zoom is less than current zoom, clear markers first
    if (zoom < map.getZoom()) {
      markerLayer.clearLayers();
    }

    if (flyDuration == 0) {
      map.setView([lat, lon], zoom, {
        animate: false,
        duration: 0,
      });
    } else {
      isFlying = true;
      map.flyTo([lat, lon], zoom, {
        animate: true,
        duration: flyDuration, // Duration in seconds
      });
      // this fixes a bug in leaflet where it looses track of the zoom level after a flyto
      fixZoomAfterFlyToTimeOut = setTimeout(
        function () {
          map.setZoom(zoom);
        },
        1000 * flyDuration + 50
      );

      // Set isFlying back to false after animation completes
      handleBoundChangesAfterFlyToTimeOut = setTimeout(
        () => {
          isFlying = false;
          // Activate single boundschange event after flying completes
          handleBoundsChange();
        },
        1000 * flyDuration + 50
      ); // Slightly longer than animation duration
    }
  }

  // ===== EVENT HANDLERS =====
  function handleBoundsChange() {
    if (!map || isFlying) return;

    const bounds = map.getBounds();
    const formattedBounds = {
      minLat: bounds._southWest.lat,
      maxLat: bounds._northEast.lat,
      minLon: bounds._southWest.lng,
      maxLon: bounds._northEast.lng,
    };

    // Debounce the effect to avoid too frequent updates
    clearTimeout(boundsChangeTimeout);
    boundsChangeTimeout = setTimeout(() => {
      onMapBoundsChange({
        bounds: formattedBounds,
        center: bounds.getCenter(),
        zoom: map.getZoom(),
      });
    }, 200);
  }

  function handleResize() {
    if (map) {
      // Use a small timeout to ensure the resize happens after CSS transitions complete
      setTimeout(() => {
        map.invalidateSize({ animate: true });
        // Trigger a bounds change to update markers if needed
        handleBoundsChange();
      }, 300); // Match this with your CSS transition duration
    }
  }

  // ===== MARKER MANAGEMENT =====
  function updateMarkers() {
    if (!map) return;

    const newMarkerLayer = L.layerGroup();
    const newMarkers = new Map();

    // Create or update markers
    for (const entry of mapEntries) {
      const markerId = entry.event_id || entry.geokey;
      let displayClass = entry.displayClass;
      let pane = entry.displayClass;

      if (hoveredMarkerId === markerId && displayClass !== "selected") {
        console.log(entry.page_title, hoveredMarkerId, markerId);
        displayClass = "full";
        pane = "hovered";
      }

      let marker;
      let isExistingMarker = false;
      if (currentMarkers.has(markerId)) {
        // Reuse existing marker configuration with updated properties
        const { existingMarker, existingClass, existingPane } =
          currentMarkers.get(markerId);

        // Only update icon if display class changed
        // console.log(entry.page_title, existingClass, displayClass);
        if (existingClass !== displayClass || pane !== existingPane) {
          marker = createMarker(entry, displayClass, pane, map.getZoom());
        } else {
          marker = existingMarker;
          isExistingMarker = true;
        }
      } else {
        marker = createMarker(entry, displayClass, pane, map.getZoom());
      }

      // Add event handlers
      if (!isExistingMarker) {
        marker.on("click", () => {
          onMarkerClick(entry);
        });

        marker.on("mouseover", () => {
          if (hoveredMarkerId !== markerId) {
            hoveredMarkerId = markerId;
            updateMarkers();
          }
        });
      }
      marker.addTo(newMarkerLayer);
      newMarkers.set(markerId, {
        existingMarker: marker,
        existingClass: displayClass,
        existingPane: pane,
      });
    }

    // Swap the layer groups
    if (markerLayer) {
      map.removeLayer(markerLayer);
    }
    newMarkerLayer.addTo(map);
    markerLayer = newMarkerLayer;
    currentMarkers = newMarkers;
  }

  function updateDotMarkers() {
    if (!map) return;

    const newDotMarkerLayer = L.layerGroup();
    const newDotMarkers = new Map();

    for (const dotEntry of mapDots) {
      const markerId = dotEntry.event_id || dotEntry.geokey;
      let marker;

      // Simply reuse the existing marker if it exists
      if (currentDotMarkers.has(markerId)) {
        marker = currentDotMarkers.get(markerId).existingMarker;
        // Update position in case it changed
        // marker.setLatLng([dotEntry.lat, dotEntry.lon]);
      } else {
        // Create new marker only for new entries
        marker = L.circleMarker([dotEntry.lat, dotEntry.lon], {
          radius: 4,
          weight: 1,
          color: map.getZoom() < 7 ? "#777" : "#111",
          fillColor: "white",
          fillOpacity: 1,
          pane: "dot",
        });
      }
      marker.addTo(newDotMarkerLayer);
      newDotMarkers.set(markerId, {
        existingMarker: marker,
        displayClass: "dot",
      });
    }

    // Swap the layer groups
    if (dotMarkerLayer) {
      map.removeLayer(dotMarkerLayer);
    }
    newDotMarkerLayer.addTo(map);
    dotMarkerLayer = newDotMarkerLayer;
    currentDotMarkers = newDotMarkers;
  }

  // ===== EXPORTED FUNCTIONS =====
  export function invalidateMapSize() {
    handleResize();
  }
</script>

<div class="map-container" bind:this={mapElement} onresize={handleResize}></div>

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
    &:hover > .undermarker {
      display: none;
    }
    &:hover > .marker-icon-circle,
    &.marker-display-selected > .marker-icon-circle {
      --circle-size: 32px !important;
      box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.35);
      z-index: 1000 !important;
    }

    &.marker-display-selected > .undermarker {
      display: none;
    }

    &.marker-display-selected {
      /* Ensure hovered markers appear above others */
      z-index: 1000 !important;
    }

    &:hover > .marker-text-container,
    &.marker-display-selected > .marker-text-container {
      visibility: visible;
      opacity: 1;
    }

    &.marker-display-selected > .marker-icon-circle {
      border: 6px solid #f00707;
      box-shadow: 8px 8px 16px rgba(0, 0, 0, 0.95);
    }

    &.marker-display-full > .marker-text-container {
      visibility: visible;
      opacity: 1;
    }

    &.marker-display-full > .marker-icon-circle {
      --circle-size: 32px;
      box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.35);
    }

    &.marker-display-reduced > .marker-icon-circle {
      --circle-size: 24px;
    }

    &.marker-display-dot > .marker-icon-circle {
      --circle-size: 18px;
    }
    &.marker-display-dot > .marker-icon-circle > img {
      width: calc(var(--circle-size) * 0.8);
      height: calc(var(--circle-size) * 0.8);
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
    -webkit-text-stroke-linejoin: round;
    text-stroke-linejoin: round;
    z-index: 1;
  }

  :global(.geo-marker-popup) {
    border-radius: 0px;
    padding: 0;
    margin: 0;
  }

  :global(.geo-marker-popup .leaflet-popup-content) {
    margin: 0;
    padding: 0;
  }

  :global(.geo-marker-popup .leaflet-popup-tip) {
    background-color: rgba(255, 255, 255, 0.9);
  }

  :global(.leaflet-popup-pane) {
    z-index: 499 !important;
  }

  :global(.geo-marker-popup .leaflet-popup-content-wrapper) {
    background-color: transparent !important;
  }
  :global(.geo-marker-popup img) {
    max-width: 150px;
    max-height: 150px;
    display: block;
    margin: 0 auto;
  }
</style>
