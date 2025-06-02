<script>
  import { onMount, onDestroy } from "svelte";
  import { appState } from "../appState.svelte";

  let {
    mode = $bindable("places"),
    strictDate = $bindable(false),
    onCloseMenu,
  } = $props();

  function handleMenuBlur() {
    // Small delay to allow click events on menu items to fire
    setTimeout(onCloseMenu, 200);
  }

  function handleClickOutside(event) {
    // Close menu when clicking outside
    if (
      !event.target.closest(".menu-container") &&
      !event.target.closest(".menu-button")
    ) {
      onCloseMenu();
    }
  }

  onMount(() => {
    document.addEventListener("click", handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener("click", handleClickOutside);
  });
</script>

<div class="menu-container">
  <div class="menu-dropdown" onblur={handleMenuBlur} tabindex="-1">
    <!-- View mode selection -->
    <div class="menu-group">
      <span class="menu-label">Show</span>
      <div class="menu-options">
        <button
          class="mode-option {mode === 'places' ? 'active' : ''}"
          onclick={() => (mode = "places")}
        >
          places
        </button>
        <button
          class="mode-option {mode === 'events' ? 'active' : ''}"
          onclick={() => (mode = "events")}
        >
          events
        </button>
      </div>
    </div>

    <!-- Date filter options - only shown for events mode -->
    {#if mode === "events"}
      <div class="menu-group">
        <span class="menu-label">Date filter</span>
        <select
          class="mode-option mode-select"
          value={strictDate ? "strict" : "overlapping"}
          onchange={(e) => (strictDate = e.currentTarget.value === "strict")}
        >
          <option value="strict">Only events strictly within the date</option>
          <option value="overlapping"
            >All events overlapping with the date</option
          >
        </select>
      </div>
    {/if}

    <!-- Links section -->
    <div class="menu-links">
      <span
        onclick={() => {
          appState.paneTab = "about";
          onCloseMenu();
        }}
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            appState.paneTab = "about";
            onCloseMenu();
          }
        }}
        class="menu-item"
        role="button"
        tabindex="0"
      >
        About Landnotes
      </span>
    </div>
  </div>
</div>

<style>
  .menu-container {
    position: relative;
    width: 100%;
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #a2a9b1;
    border-radius: 2px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    max-height: 300px;
    overflow-y: auto;
    margin-top: 5px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
      "Liberation Sans", sans-serif;
  }

  .menu-group {
    padding: 12px 16px;
    border-bottom: 1px solid #eaecf0;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .menu-label {
    font-weight: 500;
    color: #000000;
    font-size: 13px;
    min-width: fit-content;
  }

  .menu-options {
    display: flex;
    flex-direction: row;
    gap: 6px;
    flex-wrap: wrap;
  }

  .mode-option {
    padding: 6px 12px;
    border: 1px solid #a2a9b1;
    border-radius: 2px;
    background-color: #f8f9fa;
    color: #000000;
    cursor: pointer;
    font-size: 13px;
    font-family: inherit;
    white-space: nowrap;
    transition: all 0.15s ease-in-out;
    outline: none;
    /* Safari-specific overrides */
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
  }

  .mode-option:hover {
    background-color: #eaecf0;
    border-color: #72777d;
  }

  .mode-option:focus {
    border-color: #36c;
    box-shadow: inset 0 0 0 1px #36c;
  }

  .mode-option:active {
    background-color: #c8ccd1;
  }

  .mode-option.active {
    background-color: #36c;
    color: white;
    border-color: #36c;
  }

  .mode-option.active:hover {
    background-color: #2a4b8d;
    border-color: #2a4b8d;
  }

  .mode-select {
    padding: 6px 8px;
    min-width: 200px;
    background-color: #ffffff;
    /* Add custom dropdown arrow for Safari */
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 12px;
    padding-right: 28px;
  }

  .mode-select:hover {
    background-color: #ffffff;
  }

  .menu-item {
    display: block;
    padding: 12px 16px;
    text-decoration: none;
    color: #0645ad;
    border-bottom: 1px solid #eaecf0;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.15s ease-in-out;
  }

  .menu-item:last-child {
    border-bottom: none;
  }

  .menu-item:hover {
    background-color: #eaecf0;
    text-decoration: underline;
  }

  .menu-item:focus {
    background-color: #eaecf0;
    outline: 2px solid #36c;
    outline-offset: -2px;
  }

  .menu-links {
    border-top: 1px solid #eaecf0;
  }

  /* Option styling for select elements */
  option {
    color: #000000;
    background-color: #ffffff;
    padding: 4px;
  }

  /* Additional Safari fixes */
  select.mode-option {
    -webkit-border-radius: 2px;
    -webkit-box-shadow: none;
  }

  select.mode-option::-webkit-inner-spin-button,
  select.mode-option::-webkit-outer-spin-button {
    display: none;
    -webkit-appearance: none;
  }

  /* Ensure buttons don't have Safari's default styling */
  button.mode-option {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
  }
</style>
