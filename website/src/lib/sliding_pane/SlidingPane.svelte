<script>
  import SlidingPaneHeader from "./SlidingPaneHeader.svelte";
  import PageEvents from "./PageEvents.svelte";
  import SameLocationEvents from "./SameLocationEvents.svelte";
  import About from "./About.svelte";
  import { onMount } from "svelte";
  import { appState, uiState } from "../appState.svelte";

  const mobileSheetHeights = {
    half: "50dvh",
    full: "100dvh",
  };

  let isNarrowScreen = $state(false);
  let expanded = $state(false);
  let sheetState = $state("half");
  const normalWidth = "400px"; // Default width for desktop

  // ===== STATE VARIABLES =====
  let isInitialRender = $state(true);

  // ===== COMPUTED VALUES =====

  // Compute actual dimensions based on expanded state and initial render
  let actualWidth = $derived(
    isInitialRender
      ? "0px"
      : isNarrowScreen
        ? "100%"
        : expanded
          ? `${parseInt(normalWidth) * 2}px`
          : normalWidth
  );

  let actualHeight = $derived(
    isInitialRender
      ? "0px"
      : isNarrowScreen
        ? mobileSheetHeights[sheetState]
        : "100dvh"
  );

  // Generate Wikipedia URL based on device and width

  let wikiDesktopUrl = $derived(
    `https://en.wikipedia.org/wiki/${encodeURIComponent(appState.wikiPage)}`
  );
  let wikiUrl = $derived(
    (appState.wikiPage
      ? isNarrowScreen || parseInt(actualWidth) < 768
        ? `https://en.m.wikipedia.org/wiki/${encodeURIComponent(appState.wikiPage)}`
        : wikiDesktopUrl
      : "about:blank") +
      (appState.wikiSection
        ? `#${encodeURIComponent(appState.wikiSection.replace(/ /g, "_"))}`
        : "")
  );

  // ===== EVENT HANDLERS =====

  function closePane() {
    appState.wikiPage = null;
    appState.selectedMarkerId = null;
    appState.paneTab = "wikipedia";
    sheetState = "half";
  }

  // Open in new tab
  function openWikiPageInNewTab() {
    if (appState.wikiPage) {
      window.open(wikiDesktopUrl, "_blank");
    }
  }

  function handleResize() {
    if (typeof window !== "undefined") {
      isNarrowScreen = window.innerWidth <= 768;
    }
  }

  // ===== LIFECYCLE =====
  onMount(() => {
    handleResize();

    // Trigger the initial animation after a small delay
    setTimeout(() => {
      isInitialRender = false;
    }, 10);
  });
</script>

<svelte:window
  onkeydown={(e) => e.key === "Escape" && closePane()}
  onresize={handleResize}
/>

<div class="pane-container" class:mobile={isNarrowScreen}>
  <div
    class="pane"
    data-sheet-state={sheetState}
    style="width: {actualWidth}; height: {actualHeight};"
  >
    <SlidingPaneHeader
      bind:expanded
      bind:sheetState
      {isNarrowScreen}
      {openWikiPageInNewTab}
      {closePane}
    />

    <div class="pane-content">
      {#if appState.paneTab === "wikipedia" && appState.wikiPage}
        <iframe
          id="wiki-iframe"
          title="Wikipedia Content"
          src={wikiUrl}
          frameborder="0"
          class="wiki-iframe"
        ></iframe>
      {:else if appState.paneTab === "events" && appState.wikiPage}
        <PageEvents wikiPage={appState.wikiPage} />
      {:else if appState.paneTab === "same-location-events"}
        <SameLocationEvents sameLocationEvents={uiState.sameLocationEvents} />
      {:else if appState.paneTab === "about"}
        <About {closePane} />
      {:else}
        <p>No page specified</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .pane-container {
    display: flex;
    height: 100%;
  }

  .pane {
    background: white;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    transition:
      width 0.3s ease,
      height 0.3s ease;
    z-index: 100;
    pointer-events: auto;
  }

  .pane-content {
    flex: 1;
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .wiki-iframe {
    width: 100%;
    height: 100%;
    border: none;
    overflow: auto;
  }

  /* Mobile styles */
  @media (max-width: 768px) {
    .pane-container.mobile {
      position: fixed;
      right: 0;
      bottom: 0;
      left: 0;
      display: block;
      height: auto;
      z-index: 900;
      pointer-events: none;
    }

    .pane {
      width: 100% !important;
      max-height: 100dvh;
      border-top-left-radius: 16px;
      border-top-right-radius: 16px;
      box-shadow: 0 -4px 18px rgba(0, 0, 0, 0.22);
      overflow: hidden;
    }

  }
</style>
