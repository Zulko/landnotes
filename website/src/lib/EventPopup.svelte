<script>
  import { onMount } from "svelte";
  import WikiTooltip from "./WikiTooltip.svelte";
  const basePath = import.meta.env.BASE_URL;

  let { entry, startPopupCloseTimeout, stopPopupCloseTimeout, openWikiPage } =
    $props();
  let people = $state([]);
  let places = $state([]);

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
  onMount(() => {
    places = parsePlaces();
    people = parsePeople();
  });
</script>

{#snippet linkedPage(pageTitle)}
  <span class="wiki-link"> {pageTitle} </span>
{/snippet}

<div
  class="event-popup"
  role="tooltip"
  onmouseover={stopPopupCloseTimeout}
  onmouseout={startPopupCloseTimeout}
  onblur={startPopupCloseTimeout}
  onfocus={stopPopupCloseTimeout}
>
  <div class="event-popup-section when">
    <div class="event-icon">
      <img src="{basePath}icons/calendar-fold.svg" alt="calendar" />
    </div>
    <div class="event-text">{entry.when}</div>
  </div>
  <div class="event-popup-section location">
    <div class="event-icon">
      <img src="{basePath}icons/map.svg" alt="map" />
    </div>
    <div class="event-text">
      {#each places as place, index}
        {#if place.hasPage}
          <WikiTooltip
            pageTitle={place.name}
            snippet={linkedPage}
            {openWikiPage}
          />
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
    <div class="event-popup-section people">
      <div class="event-icon">
        <img src="{basePath}icons/square-user-round.svg" alt="person" />
      </div>
      <div class="event-text">
        {#each people as person, index}
          {#if person.hasPage}
            <WikiTooltip
              pageTitle={person.name}
              snippet={linkedPage}
              {openWikiPage}
            />
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
  <div class="event-popup-section summary">
    <div class="event-icon">
      <img src="{basePath}icons/newspaper.svg" alt="newspaper" />
    </div>
    <div class="event-text">
      {entry.summary}
      <span
        class="wiki-link"
        onclick={() => openWikiPage(entry.pageTitle)}
        onkeydown={(e) => e.key === "Enter" && openWikiPage(entry.pageTitle)()}
        role="button"
        tabindex="0"
      >
        (learn more)
      </span>
    </div>
  </div>
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

  .event-popup {
    padding: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, sans-serif;
  }

  .event-popup .event-popup-section {
    display: flex;
    align-items: flex-start;
    margin-bottom: 5px;
    padding-bottom: 5px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }

  .event-popup .event-popup-section:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .event-popup .event-icon {
    flex: 0 0 24px;
    margin-right: 12px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .event-popup .event-icon img {
    width: 18px;
    height: 18px;
    opacity: 0.7;
  }

  .event-popup .event-text {
    flex: 1;
    font-size: 14px;
    line-height: 1.4;
  }

  .event-popup-section.when .event-text {
    color: #333;
  }
  .event-popup-section.location .event-text {
    color: #333;
  }

  .event-popup-section.people .event-text {
    font-weight: 500;
  }

  .event-popup-section.summary .event-text {
    color: #333;
    font-style: italic;
  }

  .wiki-link {
    color: #1a73e8 !important;
    text-decoration: none;
    cursor: pointer;
  }
</style>
