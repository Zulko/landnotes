<script>
  import SlidingPaneHeader from "./SlidingPaneHeader.svelte";

  // ===== PROPS =====
  export let isOpen = false;
  export let page_title = ""; // Wikipedia page name
  export let width = "400px"; // Default width for desktop
  export let height = "35vh"; // Default height for mobile

  // ===== STATE VARIABLES =====
  let expanded = false;
  let normalWidth = width;
  let normalHeight = height;

  // ===== COMPUTED VALUES =====
  // Detect mobile view
  $: isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  // Compute actual dimensions based on expanded state
  $: actualWidth = isMobile
    ? "100%"
    : expanded
      ? `${parseInt(normalWidth) * 2}px`
      : normalWidth;

  $: actualHeight = isMobile ? (expanded ? "100vh" : normalHeight) : "100vh";

  // Generate Wikipedia URL based on device and width
  $: wikiUrl = page_title
    ? isMobile || parseInt(actualWidth) < 768
      ? `https://en.m.wikipedia.org/wiki/${encodeURIComponent(page_title)}`
      : `https://en.wikipedia.org/wiki/${encodeURIComponent(page_title)}`
    : "about:blank";

  // ===== EVENT HANDLERS =====
  // Handle close events
  function close() {
    isOpen = false;
    expanded = false;
    // Emit a close event so parent components can deselect the marker
    const closeEvent = new CustomEvent('close');
    dispatchEvent(closeEvent);
  }

  // Toggle expanded mode (works for both desktop and mobile)
  function toggleExpand() {
    expanded = !expanded;
  }

  // Open in new tab
  function openInNewTab() {
    if (page_title) {
      window.open(wikiUrl, "_blank");
    }
  }

  // Handle window resize
  function handleResize() {
    if (typeof window !== "undefined") {
      // Update mobile detection
      isMobile = window.innerWidth <= 768;
    }
  }

  // ===== TRANSITIONS =====
  // Custom transition for desktop and mobile
  function slideTransition(node, { duration }) {
    const isMobile = window.innerWidth <= 768;

    return {
      duration,
      css: (t) => {
        // For desktop: slide from left (-100% to 0%)
        // For mobile: slide from bottom (100% to 0%)
        const value = isMobile ? (1 - t) * 100 : (t - 1) * 100;
        const prop = isMobile ? "translateY" : "translateX";

        return `
          transform: ${prop}(${value}%);
          opacity: ${t};
        `;
      },
    };
  }
</script>

<svelte:window
  on:keydown={(e) => e.key === "Escape" && close()}
  on:resize={handleResize}
/>

<div class="pane-container" class:is-open={isOpen}>
  <div class="pane" style="width: {actualWidth}; height: {actualHeight};">
    <SlidingPaneHeader
      {expanded}
      onClose={close}
      onToggleExpand={toggleExpand}
      onOpenExternal={openInNewTab}
    />

    <div class="pane-content">
      {#if page_title}
        <iframe
          title="Wikipedia Content"
          src={wikiUrl}
          frameborder="0"
          class="wiki-iframe"
          sandbox="allow-same-origin allow-scripts"
        ></iframe>
      {:else}
        <p>No page specified</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .pane-container {
    display: none;
  }

  .pane-container.is-open {
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
