<script>
  // Reactive state
  import { uiGlobals } from "../appState.svelte";
  import { onMount } from "svelte";

  let {
    popupContent,
    children,
    alwaysOpen = false,
    enterable = false,
    visibilityDelay = 0,
    keepWithinMap = false,
  } = $props(); // Title to look up
  let popupElement = $state(null); // Reference to popup element
  let triggerElement = $state(null); // Reference to trigger span
  let popupTop = $state(0);
  let popupLeft = $state(0);
  let isHovered = $state(false);
  let isOpen = $derived(alwaysOpen || (!uiGlobals.isTouchDevice && isHovered));
  let closeTimeout = $state(null);
  let visibility = $state("hidden");
  let popupStyle = $derived(
    `left: ${popupLeft}px; top: ${popupTop}px; visibility: ${visibility};`
  );
  let resizeObserver = $state(null);

  onMount(() => {
    if (popupElement) {
      document.body.appendChild(popupElement); // Move to body

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
      if (popupElement && popupElement.parentNode === document.body) {
        document.body.removeChild(popupElement); // Clean up from body
      }
    };
  });

  // Lifecycle
  $effect(() => {
    if (isOpen) {
      updateTooltipPosition(); // Position before making visible
      setTimeout(() => {
        visibility = "visible";
      }, visibilityDelay);
    } else {
      visibility = "hidden";
    }
  });

  // Position the popup based on available screen space
  function updateTooltipPosition() {
    if (!popupElement || !triggerElement) return;

    const triggerRect = triggerElement.getBoundingClientRect();
    const popupRect = popupElement.getBoundingClientRect(); // This rect is valid as element is in body, styled with fixed pos
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Default position: centered above the trigger
    let newPopupLeft =
      triggerRect.left + triggerRect.width / 2 - popupRect.width / 2;
    let newPopupTop = triggerRect.top - popupRect.height - 5; // 5px offset from trigger's top

    // Determine horizontal boundaries
    let boundaryMinX = 10; // Default to viewport padding
    let boundaryMaxX = viewportWidth - 10; // Default to viewport padding (popup's right edge ends here)

    if (keepWithinMap && !uiGlobals.isTouchDevice) {
      const mapContainer = document.getElementsByClassName("map-container")[0];
      const mapRect = mapContainer
        ? mapContainer.getBoundingClientRect()
        : null;
      if (mapRect) {
        boundaryMinX = mapRect.left + 10;
        boundaryMaxX = mapRect.right - 10;
      }
      // If mapRect is not found, it defaults to viewport boundaries set above.
    }

    // Adjust horizontally
    if (newPopupLeft < boundaryMinX) {
      newPopupLeft = boundaryMinX;
    }
    // The popup's right edge is newPopupLeft + popupRect.width
    if (newPopupLeft + popupRect.width > boundaryMaxX) {
      newPopupLeft = boundaryMaxX - popupRect.width;
    }
    // Re-check if pushing from right violated left boundary (for narrow map/viewport)
    if (newPopupLeft < boundaryMinX) {
      newPopupLeft = boundaryMinX;
      // If popupRect.width is still too large, it will overflow boundaryMaxX. Prioritize left boundary.
    }

    // Vertical positioning:
    // Prefer above, then below, then best fit.
    const spaceAboveInViewport = triggerRect.top; // Space from viewport top to trigger top
    const spaceBelowInViewport = viewportHeight - triggerRect.bottom; // Space from trigger bottom to viewport bottom
    const requiredVerticalSpace = popupRect.height + 10; // popup height + 5px margin + 5px buffer

    if (spaceAboveInViewport >= requiredVerticalSpace) {
      // Enough space above
      newPopupTop = triggerRect.top - popupRect.height - 5; // 5px offset from trigger's top
    } else if (spaceBelowInViewport >= requiredVerticalSpace) {
      // Not enough above, but enough below
      newPopupTop = triggerRect.bottom + 5; // 5px offset from trigger's bottom
    } else {
      // Not enough space either above or below fully. Position in the larger space, or clamp.
      if (spaceAboveInViewport > spaceBelowInViewport) {
        // More space above, position as high as possible without going off top of viewport
        newPopupTop = Math.max(10, triggerRect.top - popupRect.height - 5); // 10px from viewport top
      } else {
        // More space below (or equal), position as low as possible without going off bottom of viewport
        newPopupTop = Math.min(
          triggerRect.bottom + 5,
          viewportHeight - popupRect.height - 10 // 10px from viewport bottom
        );
      }
    }

    // Final clamping to ensure popup is within viewport vertically
    if (newPopupTop < 10) {
      // 10px from viewport top
      newPopupTop = 10;
    }
    if (newPopupTop + popupRect.height > viewportHeight - 10) {
      // 10px from viewport bottom
      newPopupTop = viewportHeight - popupRect.height - 10;
    }

    popupLeft = newPopupLeft;
    popupTop = newPopupTop;
  }

  // Helper function to find the nearest scrollable parent - NO LONGER NEEDED
  // function findScrollableParent(element) { ... } // REMOVED

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
    position: fixed; /* Changed from absolute to fixed */
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
