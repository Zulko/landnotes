<script>
  import { fade } from "svelte/transition";

  // Props
  export let isOpen = false;
  export let title = "";
  export let wiki_page = ""; // Wikipedia page name
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
    // Reset expanded state when closing
    expanded = false;
  }

  // Toggle expanded mode (works for both desktop and mobile)
  function toggleExpand() {
    expanded = !expanded;
  }

  // Generate Wikipedia URL
  $: wikiUrl = wiki_page
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(wiki_page)}`
    : "about:blank";

  // Open in new tab
  function openInNewTab() {
    if (wiki_page) {
      window.open(wikiUrl, "_blank");
    }
  }

  // Custom transition for desktop and mobile
  function slideTransition(node, { duration }) {
    const isMobile = window.innerWidth <= 768;

    // Different transform depending on device type
    const transformProp = isMobile ? "translateY" : "translateX";

    return {
      duration,
      css: (t) => `
        transform: ${transformProp}(${(t - 1) * 100}%);
        opacity: ${t}
      `,
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
      <div class="pane-header">
        <h2>{title}</h2>
        <div class="header-buttons">
          <button
            class="icon-button external-link-button"
            on:click={openInNewTab}
            title="Open in new tab"
            aria-label="Open in new tab"
          >
            <img
              src="/icons/external-link.svg"
              alt="Open in new tab"
              class="icon"
            />
          </button>
          <!-- Desktop Expand Button (hidden on mobile) -->
          <button
            class="icon-button expand-button desktop-only"
            class:active={expanded}
            on:click={toggleExpand}
            title={expanded ? "Shrink pane" : "Expand pane"}
            aria-label={expanded ? "Shrink pane" : "Expand pane"}
          >
            <img
              src={expanded ? "/icons/shrink.svg" : "/icons/expand.svg"}
              alt={expanded ? "Shrink pane" : "Expand pane"}
              class="icon"
            />
          </button>
          <!-- Mobile Expand Button (hidden on desktop) -->
          <button
            class="icon-button expand-button mobile-only"
            class:active={expanded}
            on:click={toggleExpand}
            title={expanded ? "Shrink pane" : "Expand pane"}
            aria-label={expanded ? "Shrink pane" : "Expand pane"}
          >
            <img
              src={expanded
                ? "/icons/shrink.svg"
                : "/icons/expand-vertical.svg"}
              alt={expanded ? "Shrink pane" : "Expand pane"}
              class="icon"
            />
          </button>
          <button
            class="close-button"
            on:click={close}
            aria-label="Close panel"
          >
            &times;
          </button>
        </div>
      </div>
      <div class="pane-content">
        {#if wiki_page}
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

  .pane-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #eee;
    position: sticky;
    top: 0;
    background: white;
    z-index: 1;
  }

  .pane-header h2 {
    margin: 0;
    font-size: 1.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-buttons {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .icon-button,
  .close-button {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-button:hover,
  .close-button:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .icon {
    width: 16px;
    height: 16px;
  }

  .close-button {
    font-size: 1.5rem;
    margin-left: 4px;
  }

  .expand-button.active,
  .expand-button-mobile.active {
    color: #1a73e8;
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

  /* Hide/show based on device type */
  .desktop-only {
    display: block;
  }

  .mobile-only {
    display: none;
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

    /* Hide desktop-only elements on mobile */
    .desktop-only {
      display: none;
    }

    /* Show mobile-only elements on mobile */
    .mobile-only {
      display: block;
    }
  }
</style>
