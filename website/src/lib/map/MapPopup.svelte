<script>
  // Reactive state
  import { uiGlobals } from "../appState.svelte";
  import { onMount } from "svelte";
  import { portal } from "svelte-portal";

  // Add portal target check
  let portalTarget = $state(null);

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
  let visibilityTimeout = $state(null); // Track visibility timeout
  let visibility = $state("hidden");
  let zIndex = $state(8000);
  let popupStyle = $derived(
    `transform: translate(${popupLeft}px, ${popupTop}px); visibility: ${visibility}; z-index: ${zIndex};`
  );
  let resizeObserver = $state(null);

  onMount(() => {
    // Check if portal target exists
    portalTarget = document.getElementById("main");
    if (!portalTarget) {
      console.error("MapPopup: Portal target #main not found");
    }

    if (popupElement) {
      // Find parent popup if it exists
      let parent = triggerElement.closest(".map-popup");
      if (parent) {
        // Get parent's z-index and increment by 10
        const parentZIndex =
          parseInt(window.getComputedStyle(parent).zIndex) || 8000;
        zIndex = parentZIndex + 10;
      }

      resizeObserver = new ResizeObserver(() => {
        if (isOpen && popupElement) {
          updateTooltipPosition();
        }
      });

      if (popupElement) {
        resizeObserver.observe(popupElement);
      }
    }

    return () => {
      if (resizeObserver && popupElement) {
        resizeObserver.disconnect();
      }
      // Clear any pending timeouts on unmount
      clearTimeout(closeTimeout);
      clearTimeout(visibilityTimeout);
    };
  });

  // Lifecycle
  let wasOpen = false;
  $effect(() => {
    if (isOpen && !wasOpen) {
      // Re-check portal target when opening
      if (!portalTarget) {
        portalTarget = document.getElementById("main");
      }

      // Ensure we have valid element references before updating position
      if (!popupElement || !triggerElement) {
        // Wait for next tick to allow elements to be rendered
        requestAnimationFrame(() => {
          if (popupElement && triggerElement) {
            updateTooltipPosition();
          }
        });
      } else {
        updateTooltipPosition();
      }
      clearTimeout(visibilityTimeout);
      visibilityTimeout = setTimeout(() => {
        visibility = "visible";
      }, visibilityDelay);
    } else if (!isOpen && wasOpen) {
      clearTimeout(visibilityTimeout);
      visibility = "hidden";
      if (!enterable && popupElement) {
        popupElement.style.visibility = "hidden";
      }
    }
    wasOpen = isOpen;
  });

  // Position the popup based on available screen space
  function updateTooltipPosition() {
    // Add defensive checks for null elements
    if (!popupElement || !triggerElement) {
      // Try to re-acquire references if they're null
      if (!popupElement && isOpen) {
        console.warn("MapPopup: popupElement is null during positioning");
      }
      return;
    }

    // Additional check to ensure elements are still in the DOM
    if (!document.body.contains(triggerElement)) {
      console.warn("MapPopup: triggerElement is no longer in the DOM");
      return;
    }

    try {
      const triggerRect = triggerElement.getBoundingClientRect();
      const popupRect = popupElement.getBoundingClientRect();

      // Validate rect values
      if (popupRect.width === 0 || popupRect.height === 0) {
        // Element might not be rendered yet, try again on next frame
        requestAnimationFrame(() => updateTooltipPosition());
        return;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Get the absolute position of the trigger element
      const absoluteTop = triggerRect.top + window.scrollY;
      const absoluteLeft = triggerRect.left + window.scrollX;

      const mapContainer = document.getElementsByClassName("map-container")[0];
      const mapWidth = mapContainer?.clientWidth || viewportWidth;
      const leftStart =
        uiGlobals.isTouchDevice || !keepWithinMap
          ? 0
          : viewportWidth - mapWidth;

      // Default position (above and centered)
      let top = absoluteTop - popupRect.height - 2;
      let left = absoluteLeft - popupRect.width / 2 + triggerRect.width / 2;

      // Check right edge
      if (left + popupRect.width > viewportWidth - 10) {
        left = viewportWidth - popupRect.width - 10;
      }

      // Check left edge against map bounds
      const leftEdge = Math.max(0, leftStart);
      if (left < leftEdge + 10) {
        left = leftEdge + 10;
      }

      // Check vertical positioning
      const spaceAbove = triggerRect.top;
      const spaceBelow =
        viewportHeight - (triggerRect.top + triggerRect.height);

      // Adjust vertical position if needed
      if (spaceAbove < popupRect.height + 10) {
        // Not enough space above, try below
        if (spaceBelow >= popupRect.height + 10) {
          // Enough space below
          top = absoluteTop + triggerRect.height + 5;
        } else {
          // Not enough space above or below, use the side with more space
          top =
            spaceAbove > spaceBelow
              ? Math.max(
                  window.scrollY + 10,
                  absoluteTop - popupRect.height - 2
                )
              : Math.min(
                  absoluteTop + triggerRect.height + 5,
                  window.scrollY + viewportHeight - popupRect.height - 10
                );
        }
      }

      // Set absolute position
      popupTop = top;
      popupLeft = left;
    } catch (error) {
      console.error("MapPopup: Error updating position", error);
    }
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
      // For non-enterable popups, immediately close
      isHovered = false;
      // Clear any pending visibility timeout
      clearTimeout(visibilityTimeout);
      // Force immediate visibility hiding
      visibility = "hidden";
      if (popupElement) {
        popupElement.style.visibility = "hidden";
      }
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

{#if portalTarget}
  <div
    class="map-popup"
    use:portal={"#main"}
    bind:this={popupElement}
    style={popupStyle}
    onmouseenter={() => {
      if (enterable) {
        clearTimeout(closeTimeout);
      }
    }}
    onmouseleave={onMouseLeave}
    tabindex="-1"
    role="tooltip"
  >
    {@render popupContent(isOpen)}
  </div>
{:else}
  <div
    class="map-popup"
    bind:this={popupElement}
    style={popupStyle}
    onmouseenter={() => {
      if (enterable) {
        clearTimeout(closeTimeout);
      }
    }}
    onmouseleave={onMouseLeave}
    tabindex="-1"
    role="tooltip"
  >
    {@render popupContent(isOpen)}
  </div>
{/if}

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
  :global(.map-popup) {
    position: fixed;
    width: 350px;
    max-height: 260px;
    overflow: visible;
    padding: 0;

    background: #fff;
    border: 1px solid #a2a9b1;
    border-radius: 2px;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.15);
    transition: opacity 0.2s ease-out;
    font-size: 14px;
  }
</style>
