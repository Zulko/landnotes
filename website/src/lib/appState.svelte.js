/**
 * State Management Module
 *
 * This module manages the central state for the application and handles the
 * bidirectional synchronization between the application state and URL parameters.
 *
 * Key responsibilities:
 * - Maintains the global application state using Svelte's reactive state system
 * - Provides functions to update the URL based on state changes
 * - Parses URL parameters to restore application state
 * - Handles browser history integration for navigation
 *
 * The state includes information about:
 * - Current view mode (places/events)
 * - Map position and zoom level
 * - Selected markers and content
 * - Date filters for events mode
 * - Other application-wide settings
 */

import { geohashToLatLon, latLonToGeohash } from "./mapEntries/geohash";

const stateDefaults = {
  mode: "places",
  strictDate: true,
  date: { year: 1810, month: 3, day: "all" },
  zoom: 1,
  location: null,
  selectedMarkerId: null,
  wikiPage: "",
};

export const appState = $state(stateDefaults);
let dontPushToHistory = $state(false);

$effect.root(() => {
  // When the app state changes in any way, update the URL params
  $effect(() => {
    const state = $state.snapshot(appState);
    debouncedUpdateURLParams(state);
  });
});

/**
 * Updates the URL parameters based on the current application state
 *
 * This function converts the application state into URL parameters and updates
 * the browser's URL without reloading the page. It handles map position, selected
 * markers, and event-specific parameters like date and strictDate.
 *
 * @param {Object} state - The current application state
 * @param {Object} [state.location] - The current map location (lat/lon)
 * @param {number} [state.zoom] - The current map zoom level
 * @param {string} [state.selectedMarkerId] - ID of the currently selected marker
 * @param {string} [state.mode] - Current application mode (e.g., "places" or "events")
 * @param {Object} [state.date] - Current date selection for events mode
 * @param {boolean} [state.strictDate] - Whether to use strict date matching for events
 * @param {string} [state.wikiPage] - The current wiki page
 * @param {boolean} [addToHistory=true] - Whether to add the state to browser history
 *                                        (true = pushState, false = replaceState)
 */
export function updateURLParams(state, addToHistory = true) {
  const { location, zoom, selectedMarkerId, mode, date, strictDate, wikiPage } =
    state;
  const params = new URLSearchParams();

  // Add map position parameters if they exist
  if (location) {
    const geohash = latLonToGeohash(location.lat, location.lon, 8);
    params.set("location", `${geohash}-${zoom}`);
  }
  if (selectedMarkerId) {
    params.set("selected", selectedMarkerId);
  }
  if (mode === "events") {
    if (date) {
      params.set("date", dateToString(date));
    }
    if (strictDate) {
      params.set("strictDate", strictDate ? "true" : "false");
    }
  }
  if (wikiPage) {
    params.set("wikiPage", wikiPage);
  }

  // Update URL without reloading the page
  const newUrl = `${window.location.pathname}?${params.toString()}`;

  if (params.toString() === window.location.search.slice(1)) {
    console.log("Skipping pushstate because the url is the same");
    return;
  }

  if (addToHistory) {
    window.history.pushState(state, "", newUrl);
  } else {
    window.history.replaceState(state, "", newUrl);
  }
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
function updateURLParamsOnStateChange(appState) {
  if (dontPushToHistory) return;
  updateURLParams(appState, true);
}

const debouncedUpdateURLParams = debounce(updateURLParamsOnStateChange, 500);

export function dateToString(date) {
  if (!date) {
    return null;
  }
  if (date.month === "all") {
    return `${date.year}`;
  } else if (date.day === "all") {
    return `${date.year}--${date.month}`;
  } else {
    return `${date.year}--${date.month}--${date.day}`;
  }
}

// ------------------------------------------
// Reading the URL params into the app state
// ------------------------------------------

export function setStateFromURLParams() {
  dontPushToHistory = true;
  const urlState = readURLParams();
  Object.assign(appState, { ...stateDefaults, ...urlState });
  setTimeout(() => {
    dontPushToHistory = false;
  }, 3000);
  return urlState;
}

/**
 * Reads application state from URL parameters
 *
 * @returns {Object} - Object containing parsed parameters and selected marker
 */
export function readURLParams() {
  const params = new URLSearchParams(window.location.search);

  // Get map position parameters
  const result = {};
  const location = params.get("location");
  if (location) {
    const [geohash, zoom] = location.split("-");
    result.location = geohashToLatLon(geohash);
    result.zoom = parseInt(zoom);
  }
  result.selectedMarkerId = params.get("selected");
  const date = params.get("date");
  if (date) {
    result.mode = "events";
    result.date = parseDate(date);
    result.strictDate = params.get("strictDate") === "true";
  } else {
    result.mode = "places";
    result;
  }
  return result;
}

export function parseDate(dateString) {
  if (!dateString) {
    return null;
  }
  const components = dateString.split("--");
  if (components.length === 1) {
    const year = parseInt(components[0]);
    return {
      year: year,
      month: year < 1500 ? "all" : 1,
      day: year < 1920 ? "all" : 1,
    };
  } else if (components.length === 2) {
    const [year, month] = components;
    return {
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(year) < 1920 ? "all" : 1,
    };
  } else if (components.length === 3) {
    const [year, month, day] = components;
    return {
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day),
    };
  }
}
