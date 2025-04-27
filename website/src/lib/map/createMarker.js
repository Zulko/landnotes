import L from "leaflet";
// @ts-ignore
import EventPopup from "./EventPopup.svelte";
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
  const { divIcon } = createDivIcon(entry, entry.displayClass);
  const marker = L.marker([entry.lat, entry.lon], {
    icon: divIcon,
    pane: entry.displayClass === "selected" ? "selectedMarker" : "markers",
  });

  // bindHoverPopping(marker, entry, map);
  bindClickEvents({ marker, entry, mapTravel, map });

  return marker;
}

export function updateMarkerIcon(marker, entry) {
  const { divIcon } = createDivIcon(entry, entry.displayClass);
  marker.setIcon(divIcon);
}
export function updateMarkerPane(marker, map, pane) {
  map.removeLayer(marker);
  marker.options.pane = pane;
  marker.addTo(map);
}

function createDivIcon(entry, displayClass) {
  const markerDiv = document.createElement("div");
  const markerComponent = mount(MarkerIcon, {
    target: markerDiv,
    props: { entry },
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
        const { divIcon } = createDivIcon(entry, entry.displayClass);
        map.removeLayer(marker);
        marker.setIcon(divIcon);
        marker.options.pane =
          entry.displayClass === "selected" ? "selectedMarker" : "markers";
        marker.addTo(map);
        isHovered = false;
      }, 100);
    });
  }

  if (entry.isEvent) {
    // Event popup handling on mobile and device:
    // first set up the popup and functions to open/close.
    const popupDiv = document.createElement("div");

    let popupCloseTimeout = null;
    let popupComponent;
    let touchListener = null;

    function startPopupCloseTimeout() {
      popupCloseTimeout = setTimeout(() => {
        marker.closePopup();
      }, 100);
    }
    function stopPopupCloseTimeout() {
      clearTimeout(popupCloseTimeout);
      clearTimeout(unhoverTimeout);
    }

    marker.bindPopup(popupDiv, {
      className: "event-marker-popup",
      closeButton: false,
      maxWidth: 300,
      minWidth: 300,
    });

    if (isTouchDevice) {
      // Event markers with popup on touch devices
      // Use only one event handler for opening popup on touch devices
      marker.on("click", function () {
        console.log("clicked!", entry.id, lastTappedMarkerEntry?.id);
        mapTravel({
          location: { lat: entry.lat, lon: entry.lon },
          flyDuration: 0.3,
        });
        if (lastTappedMarkerEntry?.id === entry.id) {
          selectMarkerAndCenterOnIt({ entry, mapTravel, selectDelay: 350 });
        } else {
          // First tap → show popup
          lastTappedMarkerEntry = entry;
          console.log("setting last tapped marker entry", entry.id);
        }
      });
    } else {
      // Event markers with popup on mouse/desktop devices
      marker.on("click", function () {
        selectMarkerAndCenterOnIt(entry, mapTravel);
      });

      marker.on("mouseover", function () {
        stopPopupCloseTimeout();
        marker.options.icon.options.iconSize[0] = 200;
        marker.openPopup();
      });

      marker.on("mouseout", function () {
        startPopupCloseTimeout();
      });
    }

    // Generic behavior for events

    marker.on("popupclose", () => {
      unmount(popupComponent);
      // Remove the touch listener when popup closes
      if (isTouchDevice && touchListener) {
        document.removeEventListener("touchstart", touchListener);
        touchListener = null;
      }
    });

    marker.on("popupopen", () => {
      popupComponent = mount(EventPopup, {
        target: popupDiv,
        props: {
          entry,
          startPopupCloseTimeout,
          stopPopupCloseTimeout,
        },
      });

      // Setup touch listener when popup opens
      if (isTouchDevice) {
        function handleTouchOutside(e) {
          // Check if popup is open and the touch is not on the popup
          console.log("touch outside!");
          lastTappedMarkerEntry = null;
          if (marker.isPopupOpen()) {
            const popup = marker.getPopup();
            const popupEl = popup.getElement();

            // If touch target is not inside the popup and not the marker element
            if (
              !popupEl.contains(e.target) &&
              !e.target.closest(".custom-div-icon")
            ) {
              console.log("closing popup!");
              marker.closePopup();
            }
          }
        }
        touchListener = handleTouchOutside;
        document.addEventListener("touchstart", touchListener);
      }
    });
  } else {
    // marker is a place marker
    if (isTouchDevice) {
      marker.on("click", function () {
        selectMarkerAndCenterOnIt({ entry, mapTravel, selectDelay: 350 });
        if (entry.displayClass == "selected") {
          appState.wikiPage = entry.pageTitle;
        }
      });
    } else {
      marker.on("click", function () {
        selectMarkerAndCenterOnIt({ entry, mapTravel, selectDelay: 0 });
        appState.wikiPage = entry.pageTitle;
      });
    }
  }
}

function selectMarkerAndCenterOnIt({ entry, mapTravel, selectDelay = 0 }) {
  setTimeout(() => {
    console.log("dddd");
    appState.selectedMarkerId = entry.id;
  }, selectDelay);
  mapTravel({
    location: { lat: entry.lat, lon: entry.lon },
    flyDuration: 0.3,
  });
}
