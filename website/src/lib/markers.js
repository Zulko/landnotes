import L from "leaflet";
// @ts-ignore
import EventPopup from "./EventPopup.svelte";
// @ts-ignore
import Marker from "./Marker.svelte";
import { mount, unmount } from "svelte";
const basePath = import.meta.env.BASE_URL;
let lastTappedMarkerEntry = null;
import { isTouchDevice } from "./device";

const iconByPlaceType = {
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
const iconsByEventType = {
  birth: "baby",
  death: "skull",
  award: "trophy",
  release: "book-marked",
  work: "briefcase-business",
  travel: "luggage",
};
const iconByType = {
  ...iconByPlaceType,
  ...iconsByEventType,
};

/**
 * Adapts marker data to a consistent format regardless of type (place or event)
 * @param {Object} entry - Original data entry
 * @returns {Object} - Normalized marker data
 */
export function normalizeMarkerData(entry) {
  // Determine marker type
  const isEvent = Boolean(entry.when);

  // Return a normalized object with consistent property names
  const pageTitle = entry.page_title
    ? entry.page_title.replaceAll("_", " ")
    : "";
  return {
    ...entry,
    id: isEvent ? entry.event_id : entry.geokey,
    name: entry.name || pageTitle,
    pageTitle,
    displayClass: entry.displayClass || "dot",
    category: entry.category || "other",
    isEvent,
    iconName: iconByType[entry.category] || iconByType.other,
  };
}
const iconSizesByDisplayClass = {
  dot: [18, 18],
  reduced: [28, 28],
  full: [128, 32],
  selected: [128, 32],
};

export function createDivIcon(entry, displayClass) {
  const markerDiv = document.createElement("div");
  const markerComponent = mount(Marker, {
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
export function setMarkerSize(marker, displayClass) {
  const element = marker.getElement();
  const [width, height] = iconSizesByDisplayClass[displayClass];
  if (element) {
    element.style.height = `${height}px`;
    element.style.width = `${width}px`;
  }
}

/**
 * Create appropriate popup based on marker type
 * @param {L.Marker} marker - Leaflet marker object
 * @param {Object} entry - Normalized marker data
 */
function bindClickEvents({
  marker,
  entry,
  onMarkerClick,
  goTo,
  map,
  openWikiPage,
}) {
  let isHovered = false;
  let unhoverTimeout = null;

  if (!isTouchDevice) {
    marker.on("mouseover", () => {
      clearTimeout(unhoverTimeout);
      if (isHovered) return;
      console.log("mouseover", entry.id);
      map.removeLayer(marker);
      const [width, height] = iconSizesByDisplayClass["full"];
      marker.options.icon.options.iconSize = [width, height];
      marker.options.pane = "markers-top";
      marker.addTo(map);
      isHovered = true;
    });
    marker.on("mouseout", () => {
      unhoverTimeout = setTimeout(() => {
        const { divIcon } = createDivIcon(entry, entry.displayClass);
        map.removeLayer(marker);
        marker.setIcon(divIcon);
        marker.options.pane = "markers";
        marker.addTo(map);
        isHovered = false;
      }, 100);
    });
  }

  if (entry.isEvent) {
    // Event popup handling on mobile and device:
    // first set up the popup and functions to open/close.
    const popupDiv = document.createElement("div");
    popupDiv.style.zIndex = "9999 !important"; // Set maximum z-order

    let popupCloseTimeout = null;
    let popupComponent;
    let touchListener = null;

    function startPopupCloseTimeout() {
      popupCloseTimeout = setTimeout(() => {
        marker.closePopup();
      }, 100);
    }
    function stopPopupCloseTimeout() {
      console.log("PREVENT CLOSING");
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
        goTo({
          location: { lat: entry.lat, lon: entry.lon },
          flyDuration: 0.3,
        });
        if (lastTappedMarkerEntry?.id === entry.id) {
          onMarkerClick(entry);
        } else {
          // First tap → show popup
          lastTappedMarkerEntry = entry;
          console.log("setting last tapped marker entry", entry.id);
        }
      });
    } else {
      // Event markers with popup on mouse/desktop devices
      marker.on("click", function () {
        onMarkerClick(entry);
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
          openWikiPage,
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
        onMarkerClick(entry);
      });
    } else {
      marker.on("click", function () {
        console.log("WAAAAAAAS CLICKED");
        onMarkerClick(entry);
      });
    }
  }
}

/**
 * Creates a marker with appropriate behavior based on type
 * @param {Object} entry - Normalized marker data
 * @param {function} onMarkerClick - Function to call when marker is clicked
 * @param {function} goTo - Function to call when marker is clicked
 * @returns {L.Marker} - Leaflet marker
 */
export function createMarker({
  entry,
  onMarkerClick,
  goTo,
  map,
  openWikiPage,
}) {
  // No longer need to normalize here as the entry should already be normalized
  const { divIcon } = createDivIcon(entry, entry.displayClass);
  const marker = L.marker([entry.lat, entry.lon], {
    icon: divIcon,
    pane: "markers",
  });

  // bindHoverPopping(marker, entry, map);
  bindClickEvents({ marker, entry, onMarkerClick, goTo, map, openWikiPage });

  return marker;
}
