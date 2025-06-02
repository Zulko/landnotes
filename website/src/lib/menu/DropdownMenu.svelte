<script>
  let {
    value = $bindable(),
    options = [],
    displayValue = "",
    placeholder = "Select...",
    minWidth = "60px",
    maxHeight = "200px",
    disabled = false,
    onSelect = () => {},
  } = $props();

  let isOpen = $state(false);
  let dropdownContainer;

  function toggleDropdown() {
    if (!disabled) {
      isOpen = !isOpen;
    }
  }

  function selectOption(optionValue, optionLabel) {
    value = optionValue;
    onSelect(optionValue, optionLabel);
    isOpen = false;
  }

  function handleClickOutside(event) {
    if (dropdownContainer && !dropdownContainer.contains(event.target)) {
      isOpen = false;
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      isOpen = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div
  class="dropdown-container"
  bind:this={dropdownContainer}
  style="min-width: {minWidth}"
>
  <button
    class="dropdown-trigger"
    class:disabled
    onclick={toggleDropdown}
    aria-expanded={isOpen}
    aria-haspopup="listbox"
    {disabled}
  >
    <span class="dropdown-value">{displayValue || placeholder}</span>
    <svg
      class="dropdown-arrow"
      class:open={isOpen}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polyline points="6,9 12,15 18,9"></polyline>
    </svg>
  </button>

  {#if isOpen}
    <div class="dropdown-menu" role="listbox" style="max-height: {maxHeight}">
      {#each options as option}
        <button
          class="dropdown-item"
          class:selected={value === option.value}
          onclick={() => selectOption(option.value, option.label)}
          role="option"
          aria-selected={value === option.value}
        >
          {option.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .dropdown-container {
    position: relative;
    display: inline-block;
  }

  .dropdown-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background-color: #ffffff;
    color: #374151;
    font-size: 14px;
    font-family: inherit;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    outline: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    width: 100%;
    text-align: left;
  }

  .dropdown-trigger:hover:not(.disabled) {
    border-color: #9ca3af;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  .dropdown-trigger:focus:not(.disabled) {
    border-color: #3b82f6;
    box-shadow:
      0 0 0 3px rgba(59, 130, 246, 0.1),
      0 2px 6px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  .dropdown-trigger.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .dropdown-value {
    flex: 1;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dropdown-arrow {
    margin-left: 8px;
    color: #9ca3af;
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .dropdown-arrow.open {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    margin-top: 4px;
    overflow-y: auto;
    animation: dropdownFadeIn 0.15s ease-out;
    min-width: 100%;
    width: max-content;
    max-width: 400px;
  }

  @keyframes dropdownFadeIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dropdown-item {
    display: block;
    width: 100%;
    padding: 10px 16px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    font-size: 14px;
    font-family: inherit;
    font-weight: 500;
    color: #374151;
    transition: background-color 0.15s ease;
    outline: none;
    white-space: nowrap;
    border-bottom: 1px solid #f3f4f6;
  }

  .dropdown-item:last-child {
    border-bottom: none;
  }

  .dropdown-item:hover {
    background-color: #f8fafc;
    color: #2563eb;
  }

  .dropdown-item:focus {
    background-color: #f8fafc;
    color: #2563eb;
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
  }

  .dropdown-item.selected {
    background-color: #3b82f6;
    color: #ffffff;
    font-weight: 600;
  }

  .dropdown-item.selected:hover {
    background-color: #2563eb;
  }

  /* Custom scrollbar for dropdown menus */
  .dropdown-menu::-webkit-scrollbar {
    width: 6px;
  }

  .dropdown-menu::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }

  .dropdown-menu::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  .dropdown-menu::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
</style>
