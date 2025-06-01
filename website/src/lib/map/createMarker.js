import L from "leaflet";
// @ts-ignore
import MarkerIcon from "./MarkerIcon.svelte";
import { uiGlobals } from "../appState.svelte";
import { mount, unmount } from "svelte";
import { appState } from "../appState.svelte";

const iconSizesByDisplayClass = {
  dot: [18, 18],
  reduced: [28, 28],
  full: [128, 32],
  selected: [128, 32],
};

// Store component references to properly unmount them
const markerComponents = new WeakMap();

/**
 * Creates a marker with appropriate behavior based on type
 * @param {Object} options - Options object
 * @param {Object} options.entry - Normalized marker data
 * @returns {L.Marker} - Leaflet marker
 */
export function createMarker({ entry }) {
  // No longer need to normalize here as the entry should already be normalized
  const { divIcon, markerComponent } = createDivIcon({
    entry,
    displayClass: entry.displayClass,
  });
  const marker = L.marker([entry.lat, entry.lon], {
    icon: divIcon,
    pane: entry.displayClass + "MarkersPane",
  });

  // Store the component reference
  markerComponents.set(marker, markerComponent);

  bindHoverEvents({ marker, entry });

  return marker;
}

export function updateMarkerIcon({ marker, entry }) {
  // Unmount the old component before creating a new one
  const oldComponent = markerComponents.get(marker);
  if (oldComponent) {
    unmount(oldComponent);
  }

  const { divIcon, markerComponent } = createDivIcon({
    entry,
    displayClass: entry.displayClass,
  });
  marker.setIcon(divIcon);
  
  // Store the new component reference
  markerComponents.set(marker, markerComponent);
}

export function updateMarkerPane(marker, pane) {
  uiGlobals.leafletMap.removeLayer(marker);
  marker.options.pane = pane;
  marker.addTo(uiGlobals.leafletMap);
}

export function cleanupMarker(marker) {
  // Unmount the Svelte component when the marker is removed
  const component = markerComponents.get(marker);
  if (component) {
    unmount(component);
    markerComponents.delete(marker);
  }
}

function createDivIcon({ entry, displayClass }) {
  const markerDiv = document.createElement("div");
  const markerComponent = mount(MarkerIcon, {
    target: markerDiv,
    props: { entry, onClick: () => onClick(entry) },
  });

  return {
    divIcon: L.divIcon({
      className: "custom-div-icon",
      html: markerDiv,
      iconSize: iconSizesByDisplayClass[displayClass],
    }),
    markerComponent,
  };
}

function onClick(entry) {
  if (uiGlobals.isTouchDevice) {
    selectMarkerAndCenterOnIt({ entry, selectDelay: 350 });
    if (entry.displayClass == "selected") {
      appState.wikiSection = entry.page_section;
      appState.wikiPage = entry.pageTitle;
      appState.paneTab = "wikipedia";
    }
  } else {
    selectMarkerAndCenterOnIt({ entry, selectDelay: 0 });
    appState.wikiSection = entry.page_section;
    appState.wikiPage = entry.pageTitle;
    appState.paneTab = "wikipedia";
  }
}

/**
 * Create appropriate popup based on marker type and bind click events
 * @param {Object} options - Configuration options
 * @param {L.Marker} options.marker - Leaflet marker object
 * @param {Object} options.entry - Normalized marker data
 */
function bindHoverEvents({ marker, entry }) {
  let isHovered = false;
  let unhoverTimeout = null;

  if (!uiGlobals.isTouchDevice) {
    marker.on("mouseover", () => {
      clearTimeout(unhoverTimeout);
      if (isHovered) return;
      uiGlobals.leafletMap.removeLayer(marker);
      const [width, height] = iconSizesByDisplayClass["full"];
      marker.options.icon.options.iconSize = [width, height];
      marker.options.pane = "topPane";
      marker.addTo(uiGlobals.leafletMap);
      isHovered = true;
    });
    marker.on("mouseout", () => {
      unhoverTimeout = setTimeout(() => {
        // Unmount the old component before creating a new one
        const oldComponent = markerComponents.get(marker);
        if (oldComponent) {
          unmount(oldComponent);
        }

        const { divIcon, markerComponent } = createDivIcon({
          entry,
          displayClass: entry.displayClass,
        });
        uiGlobals.leafletMap.removeLayer(marker);
        marker.setIcon(divIcon);
        marker.options.pane = entry.displayClass + "MarkersPane";
        marker.addTo(uiGlobals.leafletMap);
        
        // Store the new component reference
        markerComponents.set(marker, markerComponent);
        
        isHovered = false;
      }, 100);
    });
  }
}

function selectMarkerAndCenterOnIt({ entry, selectDelay = 0 }) {
  setTimeout(() => {
    appState.selectedMarkerId = entry.id;
  }, selectDelay);
  uiGlobals.mapTravel({
    location: { lat: entry.lat, lon: entry.lon },
    flyDuration: 0.3,
  });
}
