<script>
  let { entry, onPageClick } = $props();
  const basePath = import.meta.env.BASE_URL;
</script>

<div class="event-popup">
  <div class="event-popup-section">
    <div class="event-icon">
      <img src="${basePath}icons/calendar-fold.svg" alt="calendar" />
    </div>
    <div class="event-text">${entry.when}</div>
  </div>
  <div class="event-popup-section">
    <div class="event-icon">
      <img src="${basePath}icons/person-standing.svg" alt="person" />
    </div>
    <div class="event-text">${entry.people.replaceAll("|", ", ")}</div>
  </div>
  <div class="event-popup-section">
    <div class="event-icon">
      <img src="${basePath}icons/newspaper.svg" alt="newspaper" />
    </div>
    <div class="event-text">${entry.summary}</div>
  </div>
  <div class="event-popup-section">
    <div class="event-icon">
      <img src="${basePath}icons/map.svg" alt="map" />
    </div>
    <div class="event-text">${entry.location}</div>
  </div>
</div>
