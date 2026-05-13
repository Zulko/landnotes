<script>
  import { onDestroy } from "svelte";
  import { getEntriesfromText } from "../data/places_data";
  import MenuDropdown from "./MenuDropdown.svelte";
  import DatePicker from "./DatePicker.svelte";

  import { appState, uiGlobals, uiState } from "../appState.svelte";

  /**
   * @typedef {Object} SearchEntry
   * @property {string | number} [id]
   * @property {*} [geokey]
   * @property {string} page_title
   * @property {number} lat
   * @property {number} lon
   * @property {number} [n_events]
   */

  let searchQuery = $state("");
  /** @type {SearchEntry[]} */
  let searchResults = $state([]);
  let isActive = $state(false);
  let isLoading = $state(false);
  let selectedIndex = $state(-1); // Track the currently selected suggestion
  let isMenuOpen = $state(false); // State for menu dropdown visibility

  /** @type {ReturnType<typeof setTimeout> | null} */
  let debounceTimer = null;
  let searchRequestId = 0;
  const basePath = import.meta.env.BASE_URL;
  const searchInputId = "search-input";
  const searchResultsId = "search-results";
  const activeDescendantId = $derived(
    isActive && selectedIndex >= 0 && searchResults[selectedIndex]
      ? getSearchOptionId(searchResults[selectedIndex])
      : undefined
  );
  const noResultsMessage = $derived(
    appState.mode === "events"
      ? "No matching pages or events found"
      : "No matching locations found"
  );

  // Debounced search function
  function debouncedSearch() {
    isLoading = true;

    // Clear any existing timer
    if (debounceTimer) clearTimeout(debounceTimer);
    const requestId = ++searchRequestId;

    // Set a new timer
    debounceTimer = setTimeout(async () => {
      const query = searchQuery;
      const searchMode = appState.mode === "events" ? "pages" : "places";

      if (query && query.length > 1) {
        // Different API endpoints based on mode
        const results = await getEntriesfromText(query, searchMode);
        if (requestId !== searchRequestId) {
          return;
        }
        searchResults = results;
        isActive = true;
      } else {
        if (requestId !== searchRequestId) {
          return;
        }
        searchResults = [];
        isActive = false;
      }
      isLoading = false;
    }, 300); // 0.3 seconds debounce
  }

  // Search text reactive statement
  $effect(() => {
    if (searchQuery && searchQuery.length > 1) {
      isLoading = true;
      searchResults = [];
      debouncedSearch();
    } else {
      searchRequestId += 1;
      searchResults = [];
      isActive = false;
      isLoading = false;
      // Clear any pending search
      if (debounceTimer) clearTimeout(debounceTimer);
    }
  });

  // Reset selected index when search results change
  $effect(() => {
    if (searchResults) {
      selectedIndex = -1;
    }
  });

  // Toggle menu open/closed
  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  // Handle menu close request from MenuDropdown
  function onCloseMenu() {
    isMenuOpen = false;
  }

  onDestroy(() => {
    // Clean up any pending timers when component is destroyed
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  /**
   * @param {KeyboardEvent} event
   */
  function handleKeydown(event) {
    if (!isActive || searchResults.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedIndex = (selectedIndex + 1) % searchResults.length;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex =
        selectedIndex <= 0 ? searchResults.length - 1 : selectedIndex - 1;
    } else if (event.key === "Enter" && selectedIndex >= 0) {
      event.preventDefault();
      handleSelect(searchResults[selectedIndex]);
    } else if (event.key === "Escape") {
      isActive = false;
    }
  }

  /**
   * @param {SearchEntry} entry
   */
  function handleSelect(entry) {
    if (appState.mode === "places") {
      const { geokey, lat, lon, page_title } = entry;
      const selectedMarkerId = geokey;
      if (appState.selectedMarkerId !== selectedMarkerId) {
        appState.selectedMarkerId = selectedMarkerId;
      }
      appState.wikiSection = "";
      appState.wikiPage = page_title;
      appState.paneTab = "wikipedia";
      /** @type {(options: { location: { lat: number, lon: number }, zoom: number, flyDuration: number, reserveMobilePane?: boolean }) => void} */ (
        /** @type {unknown} */ (uiGlobals.mapTravel)
      )({
        location: { lat, lon },
        zoom: Math.max(12, appState.zoom),
        flyDuration: 1,
        reserveMobilePane: true,
      });
    } else {
      const { page_title } = entry;
      appState.wikiSection = "";
      appState.wikiPage = page_title;
      appState.paneTab = "wikipedia";
    }
    searchQuery = "";
    isActive = false;
    selectedIndex = -1;
  }

  /**
   * @param {KeyboardEvent} event
   * @param {SearchEntry} entry
   */
  function handleSuggestionKeydown(event, entry) {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    handleSelect(entry);
  }

  function clearSearch() {
    searchRequestId += 1;
    searchQuery = "";
    searchResults = [];
    isActive = false;
    selectedIndex = -1;
    isLoading = false;
    if (debounceTimer) clearTimeout(debounceTimer);
  }

  /**
   * @param {SearchEntry} entry
   */
  function getSearchResultKey(entry) {
    return entry.id ?? entry.geokey ?? entry.page_title;
  }

  /**
   * @param {SearchEntry} entry
   */
  function getSearchOptionId(entry) {
    return `search-option-${String(getSearchResultKey(entry)).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  function handleBlur() {
    // Small delay to allow click events on suggestions to fire
    setTimeout(() => {
      isActive = false;
      selectedIndex = -1;
    }, 200);
  }

  function handleFocus() {
    if (searchQuery && searchQuery.length > 1) {
      isActive = true;
      selectedIndex = -1;
    }
  }
</script>

<div class="search-container">
  <div class="search-input-wrapper">
    <input
      id={searchInputId}
      type="text"
      placeholder={`Search a ${appState.mode === "places" ? "place" : "page"}`}
      bind:value={searchQuery}
      onfocus={handleFocus}
      onblur={handleBlur}
      onkeydown={handleKeydown}
      class="search-input"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={isActive}
      aria-controls={searchResultsId}
      aria-activedescendant={activeDescendantId}
    />
    {#if searchQuery}
      <button
        class="clear-button"
        onclick={clearSearch}
        aria-label="Clear search"
        title="Clear search"
      >
        ×
      </button>
    {/if}
    <div class="search-icon">
      <img src={`${import.meta.env.BASE_URL}icons/search.svg`} alt="Search" />
    </div>

    <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {#if uiState.dataIsLoading}
        Loading data...
      {/if}
    </div>
    <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {#if isLoading}
        Searching...
      {/if}
    </div>

    <!-- Menu button wrapper with the hamburger icon now here -->
    <div class="menu-button-wrapper">
      {#if uiState.dataIsLoading}
        <div class="menu-loading-indicator" title="Loading data" aria-hidden="true">
          <div class="spinner"></div>
        </div>
      {/if}
      <button class="menu-button" onclick={toggleMenu} title="Menu" aria-label="Menu">
        <img src={`${basePath}icons/menu.svg`} alt="" class="icon" />
      </button>
    </div>
  </div>

  {#if isActive && searchResults.length > 0}
    <div class="suggestions" id={searchResultsId} role="listbox" aria-labelledby={searchInputId}>
      {#each searchResults as entry, i (getSearchResultKey(entry))}
        <div
          id={getSearchOptionId(entry)}
          class="suggestion-item {i === selectedIndex ? 'selected' : ''}"
          onmousedown={() => handleSelect(entry)}
          onkeydown={(event) => handleSuggestionKeydown(event, entry)}
          role="option"
          aria-selected={i === selectedIndex}
          tabindex="0"
        >
          <span class="suggestion-title"
            >{entry.page_title.replaceAll("_", " ")}</span
          >
          <span class="suggestion-location">
            {#if appState.mode === "events"}
              ({entry.n_events || 0} events)
            {:else}
              ({entry.lat.toFixed(2)}, {entry.lon.toFixed(2)})
            {/if}
          </span>
        </div>
      {/each}
    </div>
  {:else if isActive && searchQuery.length > 1}
    <div class="suggestions" id={searchResultsId} role="listbox" aria-labelledby={searchInputId}>
      <div class="no-results" role="presentation">
        {#if isLoading}
          Searching...
        {:else}
          {noResultsMessage}
        {/if}
      </div>
    </div>
  {/if}

  <!-- Menu component -->
  {#if appState.mode === "events" && searchResults.length == 0}
    <DatePicker bind:date={appState.date} />
  {/if}
  {#if isMenuOpen}
    <MenuDropdown
      bind:mode={appState.mode}
      bind:strictDate={appState.strictDate}
      {onCloseMenu}
    />
  {/if}
</div>

<style>
  .search-container {
    position: relative;
    width: 100%;
    margin-bottom: 10px;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    border-radius: 20px;
    padding: 0px;
  }

  .search-input {
    width: 100%;
    padding: 10px 40px 10px 35px;
    border: 1px solid #ccc;
    border-radius: 20px;
    font-size: 16px;
    outline: none;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  .search-input:focus {
    border-color: #4285f4;
    box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
  }

  .search-icon {
    position: absolute;
    left: 8px;
    pointer-events: none;
    color: #666;
    height: 25px;
    opacity: 0.5;
  }

  .menu-button-wrapper {
    position: absolute;
    right: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    width: 28px;
    border-radius: 50%;
    padding: 5px;
  }

  .menu-button {
    background: transparent;
    border: none;
    font-size: 18px;
    color: #999;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 0;
  }

  .menu-loading-indicator {
    position: absolute;
    right: -2px;
    top: -2px;
    pointer-events: none;
  }

  .menu-button-wrapper:hover {
    background-color: #eee;
  }

  .clear-button {
    position: absolute;
    right: 40px; /* Keeps space for menu button */
    background: none;
    border: none;
    font-size: 20px;
    color: #666;
    cursor: pointer;
    padding: 0;
    height: 20px;
    width: 20px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    max-height: 300px;
    overflow-y: auto;
    margin-top: 5px;
  }

  .suggestion-item {
    padding: 10px 15px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .suggestion-item.selected {
    background-color: #f0f7ff;
  }

  .suggestion-item:last-child {
    border-bottom: none;
  }

  .suggestion-item:hover {
    background-color: #f5f5f5;
  }

  .suggestion-title {
    font-weight: 500;
  }

  .suggestion-location {
    font-size: 0.8em;
    color: #666;
  }

  .no-results {
    padding: 15px;
    text-align: center;
    color: #666;
    font-style: italic;
  }

  .spinner {
    width: 10px;
    height: 10px;
    border: 2px solid #e0e0e0;
    border-top: 2px solid #666;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
