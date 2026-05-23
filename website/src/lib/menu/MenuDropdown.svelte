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

  const canNativeShare = $derived(
    typeof navigator !== "undefined" && typeof navigator.share === "function",
  );

  function getCurrentUrl() {
    return window.location.href;
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(getCurrentUrl());
      setShareStatus("Copied");
      closeAfterStatus();
    } catch (error) {
      console.error("Failed to copy link:", error);
      setShareStatus("Couldn't copy link", "error");
    }
  }

  async function handleShareLink() {
    try {
      await navigator.share({
        title: "Landnotes - Wikipedia on the map",
        url: getCurrentUrl(),
      });
      onCloseMenu();
    } catch (error) {
      const shareError = hasErrorDetails(error)
        ? error
        : { name: "Error", message: String(error) };

      if (
        shareError.name === "AbortError" ||
        shareError.message.includes("canceled")
      ) {
        return;
      }

      console.error("Share operation failed:", shareError.name, shareError.message);
      setShareStatus("Couldn't share link", "error");
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

    <div class="menu-group share-group">
      <span class="menu-label">Link to your current view</span>
      <div class="menu-options">
        <button type="button" class="mode-option" onclick={handleCopyLink}>
          <span aria-hidden="true">⧉</span> Copy
        </button>
        <button
          type="button"
          class="mode-option"
          onclick={handleShareLink}
          disabled={!canNativeShare}
          title={canNativeShare ? undefined : "Sharing is not supported in this browser"}
        >
          <span aria-hidden="true">↗</span> Share
        </button>
      </div>
      {#if shareStatus}
        <p
          class="share-feedback {shareStatusType}"
          role="status"
          aria-live="polite"
        >
          <span class="share-feedback-mark" aria-hidden="true">
            {shareStatusType === "success" ? "✓" : "!"}
          </span>
          {shareStatus}
        </p>
      {/if}
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

  .mode-option:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .mode-option:disabled:hover,
  .mode-option:disabled:focus {
    background-color: var(--ln-color-surface);
    border-color: var(--ln-color-border);
    box-shadow: var(--ln-shadow-sm);
    transform: none;
  }

  .menu-item {
    display: block;
    padding: 12px 16px;
    text-decoration: none;
    color: var(--ln-color-primary);
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
    transition: all var(--ln-transition-base);
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

  .share-group .share-feedback {
    flex-basis: 100%;
    margin: 2px 0 0;
  }

  .share-feedback {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    padding: 5px 10px;
    border-radius: var(--ln-radius-md);
    font-size: 12px;
    font-weight: 500;
    line-height: 1.3;
    background: color-mix(in srgb, var(--ln-color-success) 10%, var(--ln-color-surface));
    color: var(--ln-color-success);
    animation: share-feedback-in var(--ln-transition-base);
  }

  .share-feedback-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: var(--ln-radius-pill);
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    background: color-mix(in srgb, var(--ln-color-success) 18%, var(--ln-color-surface));
  }

  .share-feedback.error {
    background: color-mix(in srgb, var(--ln-color-danger) 10%, var(--ln-color-surface));
    color: var(--ln-color-danger);
  }

  .share-feedback.error .share-feedback-mark {
    background: color-mix(in srgb, var(--ln-color-danger) 18%, var(--ln-color-surface));
  }

  @keyframes share-feedback-in {
    from {
      opacity: 0;
      transform: translateY(-3px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
