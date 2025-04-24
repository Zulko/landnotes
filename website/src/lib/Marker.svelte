<script>
  import WikiTooltip from "./WikiTooltip.svelte";
  const { entry } = $props();
  const basePath = import.meta.env.BASE_URL;

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
</script>

{#snippet marker()}
  <div class={`map-marker marker-display-${entry.displayClass}`}>
    <div class="marker-icon-circle">
      <img src={basePath + "icons/" + entry.iconName + ".svg"} alt="icon" />
    </div>

    <div class="marker-text-container">
      <div class="marker-text marker-text-outline">{label()}</div>
      <div class="marker-text">{label()}</div>
    </div>
  </div>
{/snippet}

{#if entry.isEvent}
  {@render marker()}
{:else}
  <WikiTooltip pageTitle={entry.pageTitle} snippet={marker} />
{/if}

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
      -webkit-text-stroke: 6px white;
      text-stroke: 6px white;
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
</style>
