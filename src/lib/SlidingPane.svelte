<script>
  import { fade } from "svelte/transition";

  // Props
  export let isOpen = false;
  export let title = "";
  export let width = "400px"; // Default width for desktop
  export let height = "70vh"; // Default height for mobile

  // Handle close events
  function close() {
    isOpen = false;
  }

  // Close when clicking backdrop
  function handleBackdropClick(event) {
    // Only close if the backdrop itself is clicked (not its children)
    if (event.target === event.currentTarget) {
      close();
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
</script>

<svelte:window on:keydown={(e) => e.key === "Escape" && close()} />

{#if isOpen}
  <div
    class="backdrop"
    on:click={handleBackdropClick}
    transition:fade={{ duration: 150 }}
  >
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
        <slot></slot>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: transparent;
    z-index: 1000;
    display: flex;
    justify-content: flex-start;
    align-items: flex-end;
  }

  .pane {
    background: white;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    height: 100%; /* Full height on desktop */
    width: var(--width, 400px);
    z-index: 1001;
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
    padding: 1rem;
    overflow-y: auto;
  }

  /* Mobile styles - slide from bottom */
  @media (max-width: 768px) {
    .pane {
      width: 100%; /* Full width on mobile */
      height: var(--height, 70vh); /* Partial height on mobile */
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
    }

    .backdrop {
      justify-content: center; /* Center horizontally on mobile */
    }
  }
</style>
