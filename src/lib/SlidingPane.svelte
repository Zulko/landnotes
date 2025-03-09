<script>
  import { fade } from "svelte/transition";
  import SlidingPaneHeader from "./SlidingPaneHeader.svelte";

  // Props
  export let isOpen = false;
  export let title = "";
  export let page_title = ""; // Wikipedia page name
  export let width = "400px"; // Default width for desktop
  export let height = "70vh"; // Default height for mobile

  // Single expansion state for all devices
  let expanded = false;
  let normalWidth = width;
  let normalHeight = height;

  // Detect mobile view
  $: isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  // Compute actual dimensions based on expanded state
  $: actualWidth = isMobile
    ? "100%"
    : expanded
      ? `${parseInt(normalWidth) * 2}px`
      : normalWidth;
  $: actualHeight = isMobile ? (expanded ? "100vh" : normalHeight) : "100vh";

  // Handle close events
  function close() {
    isOpen = false;
    expanded = false;
  }

  // Toggle expanded mode (works for both desktop and mobile)
  function toggleExpand() {
    expanded = !expanded;
  }

  // Generate Wikipedia URL
  $: wikiUrl = page_title
    ? isMobile || parseInt(actualWidth) < 768
      ? `https://en.m.wikipedia.org/wiki/${encodeURIComponent(page_title)}`
      : `https://en.wikipedia.org/wiki/${encodeURIComponent(page_title)}`
    : "about:blank";

  // Open in new tab
  function openInNewTab() {
    if (page_title) {
      window.open(wikiUrl, "_blank");
    }
  }

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

  // Handle window resize
  function handleResize() {
    if (typeof window !== "undefined") {
      // Update mobile detection
      isMobile = window.innerWidth <= 768;
    }
  }
</script>

<svelte:window
  on:keydown={(e) => e.key === "Escape" && close()}
  on:resize={handleResize}
/>

{#if isOpen}
  <div class="pane-container">
    <div
      class="pane"
      in:slideTransition={{ duration: 300 }}
      out:slideTransition={{ duration: 200 }}
      style="width: {actualWidth}; height: {actualHeight};"
    >
      <SlidingPaneHeader
        {title}
        {page_title}
        {expanded}
        {isMobile}
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
{/if}

<style>
  .pane-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 0; /* No width to allow interaction with elements behind */
    height: 0; /* No height to allow interaction with elements behind */
    z-index: 1000;
    pointer-events: none; /* Allow interactions with elements behind */
  }

  .pane {
    background: white;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    height: 100vh; /* Full height on desktop */
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1001;
    pointer-events: auto; /* Allow interaction with the pane itself */
    transition:
      width 0.3s ease,
      height 0.3s ease;
  }

  .pane-content {
    flex: 1;
    padding: 0; /* Remove padding for iframe */
    overflow: hidden; /* Let iframe handle scrolling */
    display: flex;
    flex-direction: column;
  }

  .wiki-iframe {
    width: 100%;
    height: 100%;
    border: none;
    overflow: auto;
  }

  /* Mobile styles - slide from bottom */
  @media (max-width: 768px) {
    .pane {
      width: 100% !important; /* Full width on mobile */
      top: auto;
      bottom: 0;
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
    }
  }
</style>
