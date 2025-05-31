<script>
  import EventCard from "../map/EventCard.svelte";
  import { getEventsById } from "../data/events_data";
  import { normalizeMapEntryInfo } from "../data/mapEntries.svelte";
  import { appState } from "../appState.svelte";
  let { sameLocationEvents } = $props();
  let loadingEvents = $state(true);
  let expandedMonths = $state({});
  let dataLoadedByMonth = $state({});

  const eventIdsByMonth = $derived(
    sameLocationEvents.reduce((acc, event) => {
      const monthKey = `${event.start_date.year}-${event.start_date.month}`;
      acc[monthKey] = acc[monthKey] || [];
      acc[monthKey].push(event.event_id);
      return acc;
    }, {})
  );

  $effect(() => {
    if (sameLocationEvents) {
      console.log(sameLocationEvents);
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

  async function loadAllEvents(allEventIds) {
    const rawEventInfos = await getEventsById(allEventIds);
    const eventInfos = rawEventInfos.map(normalizeMapEntryInfo);
    const eventInfosById = eventInfos.reduce((acc, event) => {
      acc[event.id] = event;
      return acc;
    }, {});

    Object.entries(eventIdsByMonth).forEach(([month, monthEventIds]) => {
      dataLoadedByMonth[month] = monthEventIds
        .map((id) => eventInfosById[id])
        .sort((a, b) => a.start_date.localeCompare(b.start_date));
      expandedMonths[month] = true;
    });
  }

  async function toggleMonth(month) {
    const toggledValue = !expandedMonths[month];
    if (toggledValue && !dataLoadedByMonth[month]) {
      dataLoadedByMonth[month] = await loadEventData(month);
    }
    expandedMonths[month] = toggledValue;
  }

  async function loadEventData(month) {
    const eventsByMonth = await getEventsById(eventIdsByMonth[month]);
    return eventsByMonth
      .map(normalizeMapEntryInfo)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  // Format month for display (YYYY-MM to Month YYYY)
  function formatMonth(monthKey) {
    const [year, month] = monthKey.split("-");
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleString("default", { month: "long", year: "numeric" });
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
    {#each Object.entries(eventIdsByMonth).sort( ([monthA], [monthB]) => monthA.localeCompare(monthB) ) as [month, monthEventIds]}
      <div class="month-section">
        <div
          class="month-header"
          onclick={() => toggleMonth(month)}
          onkeydown={(e) => e.key === "Enter" && toggleMonth(month)}
          role="button"
          tabindex="0"
        >
          <h2>{formatMonth(month)}</h2>
          <span class="event-count"
            >{monthEventIds.length} event{monthEventIds.length !== 1
              ? "s"
              : ""}</span
          >
          <span class="expand-icon">{expandedMonths[month] ? "▼" : "►"}</span>
        </div>

        {#if expandedMonths[month]}
          <div class="month-events">
            {#each dataLoadedByMonth[month] as event}
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
    color: #222;
    font-family: sans-serif;
  }

  h1 {
    margin-bottom: 8px;
    font-size: 1.8em;
    font-weight: normal;
    border-bottom: 1px solid #a2a9b1;
    padding-bottom: 0.2em;
  }

  .date-info {
    margin-bottom: 16px;
    color: #54595d;
    font-size: 1.1em;
  }

  .loading,
  .no-events {
    padding: 12px 0;
    color: #72777d;
  }

  .month-section {
    margin-bottom: 8px;
  }

  .month-header {
    display: flex;
    align-items: center;
    padding: 4px 0;
    cursor: pointer;
    user-select: none;
    border-bottom: 1px solid #eaecf0;
  }

  .month-header:hover {
    background-color: #f8f9fa;
  }

  .month-header h2 {
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

  .month-events {
    padding: 8px 0 12px 20px;
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
