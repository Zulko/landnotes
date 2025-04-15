<script>
  import SlidingPaneHeader from "./SlidingPaneHeader.svelte";

  // ===== PROPS =====
  let {wikiPage, onPaneClose} = $props();
  
  let expanded = $state(false);
  let isMobile = $state(typeof window !== "undefined" && window.innerWidth <= 768);
  const normalWidth = "400px"; // Default width for desktop
  const normalHeight = "35vh"; // Default height for mobile

  // ===== STATE VARIABLES =====
  

  // ===== COMPUTED VALUES =====
  // Detect mobile view
  

  // Compute actual dimensions based on expanded state
  let actualWidth = $derived(isMobile
    ? "100%"
    : expanded
      ? `${parseInt(normalWidth) * 2}px`
      : normalWidth
    );

  let actualHeight = $derived(isMobile
    ? (expanded ? "100vh" : normalHeight)
    : "100vh"
  );

  // Generate Wikipedia URL based on device and width
  let wikiUrl = $derived(wikiPage
    ? isMobile || parseInt(actualWidth) < 768
      ? `https://en.m.wikipedia.org/wiki/${encodeURIComponent(wikiPage)}`
      : `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiPage)}`
    : "about:blank"
  );

  $inspect(wikiPage).with((type, value) => {
    const style = 'background: #222; color: #bada55; font-size: 14px; padding: 4px;';
    console.log(`%c[${type.toUpperCase()}] wikiPage: ${value}`, style);
  });
  $inspect(wikiUrl).with((type, value) => {
    const style = 'background: #222; color: #bada55; font-size: 14px; padding: 4px;';
    console.log(`%c[${type.toUpperCase()}] wikiUrl: ${value}`, style);
  });

  // ===== EVENT HANDLERS =====

  // Toggle expanded mode (works for both desktop and mobile)
  function onToggleExpand() {
    expanded = !expanded;
  }

  // Open in new tab
  function onOpenExternal() {
    if (wikiPage) {
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
  onkeydown={(e) => e.key === "Escape" && onPaneClose()}
  onresize={handleResize}
/>

<div class="pane-container">
  <div class="pane" style="width: {actualWidth}; height: {actualHeight};">
    <SlidingPaneHeader
      {expanded}
      {onPaneClose}
      {onToggleExpand}
      {onOpenExternal}
    />

    <div class="pane-content">
      {#if wikiPage}
        <h1>{wikiPage}</h1>
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
