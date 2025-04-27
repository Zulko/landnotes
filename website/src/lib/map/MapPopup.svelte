<script>
  // Reactive state
  import { isTouchDevice } from "../device";
  import { onMount } from "svelte";

  let {
    popupContent,
    children,
    alwaysOpen = false,
    enterable = false,
    visibilityDelay = 0,
  } = $props(); // Title to look up
  let popupElement = $state(null); // Reference to popup element
  let triggerElement = $state(null); // Reference to trigger span
  let popupTop = $state(0);
  let popupLeft = $state(0);
  let isHovered = $state(false);
  let isOpen = $derived(alwaysOpen || (!isTouchDevice && isHovered));
  let closeTimeout = $state(null);
  let visibility = $state("hidden");
  let popupStyle = $derived(
    `transform: translate(${popupLeft}px, ${popupTop}px); visibility: ${visibility};`
  );
  let resizeObserver = $state(null);

  onMount(() => {
    if (popupElement) {
      resizeObserver = new ResizeObserver(() => {
        if (isOpen) {
          updateTooltipPosition();
        }
      });

      resizeObserver.observe(popupElement);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  });

  // Lifecycle
  $effect(() => {
    if (isOpen) {
      updateTooltipPosition();
      setTimeout(() => {
        visibility = "visible";
      }, visibilityDelay);
    } else {
      visibility = "hidden";
    }
  });
  $inspect(isOpen, isHovered);

  // Position the popup based on available screen space
  function updateTooltipPosition() {
    if (!popupElement || !triggerElement) return;

    const triggerRect = triggerElement.getBoundingClientRect();
    const popupRect = popupElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const mapWidth =
      document.getElementsByClassName("map-container")[0].clientWidth;
    const leftStart = isTouchDevice ? 0 : viewportWidth - mapWidth;

    // Default position (above and centered)
    let top = -popupRect.height - 2;
    let left = -popupRect.width / 2 + triggerRect.width / 2;

    // Check right edge
    if (triggerRect.left + left + popupRect.width > viewportWidth) {
      left = viewportWidth - popupRect.width - triggerRect.left - 10;
    }

    // Check left edge
    if (triggerRect.left + left - leftStart < 10) {
      left = leftStart + 10 - triggerRect.left;
    }

    // Check if popup would appear above viewport
    if (triggerRect.top + top < 30) {
      // Position below the trigger instead of above
      top = triggerRect.height + 5;
    }
    [popupTop, popupLeft] = [top, left];
  }

  function onMouseLeave() {
    if (enterable) {
      closeTimeout = setTimeout(() => {
        isHovered = false;
      }, 200);
    } else {
      isHovered = false;
    }
  }
  function clearCloseTimeoutIfEnterable() {
    if (enterable) {
      clearTimeout(closeTimeout);
    }
  }
  function onMouseEnter() {
    clearCloseTimeoutIfEnterable();
    isHovered = true;
  }
</script>

<div
  class="map-popup"
  bind:this={popupElement}
  style={popupStyle}
  onmouseenter={() => {
    if (enterable) {
      clearTimeout(closeTimeout);
    } else {
      isHovered = false;
      visibility = "hidden";
    }
  }}
  onmouseleave={onMouseLeave}
  tabindex="-1"
  role="tooltip"
>
  {@render popupContent(isOpen)}
</div>

<span
  bind:this={triggerElement}
  role="button"
  tabindex="0"
  onmouseenter={onMouseEnter}
  onmouseleave={onMouseLeave}
  onfocus={onMouseEnter}
  onblur={onMouseLeave}
>
  {@render children()}
</span>

<style>
  .map-popup {
    position: absolute;
    width: 350px;
    max-height: 260px;
    overflow: visible;
    padding: 0;

    background: #fff;
    border: 1px solid #a2a9b1;
    border-radius: 2px;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.15);
    transition: opacity 0.2s ease-out;
    z-index: 8000 !important;
    font-size: 14px;
  }
</style>
