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
    keepWithinMap = false,
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

  // Position the popup based on available screen space
  function updateTooltipPosition() {
    if (!popupElement || !triggerElement) return;
    console.log("updateTooltipPosition");

    const triggerRect = triggerElement.getBoundingClientRect();
    const popupRect = popupElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Find scrollable parent and get its dimensions and scroll position
    const scrollableParent = findScrollableParent(triggerElement);
    const parentRect = scrollableParent.getBoundingClientRect();
    const scrollTop = scrollableParent.scrollTop;
    const scrollLeft = scrollableParent.scrollLeft;

    console.log("scrollTop", scrollTop);

    const mapWidth =
      document.getElementsByClassName("map-container")[0]?.clientWidth ||
      viewportWidth;
    const leftStart =
      isTouchDevice || !keepWithinMap ? 0 : viewportWidth - mapWidth;

    // Default position (above and centered)
    let top = -popupRect.height - 2;
    let left = -popupRect.width / 2 + triggerRect.width / 2;

    // Check right edge against parent bounds
    const rightEdge = parentRect.left + parentRect.width;
    if (triggerRect.left + left + popupRect.width > rightEdge) {
      left = rightEdge - popupRect.width - triggerRect.left - 10;
    }

    // Check left edge against parent bounds
    const leftEdge = parentRect.left;
    if (triggerRect.left + left < leftEdge + 10) {
      left = leftEdge + 10 - triggerRect.left;
    }

    // Available space calculations within the scrollable parent
    const spaceAbove = triggerRect.top - parentRect.top;
    const spaceBelow =
      parentRect.bottom - (triggerRect.top + triggerRect.height);

    // Check if enough space above
    if (spaceAbove < popupRect.height + 10) {
      // Not enough space above, try below
      if (spaceBelow >= popupRect.height + 10) {
        // Enough space below
        top = triggerRect.height + 5;
      } else {
        // Not enough space above or below, use the side with more space
        top =
          spaceAbove > spaceBelow
            ? Math.max(-popupRect.height - 2, -spaceAbove + 10)
            : Math.min(
                triggerRect.height + 5,
                triggerRect.height + spaceBelow - popupRect.height - 10
              );
      }
    }

    // Use the calculated position, adjusted for scrolling
    // This ensures the popup always stays with its target regardless of scroll position
    popupTop = top - scrollTop;
    popupLeft = left;
  }

  // Helper function to find the nearest scrollable parent
  function findScrollableParent(element) {
    if (!element) return document.documentElement;

    // Start with the closest parent
    let parent = element.parentElement;

    // Go up the DOM tree until we find a scrollable element
    while (parent && parent !== document.body) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      const isScrollable = overflowY === "auto" || overflowY === "scroll";

      if (isScrollable && parent.scrollHeight > parent.clientHeight) {
        return parent;
      }
      parent = parent.parentElement;
    }

    // Default to document if no scrollable parent found
    return document.documentElement;
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
