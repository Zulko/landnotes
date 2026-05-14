<script>
  import { appState } from "../appState.svelte";
  import DropdownMenu from "./DropdownMenu.svelte";

  let {
    mode = $bindable("places"),
    strictDate = $bindable(false),
    onCloseMenu,
  } = $props();
  let shareStatus = $state("");
  let shareStatusType = $state("success");
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let closeAfterStatusTimeout;

  /** @param {string} message */
  function setShareStatus(message, type = "success") {
    shareStatus = message;
    shareStatusType = type;
  }

  function closeAfterStatus() {
    clearTimeout(closeAfterStatusTimeout);
    closeAfterStatusTimeout = setTimeout(onCloseMenu, 1600);
  }

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
        onCloseMenu();
        return;
      } else {
        // Copy to clipboard on desktop
        await navigator.clipboard.writeText(currentUrl);
        setShareStatus("Link copied to clipboard.");
        closeAfterStatus();
        return;
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
        setShareStatus("Link copied to clipboard.");
        closeAfterStatus();
      } catch (clipboardError) {
        console.error("Failed to share or copy link:", error, clipboardError);
        setShareStatus("Unable to copy link. Please try again.", "error");
      }
    }
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
      <div class="share-status {shareStatusType}" role="status" aria-live="polite">
        {shareStatus}
      </div>
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
    background: var(--ln-color-surface);
    border: 1px solid var(--ln-color-border);
    border-radius: var(--ln-radius-xl);
    box-shadow: var(--ln-shadow-lg);
    z-index: 1000;
    max-height: 300px;
    overflow-y: auto;
    margin-top: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
      "Liberation Sans", sans-serif;
  }

  .menu-group {
    padding: 12px 16px;
    border-bottom: 1px solid var(--ln-color-border-muted);
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
    color: var(--ln-color-text);
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
    border: 1px solid var(--ln-color-border);
    border-radius: var(--ln-radius-lg);
    background-color: var(--ln-color-surface);
    color: var(--ln-color-text);
    cursor: pointer;
    font-size: 14px;
    font-family: inherit;
    font-weight: 500;
    white-space: nowrap;
    transition: all var(--ln-transition-base);
    outline: none;
    box-shadow: var(--ln-shadow-sm);
  }

  .mode-option:hover {
    background-color: var(--ln-color-surface-muted);
    border-color: var(--ln-color-icon-muted);
    box-shadow: var(--ln-shadow-md);
    transform: translateY(-1px);
  }

  .mode-option:focus {
    border-color: var(--ln-color-focus);
    box-shadow:
      0 0 0 3px var(--ln-color-focus-ring),
      var(--ln-shadow-md);
    transform: translateY(-1px);
  }

  .mode-option:active {
    background-color: var(--ln-color-surface-hover);
    transform: translateY(0);
  }

  .mode-option.active {
    background-color: var(--ln-color-primary);
    color: var(--ln-color-surface);
    border-color: var(--ln-color-primary);
    box-shadow: var(--ln-shadow-primary-sm);
  }

  .mode-option.active:hover {
    background-color: var(--ln-color-primary-hover);
    border-color: var(--ln-color-primary-hover);
    box-shadow: var(--ln-shadow-primary-md);
  }

  .menu-item {
    display: block;
    padding: 12px 16px;
    text-decoration: none;
    color: var(--ln-color-primary);
    border-bottom: 1px solid var(--ln-color-border-muted);
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
    transition: all var(--ln-transition-base);
  }

  .menu-item:last-child {
    border-bottom: none;
  }

  .menu-item:hover {
    background-color: var(--ln-color-surface-muted);
    color: var(--ln-color-primary-hover);
    text-decoration: none;
  }

  .menu-item:focus {
    background-color: var(--ln-color-surface-muted);
    outline: 2px solid var(--ln-color-focus);
    outline-offset: -2px;
    color: var(--ln-color-primary-hover);
  }

  .menu-links {
    border-top: 1px solid var(--ln-color-border-muted);
  }

  .share-status {
    min-height: 20px;
    padding: 0 16px 8px;
    color: var(--ln-color-success);
    font-size: 13px;
  }

  .share-status.error {
    color: var(--ln-color-danger);
  }
</style>
