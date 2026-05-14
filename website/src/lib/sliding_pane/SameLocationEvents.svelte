<script>
  import EventCard from "../map/EventCard.svelte";
  import { getEventsById } from "../data/events_data";
  import { normalizeMapEntryInfo } from "../data/mapEntries.svelte";
  import { appState } from "../appState.svelte";

  /**
   * @typedef {{ year: string | number, month: string | number }} EventMonthDate
   * @typedef {{ event_id: string, start_date: EventMonthDate, [key: string]: unknown }} SameLocationEvent
   * @typedef {{ id: string, start_date: string, [key: string]: unknown }} NormalizedEvent
   * @typedef {Record<string, string[]>} EventIdsByMonth
   * @typedef {Record<string, boolean>} ExpandedMonths
   * @typedef {Record<string, NormalizedEvent[]>} DataLoadedByMonth
   * @typedef {Record<string, NormalizedEvent>} EventInfosById
   */

  /** @type {{ sameLocationEvents: SameLocationEvent[] }} */
  let { sameLocationEvents } = $props();
  let loadingEvents = $state(true);

  /** @type {ExpandedMonths} */
  let expandedMonths = $state({});

  /** @type {DataLoadedByMonth} */
  let dataLoadedByMonth = $state({});

  const eventIdsByMonth = $derived(
    sameLocationEvents.reduce(
      /**
       * @param {EventIdsByMonth} acc
       * @param {SameLocationEvent} event
       * @returns {EventIdsByMonth}
       */
      (acc, event) => {
        const monthKey = `${event.start_date.year}-${event.start_date.month}`;
        acc[monthKey] = acc[monthKey] || [];
        acc[monthKey].push(event.event_id);
        return acc;
      },
      /** @type {EventIdsByMonth} */ ({})
    )
  );
  const sortedMonthEntries = $derived(
    Object.entries(eventIdsByMonth).sort(([monthA], [monthB]) =>
      monthA.localeCompare(monthB)
    )
  );

  $effect(() => {
    if (sameLocationEvents) {
      loadEventList();
    }
  });

  async function loadEventList() {
    loadingEvents = true;

    // Organize events by month

    dataLoadedByMonth = {};
    for (const month in eventIdsByMonth) {
      expandedMonths[month] = false;
    }

    const allEventIds = Object.values(eventIdsByMonth).flat();

    if (allEventIds.length > 0 && allEventIds.length < 500) {
      await loadAllEvents(allEventIds);
    }
    loadingEvents = false;
  }

  /** @param {string[]} allEventIds */
  async function loadAllEvents(allEventIds) {
    const rawEventInfos = await getEventsById(allEventIds);
    /** @type {NormalizedEvent[]} */
    const eventInfos = rawEventInfos.map((event) =>
      /** @type {NormalizedEvent} */ (normalizeMapEntryInfo(event))
    );
    /** @type {EventInfosById} */
    const eventInfosById = eventInfos.reduce(
      /**
       * @param {EventInfosById} acc
       * @param {NormalizedEvent} event
       * @returns {EventInfosById}
       */
      (acc, event) => {
        acc[event.id] = event;
        return acc;
      },
      /** @type {EventInfosById} */ ({})
    );

    Object.entries(eventIdsByMonth).forEach(([month, monthEventIds]) => {
      dataLoadedByMonth[month] = monthEventIds
        .map((id) => eventInfosById[id])
        .sort((a, b) => a.start_date.localeCompare(b.start_date));
      expandedMonths[month] = true;
    });
  }

  /** @param {string} month */
  async function toggleMonth(month) {
    const toggledValue = !expandedMonths[month];
    if (toggledValue && !dataLoadedByMonth[month]) {
      dataLoadedByMonth[month] = await loadEventData(month);
    }
    expandedMonths[month] = toggledValue;
  }

  /**
   * @param {string} month
   * @returns {Promise<NormalizedEvent[]>}
   */
  async function loadEventData(month) {
    const eventsByMonth = await getEventsById(eventIdsByMonth[month]);
    return eventsByMonth
      .map((event) => /** @type {NormalizedEvent} */ (normalizeMapEntryInfo(event)))
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  // Format month for display (YYYY-MM to Month YYYY)
  /** @param {string} monthKey */
  function formatMonth(monthKey) {
    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), parseInt(month) - 1, 1);
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  }

  /**
   * @param {string} month
   * @returns {string}
   */
  function monthEventsId(month) {
    return `same-location-events-month-${month}-events`;
  }
</script>

<div class="same-location-events">
  <h1>Events at this location</h1>
  <div class="date-info">
    Showing events for
    <b>
      {appState.date.year}
      {#if typeof appState.date.month === "number"}
        / {appState.date.month}
        {#if typeof appState.date.day === "number"}
          / {appState.date.day}
        {/if}
      {/if}
    </b>
    {#if !appState.strictDate}
      <span class="date-range-note"
        >and any time range containing this date</span
      >
    {/if}
  </div>

  {#if loadingEvents}
    <div class="loading">Loading events...</div>
  {:else if Object.keys(eventIdsByMonth).length === 0}
    <div class="no-events">No events found at this location.</div>
  {:else}
    {#each sortedMonthEntries as [month, monthEventIds] (month)}
      <div class="month-section">
        <h2 class="month-heading">
          <button
            type="button"
            class="month-header"
            onclick={() => toggleMonth(month)}
            aria-expanded={expandedMonths[month]}
            aria-controls={monthEventsId(month)}
          >
            <span class="section-title">{formatMonth(month)}</span>
            <span class="event-count"
              >{monthEventIds.length} event{monthEventIds.length !== 1
                ? "s"
                : ""}</span
            >
            <span class="expand-icon">{expandedMonths[month] ? "▼" : "►"}</span>
          </button>
        </h2>

        {#if expandedMonths[month]}
          <div class="month-events" id={monthEventsId(month)}>
            {#each dataLoadedByMonth[month] as event (event.id)}
              <div class="event-card-container">
                <EventCard
                  entry={event}
                  displayPage={true}
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
  .same-location-events {
    padding: 16px;
    overflow-y: auto;
    color: var(--ln-color-text);
    font-family: sans-serif;
  }

  h1 {
    margin-bottom: 8px;
    font-size: 1.8em;
    font-weight: normal;
    border-bottom: 1px solid var(--ln-color-border-strong);
    padding-bottom: 0.2em;
  }

  .date-info {
    margin-bottom: 16px;
    color: var(--ln-color-text-muted);
    font-size: 1.1em;
  }

  .loading,
  .no-events {
    padding: 12px 0;
    color: var(--ln-color-text-subtle);
  }

  .month-section {
    margin-bottom: 8px;
  }

  .month-heading {
    margin: 0;
    font-size: 1em;
    font-weight: normal;
  }

  .month-header {
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

  .month-header:hover {
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

  .month-events {
    padding: 8px 0 12px 20px;
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
