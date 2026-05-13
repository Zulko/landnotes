<script>
  import { onMount } from "svelte";
  import MapPopup from "./MapPopup.svelte";
  import { appState, uiGlobals, uiState } from "../appState.svelte";
  import WikiPreview from "./WikiPreview.svelte";
  import {
    parseEventDate,
    startAndEndDateToDateSetting,
  } from "../data/date_utils";
  const basePath = import.meta.env.BASE_URL;

  /**
   * @typedef {Record<string, any>} EventEntry
   *
   * @typedef {Object} LinkedItem
   * @property {string} name
   * @property {boolean} hasPage
   */

  /** @type {{ entry: EventEntry, displayPage?: boolean, displayLocation?: boolean, displayGoToEventLink?: boolean, constrainHeight?: boolean, keepPopupsWithinMap?: boolean }} */
  let {
    entry,
    displayPage = true,
    displayLocation = true,
    displayGoToEventLink = false,
    constrainHeight = false,
    keepPopupsWithinMap = false,
  } = $props();
  /** @type {LinkedItem[]} */
  let people = $state([]);
  /** @type {LinkedItem[]} */
  let places = $state([]);
  let fontSize = $state(14);
  onMount(() => {
    places = parsePlaces();
    people = parsePeople();
    const summaryLength = entry.summary?.length || 0;
    const totalItems =
      (entry.pageTitle?.length + entry.page_section?.length > 30 ? 1 : 0) +
      people.length +
      places.length +
      summaryLength / 40;
    fontSize = constrainHeight
      ? totalItems > 7
        ? 12
        : totalItems > 5
          ? 13
          : 14
      : 14;
  });

  function setStateToEvent() {
    const location = entry.location.lat
      ? $state.snapshot(entry.location)
      : $state.snapshot(entry.locations_latlon[0]);
    const mapTravel =
      /** @type {((options: { location: any, zoom: number, flyDuration: number, reserveMobilePane?: boolean }) => void) | null} */ (
        uiGlobals.mapTravel
      );
    if (mapTravel) {
      mapTravel({
        location: location,
        zoom: 12,
        flyDuration: 0.3,
      });
    }
    if (uiGlobals.isTouchDevice) {
      appState.wikiPage = "";
      appState.wikiSection = "";
      appState.paneTab = "wikipedia";
    }
    setTimeout(() => {
      const parsedStartDate = parseEventDate(entry.start_date);
      const parsedEndDate = parseEventDate(entry.end_date);
      const date = startAndEndDateToDateSetting(parsedStartDate, parsedEndDate);
      const update = {
        mode: "events",
        date,
        selectedMarkerId: entry.id,
      };
      Object.assign(appState, update);
    }, 310);
  }

  function openSameLocationEvents() {
    const location = entry.location?.lat
      ? $state.snapshot(entry.location)
      : $state.snapshot(entry.locations_latlon[0]);
    const mapTravel =
      /** @type {((options: { location: any, zoom: number, flyDuration: number, reserveMobilePane?: boolean }) => void) | null} */ (
        uiGlobals.mapTravel
      );
    if (mapTravel) {
      mapTravel({
        location: location,
        zoom: appState.zoom,
        flyDuration: 0.3,
        reserveMobilePane: true,
      });
    }
    setTimeout(() => {
      const update = {
        paneTab: "same-location-events",
        wikiPage: "",
        selectedMarkerId: entry.id,
      };
      Object.assign(appState, update);
      Object.assign(uiState, {
        sameLocationEvents: [entry, ...entry.same_location_events],
      });
    }, 310);
  }

  /**
   * @param {string} pageTitle
   * @param {string} [pageSection]
   */
  function openWikiPage(pageTitle, pageSection) {
    appState.wikiSection = /** @type {string} */ (pageSection);
    appState.wikiPage = pageTitle;
    appState.paneTab = "wikipedia";
  }

  /**
   * @template {Record<string, unknown>} T
   * @param {T[]} array
   * @param {keyof T} idKey
   * @returns {T[]}
   */
  function deduplicate(array, idKey) {
    /** @type {unknown[]} */
    const seen = [];
    return array.filter((item) => {
      const value = item[idKey];
      if (seen.includes(value)) {
        return false;
      }
      seen.push(value);
      return true;
    });
  }

  /** @returns {LinkedItem[]} */
  function parsePeople() {
    if (!entry.people) {
      return [];
    }
    /** @type {LinkedItem[]} */
    const peopleList = /** @type {string} */ (entry.people)
      .split("|")
      .map((person) => {
        const hasPage = !person.trim().endsWith("(?)");
        return {
          name: person
            .trim()
            .replace(/\(\?\)$/, "")
            .trim(),
          hasPage,
        };
      })
      .map((person) => {
        // Check if entry.pageTitle starts with person.name or vice versa
        if (
          entry.pageTitle &&
          (entry.pageTitle.startsWith(person.name) ||
            person.name.startsWith(entry.pageTitle))
        ) {
          return {
            name: entry.pageTitle,
            hasPage: true,
          };
        }
        return person;
      });
    const filteredList = peopleList
      .filter((person) => person.name.toLowerCase() !== "unknown")
      .filter((person) => !places.some((place) => place.name === person.name));
    return deduplicate(filteredList, "name");
  }

  /** @returns {LinkedItem[]} */
  function parsePlaces() {
    entry.city_page_title = entry.city_page_title || "";
    if (!entry.where_page_title && !entry.city_page_title) {
      return [];
    }
    /** @type {string[]} */
    const linkedPlaceNames = [
      .../** @type {string} */ (entry.where_page_title)
        .split("|")
        .filter((place) => place.trim().length > 0),
      .../** @type {string} */ (entry.city_page_title)
        .split("|")
        .filter((city) => city.trim().length > 0),
    ];
    /** @type {LinkedItem[]} */
    const placesWithLinks = [
      ...linkedPlaceNames.map((place) => ({ name: place, hasPage: true })),
    ];

    const locationNames = /** @type {string} */ (entry.location || "");
    /** @type {LinkedItem[]} */
    const placeList = locationNames
      .split(/[\|,]/)
      .map((location) => {
        return location
          .trim()
          .replace(/\(\?\)$/, "")
          .replace("?", "")
          .trim();
      })
      .filter((location) => location.length > 0)
      .filter(
        (location) =>
          !placesWithLinks.some(
            (place) =>
              location.includes(place.name) || place.name.includes(location)
          )
      )
      .map((location) => ({ name: location, hasPage: false }));

    return deduplicate([...placesWithLinks, ...placeList], "name");
  }
</script>

{#snippet linkedPage(
  /** @type {string} */ pageTitle,
  /** @type {string | undefined} */ pageSection = undefined
)}
  <span class="wiki-link">
    {pageTitle}
  </span>
{/snippet}

<div
  class="event-card"
  style={constrainHeight
    ? `max-height: ${uiGlobals.isTouchDevice ? "230px" : "230px"}; font-size: ${fontSize}px;`
    : ""}
>
  {#if displayPage}
    <div class="event-card-section page">
      <div class="event-icon">
        <img src="{basePath}icons/text-search.svg" alt="search" />
      </div>
      <div class="event-text">
        {#snippet popupContent(/** @type {boolean} */ isOpen)}
          <WikiPreview pageTitle={entry.pageTitle} {isOpen} />
        {/snippet}
        <span class="page-title-wrapper">
          <MapPopup
            {popupContent}
            popupLabel={`Wikipedia preview for ${entry.pageTitle}`}
            triggerLabel={`Open Wikipedia page for ${entry.pageTitle}`}
            onTriggerActivate={() =>
              openWikiPage(entry.pageTitle, entry.page_section)}
            enterable={false}
            keepWithinMap={keepPopupsWithinMap}
          >
            from <i
              >"{@render linkedPage(entry.pageTitle, entry.page_section)}"</i
            >
          </MapPopup>
        </span>
        {#if entry.page_section && entry.page_section !== "Root"}
          <span class="wiki-section">
            ({entry.page_section})
          </span>
        {/if}
      </div>
    </div>
  {/if}
  <div class="event-card-section when">
    <div class="event-icon">
      <img src="{basePath}icons/calendar-fold.svg" alt="calendar" />
    </div>
    <div class="event-text">{entry.when}</div>
  </div>
  {#if displayLocation}
    <div class="event-card-section location">
      <div class="event-icon">
        <img src="{basePath}icons/map.svg" alt="map" />
      </div>
      <div class="event-text">
        {#each places as place, index (place.name)}
          {#if place.hasPage}
            {#snippet popupContent(/** @type {boolean} */ isOpen)}
              <WikiPreview pageTitle={place.name} {isOpen} />
            {/snippet}
            <MapPopup
              {popupContent}
              popupLabel={`Wikipedia preview for ${place.name}`}
              triggerLabel={`Open Wikipedia page for ${place.name}`}
              onTriggerActivate={() => openWikiPage(place.name)}
              enterable={false}
              keepWithinMap={keepPopupsWithinMap}
            >
              {@render linkedPage(place.name)}
            </MapPopup>
          {:else}
            {place.name}
          {/if}
          {#if index < places.length - 1}
            <br />
          {/if}
        {/each}
      </div>
    </div>
  {/if}
  {#if people.length > 0}
    <div class="event-card-section people">
      <div class="event-icon">
        <img src="{basePath}icons/square-user-round.svg" alt="person" />
      </div>
      <div class="event-text">
        {#each people as person, index (person.name)}
          {#if person.hasPage}
            {#snippet popupContent(/** @type {boolean} */ isOpen)}
              <WikiPreview pageTitle={person.name} {isOpen} />
            {/snippet}
            <MapPopup
              {popupContent}
              popupLabel={`Wikipedia preview for ${person.name}`}
              triggerLabel={`Open Wikipedia page for ${person.name}`}
              onTriggerActivate={() => openWikiPage(person.name)}
              enterable={false}
              keepWithinMap={keepPopupsWithinMap}
            >
              {@render linkedPage(person.name)}
            </MapPopup>
          {:else}
            {person.name}
          {/if}
          {#if index < people.length - 1}
            <br />
          {/if}
        {/each}
      </div>
    </div>
  {/if}
  <div class="event-card-section summary">
    <div class="event-icon">
      <img src="{basePath}icons/newspaper.svg" alt="newspaper" />
    </div>
    {#snippet popupContent(/** @type {boolean} */ isOpen)}
      <WikiPreview pageTitle={entry.pageTitle} {isOpen} />
    {/snippet}
    <div class="event-text">
      {entry.summary}
    </div>
  </div>
  {#if displayGoToEventLink}
    <div class="event-card-section go-to-event-button">
      <button onclick={setStateToEvent}> See in context </button>
    </div>
  {/if}
  {#if entry.same_location_events && entry.same_location_events.length > 0}
    <div class="event-card-section other-events-button">
      <button onclick={openSameLocationEvents}>
        See {entry.same_location_events.length} other events
      </button>
    </div>
  {/if}
</div>

<style>
  :global(.event-marker-popup .leaflet-popup-content-wrapper) {
    border-radius: var(--ln-radius-lg);
    box-shadow: var(--ln-shadow-md);
    padding: 0;
    overflow: hidden;
    background: var(--ln-color-surface);
  }

  :global(.event-marker-popup .leaflet-popup-content) {
    margin: 0;
  }

  .event-card {
    padding: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, sans-serif;
    cursor: default;
    overflow-y: auto;
    color: var(--ln-color-text);
  }

  .event-card .event-card-section {
    display: flex;
    align-items: flex-start;
    margin-bottom: 5px;
    padding-bottom: 5px;
    border-bottom: 1px solid var(--ln-color-border-muted);
  }

  .event-card .event-card-section:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .event-card .event-icon {
    flex: 0 0 24px;
    margin-right: 12px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .event-card .event-icon img {
    width: 18px;
    height: 18px;
    opacity: 0.7;
  }

  .event-card .event-text {
    flex: 1;
    /* font-size: 14px; */
    line-height: 1.4;
  }

  .event-card-section.when .event-text {
    color: var(--ln-color-text);
  }
  .event-card-section.location .event-text {
    color: var(--ln-color-text);
  }

  .event-card-section.summary .event-text {
    color: var(--ln-color-text-muted);
    font-style: italic;
  }

  .wiki-link {
    color: var(--ln-color-primary) !important;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
  }

  .wiki-section {
    color: var(--ln-color-text-muted);
    font-style: italic;
  }

  .event-card-section.go-to-event-button {
    justify-content: flex-start;
    border-bottom: none;
    margin-top: 8px;
  }

  .event-card-section.go-to-event-button button {
    display: inline-flex;
    align-items: center;
    background-color: var(--ln-color-surface);
    border: 1px solid var(--ln-color-primary);
    border-radius: var(--ln-radius-md);
    padding: 6px 14px;
    min-height: 36px;
    font-size: 14px;
    color: var(--ln-color-primary);
    cursor: pointer;
    transition: all var(--ln-transition-base);
    box-shadow: var(--ln-shadow-sm);
  }

  .event-card-section.go-to-event-button button:hover {
    background-color: var(--ln-color-primary-soft);
    box-shadow: var(--ln-shadow-md);
  }

  .event-card-section.go-to-event-button button:focus {
    outline: none;
    box-shadow:
      0 0 0 3px var(--ln-color-focus-ring),
      var(--ln-shadow-sm);
  }

  .event-card-section.other-events-button button {
    background-color: var(--ln-color-surface);
    border: 1px solid var(--ln-color-primary);
    border-radius: var(--ln-radius-md);
    color: var(--ln-color-primary);
    padding: 6px 14px;
    min-height: 36px;
    transition: all var(--ln-transition-base);
  }

  .event-card-section.other-events-button button:hover {
    background-color: var(--ln-color-primary-soft);
    box-shadow: var(--ln-shadow-md);
    cursor: pointer;
  }

  .page-title-wrapper {
    display: inline-block;
    position: relative;
  }

  @media (max-width: 768px) {
    .event-card-section.go-to-event-button button,
    .event-card-section.other-events-button button {
      min-height: var(--ln-space-touch);
    }
  }
</style>
