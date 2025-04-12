<script>
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  
  export let searchMode = "places";
  export let isMenuOpen = false;
  
  const dispatch = createEventDispatcher();

  function handleMenuBlur() {
    // Small delay to allow click events on menu items to fire
    setTimeout(() => {
      dispatch("closeMenu");
    }, 200);
  }

  function setMode(mode) {
    searchMode = mode;
    dispatch("modeChange", { mode });
  }

  function handleClickOutside(event) {
    // Close menu when clicking outside
    if (isMenuOpen && !event.target.closest('.menu-container') && 
        !event.target.closest('.menu-button')) {
      dispatch("closeMenu");
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
  <!-- Menu dropdown -->
    <div class="menu-dropdown" on:blur={handleMenuBlur} tabindex="-1">
      <div class="menu-group">
        <span class="menu-label">Mode:</span>
        <div class="menu-options">
          <button 
            class="mode-option {searchMode === 'places' ? 'active' : ''}" 
            on:click={() => setMode('places')}
          >
            Places
          </button>
          <button 
            class="mode-option {searchMode === 'events' ? 'active' : ''}" 
            on:click={() => setMode('events')}
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
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    max-height: 300px;
    overflow-y: auto;
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
    padding: 10px 15px;
    text-decoration: none;
    color: #333;
    border-bottom: 1px solid #eee;
    cursor: pointer;
  }

  .menu-item:last-child {
    border-bottom: none;
  }

  .menu-item:hover {
    background-color: #f5f5f5;
  }
</style> 