<script>
  let { entry, startPopupCloseTimeout, stopPopupCloseTimeout } = $props();
  const basePath = import.meta.env.BASE_URL;
</script>

<div
  class="event-popup"
  role="tooltip"
  onmouseover={stopPopupCloseTimeout}
  onmouseout={startPopupCloseTimeout}
  onblur={startPopupCloseTimeout}
  onfocus={stopPopupCloseTimeout}
>
  <div class="event-popup-section">
    <div class="event-icon">
      <img src="{basePath}icons/calendar-fold.svg" alt="calendar" />
    </div>
    <div class="event-text">{entry.when}</div>
  </div>
  <div class="event-popup-section">
    <div class="event-icon">
      <img src="{basePath}icons/square-user-round.svg" alt="person" />
    </div>
    <div class="event-text">{entry.people.replaceAll("|", ", ")}</div>
  </div>
  <div class="event-popup-section">
    <div class="event-icon">
      <img src="{basePath}icons/newspaper.svg" alt="newspaper" />
    </div>
    <div class="event-text">{entry.summary}</div>
  </div>
  <div class="event-popup-section">
    <div class="event-icon">
      <img src="{basePath}icons/map.svg" alt="map" />
    </div>
    <div class="event-text">{entry.location}</div>
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
    margin-bottom: 12px;
    padding-bottom: 12px;
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
    color: #333;
  }

  /* Special styling for different types of content */
  .event-popup .event-popup-section:first-child .event-text {
    font-weight: 600;
    color: #1a73e8;
  }

  .event-popup-section:nth-child(2) .event-text {
    font-weight: 500;
  }

  .event-popup-section:nth-child(4) .event-text {
    font-style: italic;
    color: #555;
  }
</style>
