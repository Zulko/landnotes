import L from "leaflet";
// @ts-ignore
import MarkerIcon from "./MarkerIcon.svelte";
import { uiGlobals } from "../appState.svelte";
import { mount } from "svelte";
import { isTouchDevice } from "../device";
import { appState } from "../appState.svelte";

const iconSizesByDisplayClass = {
  dot: [18, 18],
  reduced: [28, 28],
  full: [128, 32],
  selected: [128, 32],
};

/**
 * Creates a marker with appropriate behavior based on type
 * @param {Object} options - Options object
 * @param {Object} options.entry - Normalized marker data
 * @returns {L.Marker} - Leaflet marker
 */
export function createMarker({ entry }) {
  // No longer need to normalize here as the entry should already be normalized
  const { divIcon } = createDivIcon({
    entry,
    displayClass: entry.displayClass,
  });
  const marker = L.marker([entry.lat, entry.lon], {
    icon: divIcon,
    pane: entry.displayClass + "MarkersPane",
  });

  bindHoverEvents({ marker, entry });

  return marker;
}

export function updateMarkerIcon({ marker, entry }) {
  const { divIcon } = createDivIcon({
    entry,
    displayClass: entry.displayClass,
  });
  marker.setIcon(divIcon);
}
export function updateMarkerPane(marker, pane) {
  uiGlobals.leafletMap.removeLayer(marker);
  marker.options.pane = pane;
  marker.addTo(uiGlobals.leafletMap);
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
  if (isTouchDevice) {
    selectMarkerAndCenterOnIt({ entry, selectDelay: 350 });
    if (entry.displayClass == "selected") {
      appState.wikiPage = entry.pageTitle;
      appState.paneTab = "wikipedia";
    }
  } else {
    selectMarkerAndCenterOnIt({ entry, selectDelay: 0 });
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

  if (!isTouchDevice) {
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
        const { divIcon } = createDivIcon({
          entry,
          displayClass: entry.displayClass,
        });
        uiGlobals.leafletMap.removeLayer(marker);
        marker.setIcon(divIcon);
        marker.options.pane = entry.displayClass + "MarkersPane";
        marker.addTo(uiGlobals.leafletMap);
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
