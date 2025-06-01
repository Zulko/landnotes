<script>
  import { onMount, onDestroy } from "svelte";
  import { mount, unmount } from "svelte";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import {
    createMarker,
    updateMarkerIcon,
    updateMarkerPane,
  } from "./createMarker";
  import { mapEntries, mapBounds } from "../data/mapEntries.svelte";
  import { appState, uiGlobals } from "../appState.svelte";
  import SearchBarMenu from "../menu/SearchBarMenu.svelte";

  // ===== STATE VARIABLES =====
  let mapElement;
  let map;
  let markerLayer = null;
  let dotMarkerLayer = null;
  let isFlying = false;
  let currentMarkers = new Map(); // key: marker.geokey, value: L.marker object
  let currentDotMarkers = new Map(); // key: marker.geokey, value: L.marker object
  let resizeObserver;
  let boundsChangeTimeout = null;
  let handleBoundChangesAfterFlyToTimeOut = null;
  let fixZoomAfterFlyToTimeOut = null;
  let searchBarComponent = null; // Store the mounted component reference

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
      if (uiGlobals.isTouchDevice) {
        map.off("dragstart", () => (appState.selectedMarker = null));
      }
      map.remove();
      map = null;
    }

    if (resizeObserver) {
      resizeObserver.disconnect();
    }

    if (searchBarComponent) {
      unmount(searchBarComponent);
      searchBarComponent = null;
    }
  });

  // ===== REACTIVE DECLARATIONS =====

  $effect(() => {
    if (mapEntries.markerInfos && map) {
      updateMarkers();
    }
  });

  $effect(() => {
    if (mapEntries.dots && map) {
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
    uiGlobals["leafletMap"] = map;

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
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        minZoom: 2,
      }
    ).addTo(map);

    // Add zoom control to bottom right

    // Create and add custom search control
    const searchControl = L.control({ position: "topleft" });
    searchControl.onAdd = function (map) {
      const container = L.DomUtil.create(
        "div",
        "leaflet-bar custom-search-control"
      );

      // Create a container for the Svelte component
      const searchContainer = L.DomUtil.create("div", "search-bar-container");
      container.appendChild(searchContainer);

      // Mount the SearchBarMenu component
      searchBarComponent = mount(SearchBarMenu, { target: searchContainer });

      L.DomEvent.disableClickPropagation(container);
      return container;
    };
    searchControl.addTo(map);

    L.control
      .zoom({
        position: "bottomright",
      })
      .addTo(map);

    // Create layer groups for different marker types
    const panes = {
      dots: 200,
      reducedMarkersPane: 450,
      fullMarkersPane: 500,
      selectedMarkersPane: 550,
      topPane: 620,
    };
    for (const [key, value] of Object.entries(panes)) {
      map.createPane(key);
      map.getPane(key).style.zIndex = value;
    }

    markerLayer = L.layerGroup().addTo(map);
    dotMarkerLayer = L.layerGroup().addTo(map);

    // Add event listeners
    map.on("moveend", handleBoundsChange);
    map.on("zoomend", handleBoundsChange);
    map.on("resize", handleBoundsChange);
    if (uiGlobals.isTouchDevice) {
      map.on("dragstart", () => (appState.selectedMarkerId = null));
    }
  }

  // ===== MAP CONTROL FUNCTIONS =====
  export function mapTravel({ location, zoom, flyDuration }) {
    const { lat, lon } = location;
    clearTimeout(handleBoundChangesAfterFlyToTimeOut);
    clearTimeout(fixZoomAfterFlyToTimeOut);

    // If target zoom is less than current zoom, clear markers first
    zoom = zoom || map.getZoom();
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
  uiGlobals.mapTravel = mapTravel;

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
      const { lat, lng: lon } = bounds.getCenter();
      Object.assign(appState, {
        zoom: map.getZoom(),
        location: { lat, lon },
      });
      Object.assign(mapBounds, formattedBounds);
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
    for (const entry of mapEntries.markerInfos) {
      const markerId = entry.id;
      let displayClass = entry.displayClass;

      let marker;
      if (currentMarkers.has(markerId)) {
        // Reuse existing marker configuration with updated properties
        const { existingMarker, existingClass } = currentMarkers.get(markerId);

        marker = existingMarker;

        // Only update icon if display class changed
        if (existingClass !== displayClass) {
          updateMarkerIcon({ marker, entry });
          if (displayClass === "selected" || existingClass === "selected") {
            const pane = displayClass + "MarkersPane";
            updateMarkerPane(marker, pane);
          }
        }
      } else {
        marker = createMarker({ entry });
      }
      marker.addTo(newMarkerLayer);
      newMarkers.set(markerId, {
        existingMarker: marker,
        existingClass: displayClass,
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

    for (const dotEntry of mapEntries.dots) {
      const markerId = dotEntry.id || `${dotEntry.lat}-${dotEntry.lon}`;
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
          pane: "dots",
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

  :global(.leaflet-popup-content) {
    margin: 0;
    padding: 0;
  }

  :global(.leaflet-popup-tip) {
    background-color: rgba(255, 255, 255, 0.9);
  }

  /* :global(.leaflet-popup-pane) {
    z-index: 599 !important;
  } */
  :global(.leaflet-popup-tip) {
    display: none;
  }

  :global(.leaflet-fade-anim .leaflet-popup) {
    transition: none;
  }

  /* Custom search control styles */
  :global(.leaflet-container .leaflet-top.leaflet-left .custom-search-control) {
    background: none !important;
    border: none !important;
    box-shadow: none !important;
    /* Center horizontally at the top with responsive width */
    top: 10px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    position: absolute !important;
    width: 80% !important;
    max-width: 500px !important;
  }

  /* Alternative more specific override */
  :global(.leaflet-container .custom-search-control) {
    top: 10px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    position: absolute !important;
    width: 80% !important;
    max-width: 500px !important;
  }

  /* Override the parent container positioning */
  :global(.leaflet-container .leaflet-top.leaflet-left) {
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
  }

  :global(.search-bar-container) {
    width: 100%;
  }

  /* Override any margin/padding from the SearchBarMenu when in map control */
  :global(.custom-search-control .search-container) {
    margin-bottom: 0;
    width: 100%;
  }
</style>
