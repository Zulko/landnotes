<script>
  // Reactive state
  import { isTouchDevice } from "../device";
  import { onMount } from "svelte";

  let {
    popupContent,
    children,
    alwaysOpen = false,
    enterable = false,
  } = $props(); // Title to look up
  let popupElement = $state(null); // Reference to popup element
  let triggerElement = $state(null); // Reference to trigger span
  let popupTop = $state(0);
  let popupLeft = $state(0);
  let isHovered = $state(false);
  let isOpen = $derived(alwaysOpen || (!isTouchDevice && isHovered));
  let closeTimeout = $state(null);
  let visibility = $derived(isOpen ? "visible" : "hidden");
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

  $effect(() => {
    if (isOpen) {
      onOpen();
    }
  });

  // Lifecycle
  $effect(() => {
    if (isOpen) {
      updateTooltipPosition();
    } else {
      console.log("boom", { isOpen, popupStyle });
    }
  });

  async function onOpen() {
    // updateTooltipPosition();
    // setTimeout(updateTooltipPosition, 0);
  }

  // Position the popup based on available screen space
  function updateTooltipPosition() {
    console.log("updating tooltip position");
    if (!popupElement || !triggerElement) return;

    const triggerRect = triggerElement.getBoundingClientRect();
    const popupRect = popupElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const mapWidth =
      document.getElementsByClassName("map-container")[0].clientWidth;
    const leftStart = isTouchDevice ? 0 : viewportWidth - mapWidth;
    console.log(viewportWidth, mapWidth, leftStart);

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
      console.log("beeeeeelow");
      top = triggerRect.height + 5;
    }
    [popupTop, popupLeft] = [top, left];
  }

  function onMouseLeave() {
    if (enterable) {
      console.log("will close!");
      closeTimeout = setTimeout(() => {
        console.log("closing!");
        isHovered = false;
      }, 200);
    } else {
      console.log("Closing!");
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
  onmouseenter={clearCloseTimeoutIfEnterable}
  onmouseleave={onMouseLeave}
  tabindex="-1"
  role="tooltip"
>
  {@render popupContent()}
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
