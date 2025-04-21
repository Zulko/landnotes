import md5 from "blueimp-md5";
import L from "leaflet";
import EventPopup from "./EventPopup.svelte";
import { mount, unmount } from "svelte";
const basePath = import.meta.env.BASE_URL;

function getWikipediaImagePath(filename) {
  // Handle special characters in Wikipedia image filenames
  // This function properly encodes URI components for Wikipedia's URL structure
  const filenameClean = filename.replace(/ /g, "_");
  const md5Hex = md5(filenameClean);

  // Extract directory path
  const first = md5Hex.charAt(0);
  const second = md5Hex.charAt(1);

  const path = `${first}/${first}${second}`;
  return path;
}

function getWikipediaImageUrl(imageName, domain = "commons") {
  const wikiImageSubpath = getWikipediaImagePath(imageName);
  const wikiEndpoint = `https://upload.wikimedia.org/wikipedia/${domain}/thumb`;
  const sanitizedImageName = imageName.replace(/ /g, "_");
  let url = `${wikiEndpoint}/${wikiImageSubpath}/${sanitizedImageName}/120px-${sanitizedImageName}`;
  // Check if the URL doesn't end with jpg or png (case insensitive)
  const lowerUrl = url.toLowerCase();
  if (!lowerUrl.endsWith(".jpg") && !lowerUrl.endsWith(".png")) {
    url += ".png";
  }

  return url;
}

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

function computeMarkerHtml(entry, zoom) {
  const icon = iconByType[entry.category] || iconByType.other;
  const unsanitized_page_title = entry.page_title.replaceAll("_", " ");

  let label = entry.name;
  if (!entry.name) {
    label = unsanitized_page_title;
  } else if (unsanitized_page_title.includes(entry.name)) {
    label = unsanitized_page_title;
  } else {
    const fullLabel = entry.name + " - " + unsanitized_page_title;
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

export function createGeoDivIcon(entry, displayClass, zoom) {
  const markerHtml = computeMarkerHtml(entry, zoom);

  const iconSizesByDisplayClass = {
    dot: [18, 18],
    reduced: [28, 28],
    full: [128, 32],
    selected: [128, 32],
  };

  return L.divIcon({
    className: "custom-div-icon",
    html: markerHtml,
    iconSize: iconSizesByDisplayClass[displayClass],
  });
}

function bindGeomarkerPopup(marker, imageName) {
  const wikiImageUrl = getWikipediaImageUrl(imageName);
  const popupContent = `<img class="geo-popup-img" src="${wikiImageUrl}" alt="" class="popup-img">`;
  marker.bindPopup(popupContent, {
    className: "geo-marker-popup",
    closeButton: false,
    maxWidth: 120,
    minWidth: 120,
  });
  marker.on("mouseover", function (e) {
    marker.options.icon.options.iconSize[0] = 120;
    marker.openPopup();
  });

  marker.on("mouseout", function (e) {
    marker.closePopup();
  });
}

function createGeoMarker(entry, displayClass, pane, zoom) {
  const divIcon = createGeoDivIcon(entry, displayClass, zoom);
  const marker = L.marker([entry.lat, entry.lon], {
    icon: divIcon,
    pane: pane,
  });

  if (entry.image) {
    bindGeomarkerPopup(marker, entry.image);
  }
  return marker;
}

function bindEventMarkerPopup(marker, entry) {
  console.log("here!", { entry });
  const popupDiv = document.createElement("div");
  let popupComponent;
  marker.bindPopup(popupDiv, {
    className: "event-marker-popup",
    closeButton: false,
    maxWidth: 300,
    minWidth: 300,
  });

  marker.on("mouseover", function (e) {
    marker.options.icon.options.iconSize[0] = 200;
    marker.openPopup();
  });
  marker.on("popupclose", () => {
    unmount(popupComponent);
  });
  marker.on("popupopen", () => {
    popupComponent = mount(EventPopup, {
      target: popupDiv,
      props: { entry },
    });
  });

  // marker.on("mouseout", function (e) {
  //   marker.closePopup();
  // });
}

function createEventMarker(entry, displayClass, pane, zoom) {
  const divIcon = createGeoDivIcon(entry, displayClass, zoom);
  const marker = L.marker([entry.lat, entry.lon], {
    icon: divIcon,
    pane: pane,
  });
  bindEventMarkerPopup(marker, entry);

  return marker;
}

export function createMarker(entry, displayClass, pane, zoom) {
  if (entry.when) {
    return createEventMarker(entry, displayClass, pane, zoom);
  } else {
    return createGeoMarker(entry, displayClass, pane, zoom);
  }
}
