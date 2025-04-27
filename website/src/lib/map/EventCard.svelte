<script>
  import { onMount } from "svelte";
  import MapPopup from "./MapPopup.svelte";
  import { appState } from "../appState.svelte";
  import WikiPreview from "./WikiPreview.svelte";
  import { constrainedDate, parseEventDate } from "../data/date_utils";
  const basePath = import.meta.env.BASE_URL;

  let { entry, displayPage = true, displayGoToEventLink = false } = $props();
  let people = $state([]);
  let places = $state([]);

  onMount(() => {
    places = parsePlaces();
    people = parsePeople();
  });

  function setStateToEvent() {
    console.log("entry", entry);
    const location = entry.location.lat
      ? entry.location
      : entry.locations_latlon[0];
    const update = {
      mode: "events",
      date: constrainedDate(parseEventDate(entry.start_date)),
      selectedMarkerId: entry.id,
      zoom: 14,
      location: location,
    };
    console.log("update", update);
    Object.assign(appState, update);
  }

  function openWikiPage(pageTitle) {
    appState.wikiPage = pageTitle;
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
    const placeList = entry.location
      .split(/[\|,]/)
      .map((location) => {
        const hasPage = !location.trim().endsWith("(?)");
        const isGuess = location.trim().endsWith("?");
        return {
          name: location
            .trim()
            .replace(/\(\?\)$/, "")
            .replace("?", "")
            .trim(),
          hasPage,
          isGuess,
        };
      })
      .filter((location) => location.name.length > 0)
      .map((location) => {
        // Check if entry.pageTitle starts with location.name or vice versa
        if (
          entry.pageTitle &&
          (entry.pageTitle.startsWith(location.name) ||
            location.name.startsWith(entry.pageTitle))
        ) {
          return {
            name: entry.pageTitle,
            hasPage: true,
          };
        }
        return location;
      });
    const filteredList = placeList
      .filter((location) => location.name.toLowerCase() !== "unknown")
      .filter((location) => location.name.length > 0);
    return deduplicate(filteredList, "name");
  }
</script>

{#snippet linkedPage(pageTitle)}
  <span
    class="wiki-link"
    onclick={() => openWikiPage(pageTitle)}
    role="button"
    tabindex="0"
    onkeydown={(e) => {
      if (e.key === "Enter") {
        openWikiPage(pageTitle);
      }
    }}
  >
    {pageTitle}
  </span>
{/snippet}

<div class="event-card">
  {#if displayPage}
    <div class="event-card-section page">
      <div class="event-icon">
        <img src="{basePath}icons/text-search.svg" alt="search" />
      </div>
      <div class="event-text">
        {#snippet popupContent(isOpen)}
          <WikiPreview pageTitle={entry.pageTitle} {isOpen} />
        {/snippet}
        <MapPopup {popupContent} enterable={false}>
          from <i>"{@render linkedPage(entry.pageTitle)}"</i>
        </MapPopup>
      </div>
    </div>
  {/if}
  <div class="event-card-section when">
    <div class="event-icon">
      <img src="{basePath}icons/calendar-fold.svg" alt="calendar" />
    </div>
    <div class="event-text">{entry.when}</div>
  </div>
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
          <MapPopup {popupContent} enterable={false}>
            {@render linkedPage(place.name)}
          </MapPopup>
        {:else}
          {place.name}
        {/if}
        {#if place.isGuess}
          <span class="guess">(likely)</span>
        {/if}
        {#if index < places.length - 1}
          <br />
        {/if}
      {/each}
    </div>
  </div>
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
            <MapPopup {popupContent} enterable={false}>
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
    <div class="event-card-section focus-map">
      <button onclick={setStateToEvent}>
        <div class="event-icon">
          <img src="{basePath}icons/map.svg" alt="map" />
        </div>
        See in context
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
    font-size: 14px;
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
</style>
