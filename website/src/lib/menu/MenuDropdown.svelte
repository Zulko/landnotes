<script>
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

  /** @param {MouseEvent} event */
  function handleClickOutside(event) {
    // Close menu when clicking outside
    if (!(event.target instanceof Element)) {
      return;
    }

    if (
      !event.target.closest(".menu-container") &&
      !event.target.closest(".menu-button")
    ) {
      onCloseMenu();
    }
  }

  /** @param {string} value */
  function handleDateFilterSelect(value) {
    strictDate = value === "strict";
  }

  /**
   * @param {unknown} value
   * @returns {value is { name: string, message: string }}
   */
  function hasErrorDetails(value) {
    return (
      typeof value === "object" &&
      value !== null &&
      "name" in value &&
      typeof value.name === "string" &&
      "message" in value &&
      typeof value.message === "string"
    );
  }

  async function handleShareLink() {
    const currentUrl = window.location.href;

    try {
      if (navigator.share) {
        // Use native share on mobile devices
        await navigator.share({
          title: "Landnotes - Wikipedia on the map",
          url: currentUrl,
        });
        // If we reach here, sharing was successful
        console.log("Share completed successfully");
      } else {
        // Copy to clipboard on desktop
        await navigator.clipboard.writeText(currentUrl);
        alert("Link copied to clipboard");
      }
    } catch (error) {
      const shareError = hasErrorDetails(error)
        ? error
        : { name: "Error", message: String(error) };

      console.log("Share operation failed:", shareError.name, shareError.message);

      // Check if it's a user cancellation (common with navigator.share)
      if (
        shareError.name === "AbortError" ||
        shareError.message.includes("canceled")
      ) {
        console.log("User canceled the share operation");
        // Don't show fallback for user cancellation
        onCloseMenu();
        return;
      }

      // Fallback: copy to clipboard for other errors
      try {
        await navigator.clipboard.writeText(currentUrl);
        alert("Link copied to clipboard!");
      } catch (clipboardError) {
        console.error("Failed to share or copy link:", error, clipboardError);
        alert("Failed to copy link to clipboard");
      }
    }

    onCloseMenu();
  }

  const dateFilterOptions = [
    { value: "overlapping", label: "All events overlapping with the date" },
    { value: "strict", label: "Only events strictly within the date" },
  ];

  const dateFilterValue = $derived(strictDate ? "strict" : "overlapping");
  const dateFilterDisplayValue = $derived(
    strictDate
      ? "Only events strictly within the date"
      : "All events overlapping with the date"
  );
</script>

<svelte:document onclick={handleClickOutside} />

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
          value={dateFilterValue}
          options={dateFilterOptions}
          displayValue={dateFilterDisplayValue}
          minWidth="280px"
          ariaLabel="Date filter"
          onSelect={handleDateFilterSelect}
        />
      </div>
    {/if}

    <!-- Links section -->
    <div class="menu-links">
      <span
        onclick={handleShareLink}
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleShareLink();
          }
        }}
        class="menu-item"
        role="button"
        tabindex="0"
      >
        Share the link for the current view
      </span>
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
    padding: 12px 16px;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    align-items: center;
    gap: 12px;
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
    gap: 6px;
    flex-wrap: wrap;
  }

  .mode-option {
    padding: 6px 12px;
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
    padding: 12px 16px;
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
