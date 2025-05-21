<script>
  import SlidingPaneHeader from "./SlidingPaneHeader.svelte";
  import PageEvents from "./PageEvents.svelte";
  import SameLocationEvents from "./SameLocationEvents.svelte";
  import { onMount } from "svelte";
  import { appState, uiState } from "../appState.svelte";

  let isNarrowScreen = $state(
    typeof window !== "undefined" && window.innerWidth <= 768
  );
  let expanded = $state(window.innerWidth <= 768); // fullscreen by default on narrow screens
  const normalWidth = "400px"; // Default width for desktop
  const normalHeight = "35vh"; // Default height for mobile

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
        ? expanded
          ? "100vh"
          : normalHeight
        : "100vh"
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

  // Reference to the iframe element
  let wikiIframe = $state(null);

  $inspect(wikiUrl);

  // Focus the iframe whenever wikiUrl changes
  $effect(() => {
    if (
      wikiIframe &&
      wikiUrl !== "about:blank" &&
      appState.paneTab === "wikipedia"
    ) {
      console.log("focusing iframe");
      setTimeout(() => {
        wikiIframe.focus();
      }, 400); // Small delay to ensure iframe has loaded
    }
  });

  // ===== EVENT HANDLERS =====

  // Toggle expanded mode (works for both desktop and mobile)
  function closePane() {
    appState.wikiPage = null;
    appState.selectedMarkerId = null;
    appState.paneTab = "wikipedia";
  }

  // Open in new tab
  function openWikiPageInNewTab() {
    if (appState.wikiPage) {
      window.open(wikiDesktopUrl, "_blank");
    }
  }

  // Handle window resize
  function handleResize() {
    if (typeof window !== "undefined") {
      // Update mobile detection
      isNarrowScreen = window.innerWidth <= 768;
    }
  }

  // ===== LIFECYCLE =====
  onMount(() => {
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

<div class="pane-container">
  <div class="pane" style="width: {actualWidth}; height: {actualHeight};">
    <SlidingPaneHeader bind:expanded {openWikiPageInNewTab} {closePane} />

    <div class="pane-content">
      {#if appState.paneTab === "wikipedia" && appState.wikiPage}
        <iframe
          bind:this={wikiIframe}
          id="wiki-iframe"
          tabindex="-2"
          aria-hidden="true"
          title="Wikipedia Content"
          src={wikiUrl}
          frameborder="0"
          class="wiki-iframe"
        ></iframe>
      {:else if appState.paneTab === "events" && appState.wikiPage}
        <PageEvents wikiPage={appState.wikiPage} />
      {:else if appState.paneTab === "same-location-events"}
        <SameLocationEvents sameLocationEvents={uiState.sameLocationEvents} />
      {:else}
        <p>No page specified</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .pane-container {
    display: flex;
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
    .pane {
      width: 100% !important;
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
    }
  }
</style>
