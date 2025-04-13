<script>
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import { getEntriesfromText } from "./geodata";
  import MenuDropdown from "./MenuDropdown.svelte";
  
  export let searchQuery = "";
  export let searchMode = "places";

  const dispatch = createEventDispatcher();

  let searchResults = [];
  let isActive = false;
  let isLoading = false;
  let debounceTimer = null;
  let selectedIndex = -1; // Track the currently selected suggestion
  let isMenuOpen = false; // State for menu dropdown visibility

  // Debounced search function
  function debouncedSearch() {
    isLoading = true;

    // Clear any existing timer
    if (debounceTimer) clearTimeout(debounceTimer);

    // Set a new timer
    debounceTimer = setTimeout(async () => {
      if (searchQuery && searchQuery.length > 1) {
        searchResults = await getEntriesfromText(searchQuery);
        isActive = true;
      } else {
        searchResults = [];
        isActive = false;
      }
      isLoading = false;
    }, 300); // 0.3 seconds debounce
  }

  // Search text reactive statement
  $: {
    if (searchQuery && searchQuery.length > 1) {
      isLoading = true;
      searchResults = [];
      debouncedSearch();
    } else {
      searchResults = [];
      isActive = false;
      isLoading = false;
      // Clear any pending search
      if (debounceTimer) clearTimeout(debounceTimer);
    }
  }

  function handleModeChange(event) {
    searchMode = event.detail.mode;
    dispatch("modeChange", { mode: searchMode });
  }

  // Toggle menu open/closed
  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  // Handle menu close request from MenuDropdown
  function handleCloseMenu() {
    isMenuOpen = false;
  }

  onDestroy(() => {
    // Clean up any pending timers when component is destroyed
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  function handleKeydown(event) {
    if (!isActive || searchResults.length === 0) return;
    
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectedIndex = (selectedIndex + 1) % searchResults.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedIndex = selectedIndex <= 0 ? searchResults.length - 1 : selectedIndex - 1;
    } else if (event.key === 'Enter' && selectedIndex >= 0) {
      event.preventDefault();
      handleSelect(searchResults[selectedIndex]);
    } else if (event.key === 'Escape') {
      isActive = false;
    }
  }

  function handleSelect(entry) {
    dispatch("select", entry);
    searchQuery = "";
    isActive = false;
    selectedIndex = -1;
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

  // Reset selected index when search results change
  $: if (searchResults) {
    selectedIndex = -1;
  }
</script>

<div class="search-container">
  <div class="search-input-wrapper">
    <input
      type="text"
      placeholder="Enter a place name"
      bind:value={searchQuery}
      on:focus={handleFocus}
      on:blur={handleBlur}
      on:keydown={handleKeydown}
      class="search-input"
    />
    {#if searchQuery}
      <button
        class="clear-button"
        on:click={() => {
          searchQuery = "";
          isActive = false;
        }}
      >
        ×
      </button>
    {/if}
    <div class="search-icon">
      <img src={`${import.meta.env.BASE_URL}icons/search.svg`} alt="Search" />
    </div>
    
    <!-- Menu button wrapper with the hamburger icon now here -->
    <div class="menu-button-wrapper">
      <button class="menu-button" on:click={toggleMenu} aria-label="Menu">
        ☰
      </button>
    </div>
  </div>

  {#if isActive && searchResults.length > 0}
    <div class="suggestions" role="listbox">
      {#each searchResults as entry, i}
        <div
          class="suggestion-item {i === selectedIndex ? 'selected' : ''}"
          on:mousedown={() => handleSelect(entry)}
          role="option"
          aria-selected={i === selectedIndex}
          tabindex="0"
        >
          <span class="suggestion-title"
            >{entry.page_title.replaceAll("_", " ")}</span
          >
          <span class="suggestion-location"
            >({entry.lat.toFixed(4)}, {entry.lon.toFixed(4)})</span
          >
        </div>
      {/each}
    </div>
  {:else if isActive && searchQuery.length > 1}
    <div class="suggestions" role="listbox">
      <div class="no-results" role="presentation">
        {#if isLoading}
          Searching...
        {:else}
          No matching locations found
        {/if}
      </div>
    </div>
  {/if}

  <!-- Menu component -->
  {#if isMenuOpen}
  <MenuDropdown 
    {searchMode} 
    on:modeChange={handleModeChange}
    on:closeMenu={handleCloseMenu}
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
    right: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    width: 28px;
    border-radius: 50%;
    margin-right: 2px;
  }

  .menu-button {
    background: transparent;
    border: none;
    font-size: 18px;
    color: #666;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 0;
  }

  .menu-button-wrapper:hover {
    background-color: #e0e0e0;
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
</style>
