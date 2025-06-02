<script>
  import { onMount, onDestroy } from "svelte";
  import { appState } from "../appState.svelte";
  import DropdownMenu from "./DropdownMenu.svelte";

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

  function handleDateFilterSelect(value) {
    strictDate = value === "strict";
  }

  const dateFilterOptions = [
    { value: "overlapping", label: "All events overlapping with the date" },
    { value: "strict", label: "Only events strictly within the date" },
  ];

  let dateFilterValue = $state(strictDate ? "strict" : "overlapping");
  const dateFilterDisplayValue = $derived(
    strictDate
      ? "Only events strictly within the date"
      : "All events overlapping with the date"
  );

  // Sync the internal state with the prop
  $effect(() => {
    dateFilterValue = strictDate ? "strict" : "overlapping";
  });

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
        <DropdownMenu
          bind:value={dateFilterValue}
          options={dateFilterOptions}
          displayValue={dateFilterDisplayValue}
          minWidth="280px"
          onSelect={handleDateFilterSelect}
        />
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
    border: 1px solid #d1d5db;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    max-height: 300px;
    overflow-y: auto;
    margin-top: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
      "Liberation Sans", sans-serif;
  }

  .menu-group {
    padding: 16px 20px;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .menu-group:last-of-type {
    border-bottom: none;
  }

  .menu-label {
    font-weight: 600;
    color: #374151;
    font-size: 14px;
    min-width: fit-content;
  }

  .menu-options {
    display: flex;
    flex-direction: row;
    gap: 8px;
    flex-wrap: wrap;
  }

  .mode-option {
    padding: 8px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background-color: #ffffff;
    color: #374151;
    cursor: pointer;
    font-size: 14px;
    font-family: inherit;
    font-weight: 500;
    white-space: nowrap;
    transition: all 0.2s ease;
    outline: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .mode-option:hover {
    background-color: #f9fafb;
    border-color: #9ca3af;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  .mode-option:focus {
    border-color: #3b82f6;
    box-shadow:
      0 0 0 3px rgba(59, 130, 246, 0.1),
      0 2px 6px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  .mode-option:active {
    background-color: #f3f4f6;
    transform: translateY(0);
  }

  .mode-option.active {
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;
    box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
  }

  .mode-option.active:hover {
    background-color: #2563eb;
    border-color: #2563eb;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
  }

  .menu-item {
    display: block;
    padding: 16px 20px;
    text-decoration: none;
    color: #3b82f6;
    border-bottom: 1px solid #f3f4f6;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .menu-item:last-child {
    border-bottom: none;
  }

  .menu-item:hover {
    background-color: #f8fafc;
    color: #2563eb;
    text-decoration: none;
  }

  .menu-item:focus {
    background-color: #f8fafc;
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
    color: #2563eb;
  }

  .menu-links {
    border-top: 1px solid #f3f4f6;
  }
</style>
