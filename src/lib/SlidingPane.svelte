<script>
  import { fade } from "svelte/transition";

  // Props
  export let isOpen = false;
  export let title = "";
  export let wiki_page = ""; // Wikipedia page name
  export let width = "400px"; // Default width for desktop
  export let height = "70vh"; // Default height for mobile

  // Handle close events
  function close() {
    isOpen = false;
  }

  // Generate Wikipedia URL
  $: wikiUrl = wiki_page
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(wiki_page)}`
    : "about:blank";

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
</script>

<svelte:window on:keydown={(e) => e.key === "Escape" && close()} />

{#if isOpen}
  <div class="pane-container">
    <div
      class="pane"
      in:slideTransition={{ duration: 300 }}
      out:slideTransition={{ duration: 200 }}
    >
      <div class="pane-header">
        <h2>{title}</h2>
        <button class="close-button" on:click={close} aria-label="Close panel">
          &times;
        </button>
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
    width: var(--width, 400px);
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1001;
    pointer-events: auto; /* Allow interaction with the pane itself */
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
  }

  .close-button {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    margin: -0.25rem -0.5rem -0.25rem 0.25rem;
    border-radius: 4px;
  }

  .close-button:hover {
    background-color: rgba(0, 0, 0, 0.1);
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
      width: 100%; /* Full width on mobile */
      height: var(--height, 70vh); /* Partial height on mobile */
      top: auto;
      bottom: 0;
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
    }
  }
</style>
