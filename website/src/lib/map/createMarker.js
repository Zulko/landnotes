import L from "leaflet";
// @ts-ignore
import EventCard from "./EventCard.svelte";
// @ts-ignore
import MarkerIcon from "./MarkerIcon.svelte";
import { mount, unmount } from "svelte";
import { isTouchDevice } from "../device";
import { appState } from "../appState.svelte";

let lastTappedMarkerEntry = null;

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
 * @param {function} options.mapTravel - Function to navigate to a location on the map
 * @param {Object} options.map - Leaflet map instance
 * @returns {L.Marker} - Leaflet marker
 */
export function createMarker({ entry, mapTravel, map }) {
  // No longer need to normalize here as the entry should already be normalized
  console.log({ entry });
  const { divIcon } = createDivIcon({
    entry,
    displayClass: entry.displayClass,
    mapTravel,
  });
  const marker = L.marker([entry.lat, entry.lon], {
    icon: divIcon,
    pane: entry.displayClass + "MarkersPane",
  });

  // bindHoverPopping(marker, entry, map);
  bindClickEvents({ marker, entry, mapTravel, map });

  return marker;
}

export function updateMarkerIcon({ marker, entry, mapTravel }) {
  const { divIcon } = createDivIcon({
    entry,
    displayClass: entry.displayClass,
    mapTravel,
  });
  marker.setIcon(divIcon);
}
export function updateMarkerPane(marker, map, pane) {
  map.removeLayer(marker);
  marker.options.pane = pane;
  marker.addTo(map);
}

function createDivIcon({ entry, displayClass, mapTravel }) {
  const markerDiv = document.createElement("div");
  const markerComponent = mount(MarkerIcon, {
    target: markerDiv,
    props: { entry, onClick: () => onClick(entry, mapTravel) },
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

function onClick(entry, mapTravel) {
  if (isTouchDevice) {
    selectMarkerAndCenterOnIt({ entry, mapTravel, selectDelay: 350 });
    if (entry.displayClass == "selected") {
      appState.wikiPage = entry.pageTitle;
    }
  } else {
    selectMarkerAndCenterOnIt({ entry, mapTravel, selectDelay: 0 });
    appState.wikiPage = entry.pageTitle;
  }
}

/**
 * Create appropriate popup based on marker type and bind click events
 * @param {Object} options - Configuration options
 * @param {L.Marker} options.marker - Leaflet marker object
 * @param {Object} options.entry - Normalized marker data
 * @param {Function} options.mapTravel - Function to navigate to a location on the map
 * @param {L.Map} options.map - Leaflet map instance
 */
function bindClickEvents({ marker, entry, mapTravel, map }) {
  let isHovered = false;
  let unhoverTimeout = null;

  if (!isTouchDevice) {
    marker.on("mouseover", () => {
      clearTimeout(unhoverTimeout);
      if (isHovered) return;
      map.removeLayer(marker);
      const [width, height] = iconSizesByDisplayClass["full"];
      marker.options.icon.options.iconSize = [width, height];
      marker.options.pane = "topPane";
      console.log(map.getPanes(), marker);
      marker.addTo(map);
      isHovered = true;
    });
    marker.on("mouseout", () => {
      unhoverTimeout = setTimeout(() => {
        const { divIcon } = createDivIcon({
          entry,
          displayClass: entry.displayClass,
          mapTravel,
        });
        map.removeLayer(marker);
        marker.setIcon(divIcon);
        marker.options.pane = entry.displayClass + "MarkersPane";
        marker.addTo(map);
        isHovered = false;
      }, 100);
    });
  }

  // if (entry.isEvent) {
  //   // Event popup handling on mobile and device:
  //   // first set up the popup and functions to open/close.

  //   if (isTouchDevice) {
  //     // Event markers with popup on touch devices
  //     // Use only one event handler for opening popup on touch devices
  //     marker.on("click", function () {
  //       selectMarkerAndCenterOnIt({ entry, mapTravel, selectDelay: 350 });
  //       if (entry.displayClass == "selected") {
  //         appState.wikiPage = entry.pageTitle;
  //       }
  //     });
  //   } else {
  //     marker.on("click", function () {
  //       selectMarkerAndCenterOnIt({ entry, mapTravel, selectDelay: 0 });
  //       appState.wikiPage = entry.pageTitle;
  //     });
  //   }
  // } else {
  //   // marker is a place marker
  //   if (isTouchDevice) {
  //     marker.on("click", function () {
  //       selectMarkerAndCenterOnIt({ entry, mapTravel, selectDelay: 350 });
  //       if (entry.displayClass == "selected") {
  //         appState.wikiPage = entry.pageTitle;
  //       }
  //     });
  //   } else {
  //     marker.on("click", function () {
  //       selectMarkerAndCenterOnIt({ entry, mapTravel, selectDelay: 0 });
  //       appState.wikiPage = entry.pageTitle;
  //     });
  //   }
  // }
}

function selectMarkerAndCenterOnIt({ entry, mapTravel, selectDelay = 0 }) {
  setTimeout(() => {
    appState.selectedMarkerId = entry.id;
  }, selectDelay);
  mapTravel({
    location: { lat: entry.lat, lon: entry.lon },
    flyDuration: 0.3,
  });
}
