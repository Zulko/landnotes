<script>
  import { appState } from "../appState.svelte";
  const basePath = import.meta.env.BASE_URL;

  let {
    expanded = $bindable(false),
    sheetState = $bindable("half"),
    isNarrowScreen = false,
    closePane,
    openWikiPageInNewTab,
  } = $props();

  let mobileExpanded = $derived(sheetState === "full");

  function toggleMobileSheetState() {
    sheetState = mobileExpanded ? "half" : "full";
  }
</script>

<div class="pane-header">
  {#if appState.paneTab === "wikipedia" || appState.paneTab === "events"}
    <div class="tab-buttons" role="tablist" aria-label="Sliding pane content">
      <button
        type="button"
        role="tab"
        class="tab-button"
        class:active={appState.paneTab === "wikipedia"}
        onclick={() => (appState.paneTab = "wikipedia")}
        aria-selected={appState.paneTab === "wikipedia"}
        aria-label="Wikipedia tab"
      >
        Wikipedia
      </button>
      <button
        type="button"
        role="tab"
        class="tab-button"
        class:active={appState.paneTab === "events"}
        onclick={() => (appState.paneTab = "events")}
        aria-selected={appState.paneTab === "events"}
        aria-label="Events tab"
      >
        Events
      </button>
    </div>
  {/if}

  <div class="header-buttons">
    {#if appState.wikiPage}
      <button
        type="button"
        class="icon-button external-link-button"
        onclick={openWikiPageInNewTab}
        title="Open in new tab"
        aria-label="Open in new tab"
      >
        <img
          src={`${basePath}icons/external-link.svg`}
          alt="Open in new tab"
          class="icon"
        />
      </button>
    {/if}
    <!-- Desktop Expand Button (hidden on mobile) -->
    <button
      type="button"
      class="icon-button expand-button desktop-only"
      class:active={expanded}
      onclick={() => (expanded = !expanded)}
      title={expanded ? "Shrink pane" : "Expand pane"}
      aria-label={expanded ? "Shrink pane" : "Expand pane"}
    >
      <img
        src={expanded
          ? `${basePath}icons/shrink.svg`
          : `${basePath}icons/expand.svg`}
        alt={expanded ? "Shrink pane" : "Expand pane"}
        class="icon"
      />
    </button>
    {#if isNarrowScreen}
      <button
        type="button"
        class="icon-button expand-button"
        class:active={mobileExpanded}
        onclick={toggleMobileSheetState}
        title={mobileExpanded ? "Shrink pane" : "Expand pane"}
        aria-label={mobileExpanded ? "Shrink pane" : "Expand pane"}
      >
        <img
          src={mobileExpanded
            ? `${basePath}icons/shrink.svg`
            : `${basePath}icons/expand-vertical.svg`}
          alt={mobileExpanded ? "Shrink pane" : "Expand pane"}
          class="icon"
        />
      </button>
    {/if}
    <button
      type="button"
      class="close-button"
      onclick={closePane}
      aria-label="Close panel"
    >
      &times;
    </button>
  </div>
</div>

<style>
  .pane-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.2rem;
    border-bottom: 1px solid var(--ln-color-border-muted);
    position: sticky;
    top: 0;
    background: var(--ln-color-surface);
    z-index: 1;
  }

  .tab-buttons {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .tab-button {
    padding: 6px 12px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-weight: 500;
    color: var(--ln-color-text);
    transition: all var(--ln-transition-base);
  }

  .tab-button:hover {
    background-color: var(--ln-color-surface-hover);
  }

  .tab-button.active {
    border-bottom: 2px solid var(--ln-color-primary);
    color: var(--ln-color-primary);
  }

  .header-buttons {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-left: auto;
  }

  .icon-button,
  .close-button {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    min-width: 36px;
    height: 36px;
    border-radius: var(--ln-radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-button:hover,
  .close-button:hover {
    background-color: var(--ln-color-surface-hover);
  }

  .icon {
    width: 16px;
    height: 16px;
  }

  .close-button {
    font-size: 1.5rem;
    margin-left: 4px;
  }

  .expand-button.active {
    color: var(--ln-color-primary);
  }

  /* Hide/show based on device type */
  .desktop-only {
    display: block;
  }

  /* Mobile styles */
  @media (max-width: 768px) {
    /* Hide desktop-only elements on mobile */
    .desktop-only {
      display: none;
    }

    .icon-button,
    .close-button,
    .tab-button {
      min-height: var(--ln-space-touch);
    }
  }
</style>
