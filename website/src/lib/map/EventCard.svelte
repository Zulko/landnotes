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

  let {
    entry,
    displayPage = true,
    displayLocation = true,
    displayGoToEventLink = false,
    constrainHeight = false,
    keepPopupsWithinMap = false,
  } = $props();
  let people = $state([]);
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
    uiGlobals.mapTravel({
      location: location,
      zoom: 12,
      flyDuration: 0.3,
    });
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
    uiGlobals.mapTravel({
      location: location,
      zoom: appState.zoom,
      flyDuration: 0.3,
    });
    setTimeout(() => {
      const update = {
        paneTab: "same-location-events",
        wikiPage: "",
        selectedMarkerId: entry.id,
      };
      Object.assign(appState, update);
      uiState.sameLocationEvents = [entry, ...entry.same_location_events];
    }, 310);
  }

  function openWikiPage(pageTitle, pageSection) {
    appState.wikiSection = pageSection;
    appState.wikiPage = pageTitle;
    appState.paneTab = "wikipedia";
  }

  function deduplicate(array, idKey) {
    const seen = new Map();
    return array.filter((item) => {
      const value = item[idKey];
      if (seen.has(value)) {
        return false;
      }
      seen.set(value, true);
      return true;
    });
  }
  function parsePeople() {
    if (!entry.people) {
      return [];
    }
    const peopleList = entry.people
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

  function parsePlaces() {
    entry.city_page_title = entry.city_page_title || "";
    if (!entry.where_page_title && !entry.city_page_title) {
      return [];
    }
    const placesWithLinks = [
      ...entry.where_page_title
        .split("|")
        .filter((place) => place.trim().length > 0),
      ...entry.city_page_title
        .split("|")
        .filter((city) => city.trim().length > 0),
    ].map((place) => ({ name: place, hasPage: true }));

    const placeList = (entry.location || "")
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

{#snippet linkedPage(pageTitle, pageSection)}
  <span
    class="wiki-link"
    onclick={() => openWikiPage(pageTitle, pageSection)}
    role="button"
    tabindex="0"
    onkeydown={(e) => {
      if (e.key === "Enter") {
        openWikiPage(pageTitle, pageSection);
      }
    }}
  >
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
        {#snippet popupContent(isOpen)}
          <WikiPreview pageTitle={entry.pageTitle} {isOpen} />
        {/snippet}
        <span class="page-title-wrapper">
          <MapPopup
            {popupContent}
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
        {#each places as place, index}
          {#if place.hasPage}
            {#snippet popupContent(isOpen)}
              <WikiPreview pageTitle={place.name} {isOpen} />
            {/snippet}
            <MapPopup
              {popupContent}
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
        {#each people as person, index}
          {#if person.hasPage}
            {#snippet popupContent(isOpen)}
              <WikiPreview pageTitle={person.name} {isOpen} />
            {/snippet}
            <MapPopup
              {popupContent}
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
    {#snippet popupContent(isOpen)}
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
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    padding: 0;
    overflow: hidden;
    background: #fff;
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
  }

  .event-card .event-card-section {
    display: flex;
    align-items: flex-start;
    margin-bottom: 5px;
    padding-bottom: 5px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
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
    color: #333;
  }
  .event-card-section.location .event-text {
    color: #333;
  }

  .event-card-section.summary .event-text {
    color: #333;
    font-style: italic;
  }

  .wiki-link {
    color: #1a73e8 !important;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
  }

  .wiki-section {
    color: #333;
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
    background-color: white;
    border: 1px solid #3366cc;
    border-radius: 6px;
    padding: 6px 14px;
    font-size: 14px;
    color: #3366cc;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .event-card-section.go-to-event-button button:hover {
    background-color: #f0f5ff;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }

  .event-card-section.go-to-event-button button:focus {
    outline: none;
    box-shadow:
      0 0 0 2px rgba(51, 102, 204, 0.4),
      0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .event-card-section.other-events-button button {
    background-color: white;
    border: 1px solid #3366cc;
    border-radius: 6px;
  }

  .event-card-section.other-events-button button:hover {
    background-color: #f0f5ff;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    cursor: pointer;
  }

  .page-title-wrapper {
    display: inline-block;
    position: relative;
  }
</style>
