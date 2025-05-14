<script>
  import EventCard from "../map/EventCard.svelte";
  import { getPageEvents } from "../data/page_data.svelte";
  import { getEventsById } from "../data/events_data";
  import { normalizeMapEntryInfo } from "../data/mapEntries.svelte";

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

    const allEventIds = Object.values(eventIdsByYear).flat();

    if (allEventIds.length > 0 && allEventIds.length < 500) {
      await loadAllEvents(allEventIds);
    }
    loadingEvents = false;
  }

  async function loadAllEvents(allEventIds) {
    const rawEventInfos = await getEventsById(allEventIds);
    const eventInfos = rawEventInfos.map(normalizeMapEntryInfo);
    const eventInfosById = eventInfos.reduce((acc, event) => {
      acc[event.id] = event;
      return acc;
    }, {});
    Object.entries(eventIdsByYear).forEach(([year, yearEventIds]) => {
      dataLoadedByYear[year] = yearEventIds
        .map((id) => eventInfosById[id])
        .sort((a, b) => a.start_date.localeCompare(b.start_date));
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
              <div class="event-card-container">
                <EventCard
                  entry={event}
                  displayPage={event.pageTitle !== wikiPage}
                  displayGoToEventLink={true}
                />
              </div>
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
    color: #222;
    font-family: sans-serif;
  }

  h1 {
    margin-bottom: 16px;
    font-size: 1.8em;
    font-weight: normal;
    border-bottom: 1px solid #a2a9b1;
    padding-bottom: 0.2em;
  }

  .loading,
  .no-events {
    padding: 12px 0;
    color: #72777d;
  }

  .year-section {
    margin-bottom: 8px;
  }

  .year-header {
    display: flex;
    align-items: center;
    padding: 4px 0;
    cursor: pointer;
    user-select: none;
    border-bottom: 1px solid #eaecf0;
  }

  .year-header:hover {
    background-color: #f8f9fa;
  }

  .year-header h2 {
    margin: 0;
    font-size: 1.3em;
    font-weight: normal;
    flex-grow: 1;
  }

  .event-count {
    margin-right: 8px;
    color: #72777d;
    font-size: 0.85em;
  }

  .expand-icon {
    color: #72777d;
    font-size: 0.8em;
    width: 16px;
    text-align: center;
  }

  .year-events {
    padding: 8px 0 12px 20px;
  }

  .year-events :global(.event-card) {
    margin-bottom: 8px;
    border: none;
    background-color: transparent;
  }

  .year-events :global(.event-card:last-child) {
    margin-bottom: 0;
  }

  .event-card-container {
    margin-bottom: 8px;
    border: 1px solid #eaeaea;
    border-radius: 6px;
    padding: 12px;
    background-color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
</style>
