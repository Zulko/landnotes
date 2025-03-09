<script>
  const basePath = import.meta.env.BASE_URL;
  // Props
  export let title = "";
  export let expanded = false;

  // Events
  export let onClose = () => {};
  export let onToggleExpand = () => {};
  export let onOpenExternal = () => {};
</script>

<div class="pane-header">
  <h2>{title}</h2>
  <div class="header-buttons">
    <button
      class="icon-button external-link-button"
      on:click={onOpenExternal}
      title="Open in new tab"
      aria-label="Open in new tab"
    >
      <img src="/icons/external-link.svg" alt="Open in new tab" class="icon" />
    </button>
    <!-- Desktop Expand Button (hidden on mobile) -->
    <button
      class="icon-button expand-button desktop-only"
      class:active={expanded}
      on:click={onToggleExpand}
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
      on:click={onToggleExpand}
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
    <button class="close-button" on:click={onClose} aria-label="Close panel">
      &times;
    </button>
  </div>
</div>

<style>
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
