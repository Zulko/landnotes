import L from "leaflet";
// @ts-ignore
import EventPopup from "./EventPopup.svelte";
// @ts-ignore
import Marker from "./Marker.svelte";
import { mount, unmount } from "svelte";
const basePath = import.meta.env.BASE_URL;

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

  const normalizedEntry = {
    ...entry,
    id: isEvent ? entry.event_id : entry.geokey,
    name:
      entry.name ||
      (entry.page_title ? entry.page_title.replaceAll("_", " ") : ""),
    pageTitle: entry.page_title ? entry.page_title.replaceAll("_", " ") : "",
    displayClass: entry.displayClass || "dot",
    category: entry.category || "other",
    isEvent,
    getIconName: function () {
      return iconByType[this.category] || iconByType.other;
    },
  };
  return normalizedEntry;
}

function computeMarkerHtml(entry, zoom) {
  // No longer need to normalize here as the entry should already be normalized
  const icon = entry.getIconName();

  let label = entry.name;
  if (entry.name !== entry.pageTitle) {
    const fullLabel = entry.name + " - " + entry.pageTitle;
    if (fullLabel.length <= 30) {
      label = fullLabel;
    }
  }

  let markerCountDiv = "";
  return `
    <div class="map-marker marker-display-${entry.displayClass}" >
        ${markerCountDiv}
        <div class="marker-icon-circle">
          <img src="${basePath}icons/${icon}.svg">
        </div>
        
        <div class="marker-text-container">
          <div class="marker-text marker-text-outline">${label}</div>
          <div class="marker-text">${label}</div>
        </div>
      </div>
    `;
}

export function createDivIcon(entry, displayClass) {
  const markerDiv = document.createElement("div");
  const markerComponent = mount(Marker, {
    target: markerDiv,
    props: { entry },
  });

  const iconSizesByDisplayClass = {
    dot: [18, 18],
    reduced: [28, 28],
    full: [128, 32],
    selected: [128, 32],
  };

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
 * Create appropriate popup based on marker type
 * @param {L.Marker} marker - Leaflet marker object
 * @param {Object} entry - Normalized marker data
 */
function bindMarkerPopup(marker, entry) {
  if (entry.isEvent) {
    // Event popup handling
    const popupDiv = document.createElement("div");
    let popupCloseTimeout = null;
    let popupComponent;

    function startPopupCloseTimeout() {
      popupCloseTimeout = setTimeout(() => {
        marker.closePopup();
      }, 100);
    }
    function stopPopupCloseTimeout() {
      clearTimeout(popupCloseTimeout);
    }

    marker.bindPopup(popupDiv, {
      className: "event-marker-popup",
      closeButton: false,
      maxWidth: 300,
      minWidth: 300,
    });

    marker.on("mouseover", function () {
      stopPopupCloseTimeout();
      marker.options.icon.options.iconSize[0] = 200;
      marker.openPopup();
    });

    marker.on("mouseout", function () {
      startPopupCloseTimeout();
    });

    marker.on("popupclose", () => {
      unmount(popupComponent);
    });

    marker.on("popupopen", () => {
      popupComponent = mount(EventPopup, {
        target: popupDiv,
        props: { entry, startPopupCloseTimeout, stopPopupCloseTimeout },
      });
    });
  }
}

/**
 * Creates a marker with appropriate behavior based on type
 * @param {Object} entry - Normalized marker data
 * @param {string} displayClass - Display class
 * @param {string} pane - Map pane to place marker on
 * @param {number} zoom - Current zoom level
 * @returns {L.Marker} - Leaflet marker
 */
export function createMarker(entry, displayClass, pane, zoom) {
  // No longer need to normalize here as the entry should already be normalized
  const { divIcon, markerComponent } = createDivIcon(entry, displayClass);

  const marker = L.marker([entry.lat, entry.lon], {
    icon: divIcon,
    pane: pane,
  });

  bindMarkerPopup(marker, entry);

  return marker;
}
