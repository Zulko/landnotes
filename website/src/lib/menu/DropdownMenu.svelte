<script module>
  let dropdownIdCounter = 0;
</script>

<script>
  /** @typedef {{ value: string | number, label: string }} DropdownOption */

  let {
    value = $bindable(),
    options = [],
    displayValue = "",
    placeholder = "Select...",
    minWidth = "60px",
    maxHeight = "200px",
    ariaLabel = undefined,
    disabled = false,
    onSelect = () => {},
  } = $props();

  let isOpen = $state(false);
  let activeOptionIndex = $state(-1);
  /** @type {HTMLElement | null} */
  let dropdownContainer = null;
  const dropdownId = `dropdown-${++dropdownIdCounter}`;
  const triggerId = `${dropdownId}-trigger`;
  const listboxId = `${dropdownId}-listbox`;
  const selectedOptionIndex = $derived(
    options.findIndex((option) => option.value === value)
  );
  const activeOption = $derived(
    isOpen && activeOptionIndex >= 0 ? options[activeOptionIndex] : null
  );
  const activeDescendantId = $derived(
    activeOption ? getOptionId(activeOption) : undefined
  );

  function toggleDropdown() {
    if (!disabled) {
      if (isOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    }
  }

  /** @param {number} [index] */
  function openDropdown(index = selectedOptionIndex >= 0 ? selectedOptionIndex : 0) {
    if (disabled) return;
    isOpen = true;
    activeOptionIndex = options.length > 0 ? index : -1;
  }

  function closeDropdown() {
    isOpen = false;
    activeOptionIndex = -1;
  }

  /**
   * @param {string | number} optionValue
   * @param {string} optionLabel
   */
  function selectOption(optionValue, optionLabel) {
    value = optionValue;
    onSelect(optionValue, optionLabel);
    closeDropdown();
  }

  /** @param {MouseEvent} event */
  function handleClickOutside(event) {
    if (dropdownContainer && event.target instanceof Node && !dropdownContainer.contains(event.target)) {
      closeDropdown();
    }
  }

  /** @param {KeyboardEvent} event */
  function handleWindowKeydown(event) {
    if (event.key === "Escape") {
      closeDropdown();
    }
  }

  /** @param {KeyboardEvent} event */
  function handleTriggerKeydown(event) {
    if (disabled) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        openDropdown();
      } else {
        moveActiveOption(1);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openDropdown(options.length - 1);
      } else {
        moveActiveOption(-1);
      }
    } else if (event.key === "Home") {
      event.preventDefault();
      openDropdown(0);
    } else if (event.key === "End") {
      event.preventDefault();
      openDropdown(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen && activeOption) {
        selectOption(activeOption.value, activeOption.label);
      } else {
        openDropdown();
      }
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      closeDropdown();
    }
  }

  /** @param {number} offset */
  function moveActiveOption(offset) {
    if (options.length === 0) return;
    const startingIndex = activeOptionIndex >= 0 ? activeOptionIndex : 0;
    activeOptionIndex =
      (startingIndex + offset + options.length) % options.length;
  }

  /** @param {DropdownOption} option */
  function getOptionId(option) {
    return `${dropdownId}-option-${String(option.value).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  /** @param {number} index */
  function handleOptionMouseEnter(index) {
    activeOptionIndex = index;
  }

  /** @param {DropdownOption} option */
  function handleOptionClick(option) {
    selectOption(option.value, option.label);
  }

  /** @param {number} index */
  function isActiveOption(index) {
    return isOpen && activeOptionIndex === index;
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleWindowKeydown} />

<div
  class="dropdown-container"
  bind:this={dropdownContainer}
  style="min-width: {minWidth}"
>
  <div
    id={triggerId}
    class="dropdown-trigger"
    class:disabled
    onclick={toggleDropdown}
    onkeydown={handleTriggerKeydown}
    role="combobox"
    tabindex={disabled ? -1 : 0}
    aria-expanded={isOpen}
    aria-haspopup="listbox"
    aria-controls={listboxId}
    aria-activedescendant={activeDescendantId}
    aria-label={ariaLabel}
    aria-disabled={disabled}
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
  </div>

  {#if isOpen}
    <div
      id={listboxId}
      class="dropdown-menu"
      role="listbox"
      aria-labelledby={triggerId}
      style="max-height: {maxHeight}"
    >
      {#each options as option, index (option.value)}
        <button
          id={getOptionId(option)}
          class="dropdown-item"
          class:selected={value === option.value}
          class:active={isActiveOption(index)}
          onclick={() => handleOptionClick(option)}
          onmouseenter={() => handleOptionMouseEnter(index)}
          role="option"
          aria-selected={value === option.value}
          tabindex="-1"
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
    flex: 0 0 auto;
  }

  .dropdown-trigger {
    box-sizing: border-box;
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

  .dropdown-item:hover,
  .dropdown-item.active {
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
