<script>
  import MapPopup from "./MapPopup.svelte";
  import EventCard from "./EventCard.svelte";
  import WikiPreview from "./WikiPreview.svelte";
  import { appState, uiGlobals } from "../appState.svelte.js";
  const { entry, onClick = null } = $props();

  const basePath = import.meta.env.BASE_URL;

  const iconByPlaceType = {
    adm1st: "map",
    adm2nd: "map",
    adm3rd: "map",
    airport: "plane-takeoff",
    building: "building",
    church: "church",
    city: "city",
    country: "flag",
    county: "map",
    edu: "school",
    event: "newspaper",
    forest: "trees",
    glacier: "mountain-snow",
    island: "tree-palm",
    isle: "tree-palm",
    landmark: "landmark",
    locality: "locality",
    mountain: "mountain-snow",
    other: "pin",
    railwaystation: "train-front",
    river: "waves",
    school: "school",
    settlement: "city",
    town: "city",
    village: "city",
    waterbody: "waves",
  };
  const iconsByEventType = {
    birth: "baby",
    death: "skull",
    award: "trophy",
    release: "book-marked",
    work: "briefcase-business",
    travel: "luggage",
  };
  const iconByType = {
    ...iconByPlaceType,
    ...iconsByEventType,
  };

  const iconName = $derived(iconByType[entry.category] || iconByType.other);

  // Compute the label based on entry name and page title
  const label = $derived(() => {
    if (entry.name !== entry.pageTitle) {
      const fullLabel = entry.name + " - " + entry.pageTitle;
      if (fullLabel.length <= 30) {
        return fullLabel;
      }
    }
    return entry.name;
  });

  function openWikiPage(pageTitle) {
    appState.wikiPage = pageTitle;
    appState.paneTab = "wikipedia";
  }
</script>

{#snippet popupContent(isOpen)}
  {#if entry.isEvent}
    <EventCard {entry} constrainHeight={true} keepPopupsWithinMap={true} />
  {:else}
    <WikiPreview pageTitle={entry.pageTitle} {openWikiPage} {isOpen} />
  {/if}
{/snippet}

<MapPopup
  {popupContent}
  enterable={entry.isEvent || uiGlobals.isTouchDevice}
  alwaysOpen={uiGlobals.isTouchDevice && entry.displayClass === "selected"}
  visibilityDelay={entry.isEvent ? 0 : 100}
  keepWithinMap={true}
>
  <div
    class={`map-marker marker-display-${entry.displayClass}`}
    onclick={onClick}
    onkeydown={onClick}
    role="button"
    tabindex="0"
  >
    <div class="marker-icon-circle">
      <img src={basePath + "icons/" + iconName + ".svg"} alt="icon" />
      {#if entry.isEvent && entry.same_location_events && entry.same_location_events.length > 0}
        <div class="event-count-indicator">
          +{entry.same_location_events.length}
        </div>
      {/if}
    </div>

    <div class="marker-text-container">
      <div class="marker-text marker-text-outline">{label()}</div>
      <div class="marker-text">{label()}</div>
    </div>
  </div>
</MapPopup>

<style>
  .map-marker {
    transition:
      transform 0.1s ease,
      filter 0.1s ease;
    display: block;
    text-align: center;

    &:hover {
      transform: scale(1.1);
      filter: brightness(1.2);
      z-index: 1000 !important; /* Ensure hovered markers appear above others */
    }
    &:hover > .marker-icon-circle,
    &.marker-display-selected > .marker-icon-circle {
      --circle-size: 32px !important;
      box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.35);
      z-index: 900 !important;
    }

    &:hover > .marker-text-container,
    &.marker-display-selected > .marker-text-container {
      z-index: 901 !important;
    }

    &.marker-display-selected {
      /* Ensure hovered markers appear above others */
      z-index: 900 !important;
    }

    &:hover > .marker-text-container,
    &.marker-display-selected > .marker-text-container {
      visibility: visible;
      opacity: 1;
    }

    &.marker-display-selected > .marker-icon-circle {
      border: 6px solid #f00707;
      box-shadow: 8px 8px 16px rgba(0, 0, 0, 0.95);
    }

    &.marker-display-full > .marker-text-container {
      visibility: visible;
      opacity: 1;
    }

    &.marker-display-full > .marker-icon-circle {
      --circle-size: 32px;
      box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.35);
    }

    &.marker-display-reduced > .marker-icon-circle {
      --circle-size: 24px;
    }

    &.marker-display-dot > .marker-icon-circle {
      --circle-size: 18px;
    }
    &.marker-display-dot > .marker-icon-circle > img {
      width: calc(var(--circle-size) * 0.8);
      height: calc(var(--circle-size) * 0.8);
    }

    & > .marker-icon-circle {
      width: var(--circle-size);
      height: var(--circle-size);
      background-color: white;
      border-radius: 50%;
      border: 2px solid #222;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto; /* Center the circle in its parent div */
      transition:
        width 0.1s ease,
        height 0.1s ease;
      position: relative; /* Add position relative to contain the absolute indicator */
    }
    & > .marker-icon-circle img {
      width: calc(var(--circle-size) * 0.7);
      height: calc(var(--circle-size) * 0.7);
      margin: 0; /* Remove bottom margin to help with centering */
      display: block; /* Ensure the image behaves as a block */
      transition:
        width 0.1s ease,
        height 0.1s ease;
    }
  }

  .marker-text-container {
    margin-top: -5px;
    font-size: 14px;
    line-height: 0.9em;
    position: relative;
    text-align: center;
    visibility: hidden;
    opacity: 0;
    transition:
      visibility 0.1s ease,
      opacity 0.1s ease;
    & > .marker-text-outline {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      font-weight: bold;
      color: white;
      -webkit-text-stroke: 4px white;
      text-stroke: 4px white;
      z-index: 1;
    }
  }

  .marker-text {
    font-weight: bold;
    color: #111;
    position: relative;
    z-index: 2;
  }
  .marker-text-outline {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    font-weight: bold;
    color: white;
    -webkit-text-stroke: 6px white;
    text-stroke: 6px white;
    -webkit-text-stroke-linejoin: round;
    text-stroke-linejoin: round;
    z-index: 1;
  }

  .event-count-indicator {
    position: absolute;
    top: -8px;
    right: -8px;
    background-color: #ff5a5f;
    color: white;
    border-radius: 30%;
    font-size: 10px;
    font-weight: bold;
    min-width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    padding: 0 2px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    z-index: 5;
  }
</style>
