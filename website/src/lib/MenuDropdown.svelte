<script>
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  
  export let searchMode = "places";
  
  const dispatch = createEventDispatcher();
  let isMenuOpen = false;

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  function handleMenuBlur() {
    // Small delay to allow click events on menu items to fire
    setTimeout(() => {
      isMenuOpen = false;
    }, 200);
  }

  function setSearchMode(mode) {
    searchMode = mode;
    dispatch("modeChange", { mode });
    isMenuOpen = false;
  }

  function handleClickOutside(event) {
    // Close menu when clicking outside
    if (isMenuOpen && !event.target.closest('.menu-container')) {
      isMenuOpen = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
  });
</script>

<div class="menu-container">
  <button class="menu-button" on:click={toggleMenu} aria-label="Menu">
    ☰
  </button>
  
  <!-- Menu dropdown -->
  {#if isMenuOpen}
    <div class="menu-dropdown" on:blur={handleMenuBlur} tabindex="-1">
      <div class="menu-group">
        <span class="menu-label">Mode:</span>
        <div class="menu-options">
          <button 
            class="mode-option {searchMode === 'places' ? 'active' : ''}" 
            on:click={() => setSearchMode('places')}
          >
            Places
          </button>
          <button 
            class="mode-option {searchMode === 'events' ? 'active' : ''}" 
            on:click={() => setSearchMode('events')}
          >
            Events
          </button>
        </div>
      </div>
      <a href="/blog-post" class="menu-item">Read the blog post</a>
      <a href="https://github.com/yourusername/yourrepo" target="_blank" rel="noopener noreferrer" class="menu-item">
        Go to the project source on GitHub
      </a>
    </div>
  {/if}
</div>

<style>
  .menu-container {
    position: relative;
    margin-left: 5px;
    margin-right: 5px;
  }

  .menu-button {
    background: none;
    border: none;
    font-size: 18px;
    color: #666;
    cursor: pointer;
    padding: 5px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .menu-button:hover {
    background-color: #f0f0f0;
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 1001;
    min-width: 200px;
    margin-top: 5px;
  }

  .menu-group {
    padding: 10px;
    border-bottom: 1px solid #eee;
  }

  .menu-label {
    display: block;
    font-weight: 500;
    margin-bottom: 5px;
    color: #666;
  }

  .menu-options {
    display: flex;
    gap: 5px;
  }

  .mode-option {
    padding: 5px 10px;
    border: 1px solid #ccc;
    border-radius: 15px;
    background: white;
    cursor: pointer;
    font-size: 14px;
  }

  .mode-option.active {
    background: #4285f4;
    color: white;
    border-color: #4285f4;
  }

  .menu-item {
    display: block;
    padding: 10px;
    text-decoration: none;
    color: #333;
    border-bottom: 1px solid #eee;
  }

  .menu-item:last-child {
    border-bottom: none;
  }

  .menu-item:hover {
    background-color: #f5f5f5;
  }
</style> 