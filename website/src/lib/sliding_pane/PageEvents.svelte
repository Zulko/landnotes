<script>
  import { onMount } from "svelte";
  import EventCard from "../map/EventCard.svelte";
  import { getPageEvents } from "../data/page_data.svelte";
  import { getEventsById } from "../data/events_data";
  import { normalizeMapEntryInfo } from "../data/mapEntries.svelte";
  import { appState } from "../appState.svelte";

  let { wikiPage } = $props();
  let eventIdsByYear = $state({});
  let loadingEvents = $state(true);
  let expandedYears = $state({});
  let dataLoadedByYear = $state({});

  $effect(() => {
    loadEventList(wikiPage);
  });

  async function loadEventList(wikiPage) {
    loadingEvents = true;
    // Fetch basic event list for the page
    eventIdsByYear = await getPageEvents(wikiPage);
    dataLoadedByYear = {};
    for (const year in eventIdsByYear) {
      expandedYears[year] = false;
    }
    console.log("eventIdsByYear", eventIdsByYear);

    const allEventIds = Object.values(eventIdsByYear).flat();
    console.log("allEventIds", allEventIds);

    if (allEventIds.length > 0 && allEventIds.length < 100) {
      await loadAllEvents(allEventIds);
    }
    loadingEvents = false;
  }

  async function loadAllEvents(allEventIds) {
    const rawEventInfos = await getEventsById(allEventIds);
    const eventInfos = rawEventInfos.map(normalizeMapEntryInfo);
    console.log("eventInfos", rawEventInfos, eventInfos);
    const eventInfosById = eventInfos.reduce((acc, event) => {
      acc[event.id] = event;
      return acc;
    }, {});
    Object.entries(eventIdsByYear).forEach(([year, yearEventIds]) => {
      console.log({ year, yearEventIds, eventInfosById });
      dataLoadedByYear[year] = yearEventIds
        .map((id) => eventInfosById[id])
        .sort((a, b) => a.start_date.localeCompare(b.start_date));
      console.log("dataLoadedByYear[year]", dataLoadedByYear[year]);
      expandedYears[year] = true;
    });
  }

  async function toggleYear(year) {
    const toggledValue = !expandedYears[year];
    if (toggledValue && !dataLoadedByYear[year]) {
      dataLoadedByYear[year] = await loadEventData(year);
    }
    expandedYears[year] = toggledValue;

    // If year is being expanded and data isn't loaded yet, mark it as loaded
    // In a real implementation, this might trigger additional data loading
    if (expandedYears[year] && !dataLoadedByYear[year]) {
      dataLoadedByYear[year] = true;
    }
  }

  async function loadEventData(year) {
    const eventsByYear = await getEventsById(eventIdsByYear[year]);
    return eventsByYear
      .map(normalizeMapEntryInfo)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }
</script>

<div class="page-events">
  <h1>Events in <i>{wikiPage}</i></h1>

  {#if loadingEvents}
    <div class="loading">Loading events...</div>
  {:else if Object.keys(eventIdsByYear).length === 0}
    <div class="no-events">No events found for this page.</div>
  {:else}
    {#each Object.entries(eventIdsByYear) as [year, yearEventIds]}
      <div class="year-section">
        <div
          class="year-header"
          onclick={() => toggleYear(year)}
          onkeydown={(e) => e.key === "Enter" && toggleYear(year)}
          role="button"
          tabindex="0"
        >
          <h2>{year}</h2>
          <span class="event-count"
            >{yearEventIds.length} event{yearEventIds.length !== 1
              ? "s"
              : ""}</span
          >
          <span class="expand-icon">{expandedYears[year] ? "▼" : "►"}</span>
        </div>

        {#if expandedYears[year]}
          <div class="year-events">
            {#each dataLoadedByYear[year] as event}
              <EventCard entry={event} />
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>

<style>
  .page-events {
    padding: 16px;
    overflow-y: auto;
  }

  h1 {
    margin-bottom: 24px;
    font-size: 24px;
  }

  .loading,
  .no-events {
    padding: 20px;
    text-align: center;
    color: #666;
  }

  .year-section {
    margin-bottom: 16px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
  }

  .year-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background-color: #f5f5f5;
    cursor: pointer;
    user-select: none;
  }

  .year-header:hover {
    background-color: #eeeeee;
  }

  .year-header h2 {
    margin: 0;
    font-size: 18px;
    flex-grow: 1;
  }

  .event-count {
    margin-right: 12px;
    color: #666;
  }

  .expand-icon {
    font-size: 12px;
    color: #666;
  }

  .year-events {
    padding: 12px;
    background-color: white;
  }

  .year-events :global(.event-card) {
    margin-bottom: 12px;
    border: 1px solid #eaeaea;
    border-radius: 6px;
  }

  .year-events :global(.event-card:last-child) {
    margin-bottom: 0;
  }
</style>
