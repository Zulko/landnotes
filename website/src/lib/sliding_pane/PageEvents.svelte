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
  const sortedYearEntries = $derived(
    Object.entries(eventIdsByYear).sort(
      ([yearA], [yearB]) => Number(yearA) - Number(yearB)
    )
  );

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

  /** @param {string} year */
  function yearEventsId(year) {
    return `page-events-year-${year}-events`;
  }
</script>

<div class="page-events">
  <h1>Events in <i>{wikiPage}</i></h1>

  {#if loadingEvents}
    <div class="loading">Loading events...</div>
  {:else if Object.keys(eventIdsByYear).length === 0}
    <div class="no-events">No events found for this page.</div>
  {:else}
    {#each sortedYearEntries as [year, yearEventIds] (year)}
      <div class="year-section">
        <h2 class="year-heading">
          <button
            type="button"
            class="year-header"
            onclick={() => toggleYear(year)}
            aria-expanded={expandedYears[year]}
            aria-controls={yearEventsId(year)}
          >
            <span class="section-title">{year}</span>
            <span class="event-count"
              >{yearEventIds.length} event{yearEventIds.length !== 1
                ? "s"
                : ""}</span
            >
            <span class="expand-icon">{expandedYears[year] ? "▼" : "►"}</span>
          </button>
        </h2>

        {#if expandedYears[year]}
          <div class="year-events" id={yearEventsId(year)}>
            {#each dataLoadedByYear[year] as event (event.id)}
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
    color: var(--ln-color-text);
    font-family: sans-serif;
  }

  h1 {
    margin-bottom: 16px;
    font-size: 1.8em;
    font-weight: normal;
    border-bottom: 1px solid var(--ln-color-border-strong);
    padding-bottom: 0.2em;
  }

  .loading,
  .no-events {
    padding: 12px 0;
    color: var(--ln-color-text-subtle);
  }

  .year-section {
    margin-bottom: 8px;
  }

  .year-heading {
    margin: 0;
    font-size: 1em;
    font-weight: normal;
  }

  .year-header {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 4px 0;
    cursor: pointer;
    user-select: none;
    border: 0;
    border-bottom: 1px solid var(--ln-color-border-muted);
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
  }

  .year-header:hover {
    background-color: var(--ln-color-surface-muted);
  }

  .section-title {
    font-size: 1.3em;
    font-weight: normal;
    flex-grow: 1;
  }

  .event-count {
    margin-right: 8px;
    color: var(--ln-color-text-subtle);
    font-size: 0.85em;
  }

  .expand-icon {
    color: var(--ln-color-text-subtle);
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
    border: 1px solid var(--ln-color-border-muted);
    border-radius: var(--ln-radius-lg);
    padding: 12px;
    background-color: var(--ln-color-surface);
    box-shadow: var(--ln-shadow-sm);
  }
</style>
