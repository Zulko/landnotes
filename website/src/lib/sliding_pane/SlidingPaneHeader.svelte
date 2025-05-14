<script>
  import { appState } from "../appState.svelte";
  const basePath = import.meta.env.BASE_URL;

  let {
    expanded = $bindable(false),
    closePane,
    openWikiPageInNewTab,
  } = $props();
</script>

<div class="pane-header">
  <div class="tab-buttons">
    <button
      class="tab-button"
      class:active={appState.paneTab === "wikipedia"}
      onclick={() => (appState.paneTab = "wikipedia")}
      aria-label="Wikipedia tab"
    >
      Wikipedia
    </button>
    <button
      class="tab-button"
      class:active={appState.paneTab === "events"}
      onclick={() => (appState.paneTab = "events")}
      aria-label="Events tab"
    >
      Events
    </button>
  </div>

  <div class="header-buttons">
    <button
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
    <!-- Desktop Expand Button (hidden on mobile) -->
    <button
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
    <!-- Mobile Expand Button (hidden on desktop) -->
    <button
      class="icon-button expand-button mobile-only"
      class:active={expanded}
      onclick={() => (expanded = !expanded)}
      title={expanded ? "Shrink pane" : "Expand pane"}
      aria-label={expanded ? "Shrink pane" : "Expand pane"}
    >
      <img
        src={expanded
          ? `${basePath}icons/shrink.svg`
          : `${basePath}icons/expand-vertical.svg`}
        alt={expanded ? "Shrink pane" : "Expand pane"}
        class="icon"
      />
    </button>
    <button class="close-button" onclick={closePane} aria-label="Close panel">
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
    border-bottom: 1px solid #eee;
    position: sticky;
    top: 0;
    background: white;
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
    transition: all 0.2s ease;
  }

  .tab-button:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .tab-button.active {
    border-bottom: 2px solid #1a73e8;
    color: #1a73e8;
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

  .expand-button.active {
    color: #1a73e8;
  }

  /* Hide/show based on device type */
  .desktop-only {
    display: block;
  }

  .mobile-only {
    display: none;
  }

  /* Mobile styles */
  @media (max-width: 768px) {
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
