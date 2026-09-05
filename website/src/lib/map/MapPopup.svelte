<script>
  // Reactive state
  import { uiGlobals } from "../appState.svelte";
  import { onMount, tick } from "svelte";
  import { portal } from "svelte-portal";

  const generatedPopupId = $props.id();

  // Add portal target check
  /** @type {HTMLElement | null} */
  let portalTarget = $state(null);

  let {
    popupId = generatedPopupId,
    popupLabel = "Map popup",
    popupLabelledby = undefined,
    triggerLabel = undefined,
    triggerTitle = undefined,
    triggerRole = "button",
    triggerTag = "span",
    triggerClass = undefined,
    onTriggerActivate = undefined,
    popupContent,
    children,
    alwaysOpen = false,
    enterable = false,
    visibilityDelay = 0,
    keepWithinMap = false,
    fluid = false,
  } = $props(); // Title to look up
  /** @type {HTMLElement | null} */
  let popupElement = $state(null); // Reference to popup element
  /** @type {HTMLElement | null} */
  let triggerElement = $state(null); // Reference to trigger element
  let popupTop = $state(0);
  let popupLeft = $state(0);
  let isHovered = $state(false);
  let isOpen = $derived(alwaysOpen || (!uiGlobals.isTouchDevice && isHovered));
  let popupAriaLabel = $derived(popupLabelledby ? undefined : popupLabel);
  let isNativeButtonTrigger = $derived(triggerTag === "button");
  let effectiveTriggerRole = $derived(
    isNativeButtonTrigger ? undefined : triggerRole
  );
  let triggerHasPopupSemantics = $derived(
    isNativeButtonTrigger || Boolean(effectiveTriggerRole)
  );
  /** @type {number | undefined} */
  let closeTimeout = $state(undefined);
  /** @type {number | undefined} */
  let visibilityTimeout = $state(undefined); // Track visibility timeout
  /** @type {number | undefined} */
  let unmountTimeout = $state(undefined);
  let visibility = $state("hidden");
  let zIndex = $state(8000);
  let revealOx = $state("50%");
  let revealOy = $state("100%");
  let popupStyle = $derived(
    `transform: translate(${popupLeft}px, ${popupTop}px); visibility: ${visibility}; z-index: ${zIndex}; --reveal-ox: ${revealOx}; --reveal-oy: ${revealOy};`
  );
  /** @type {ResizeObserver | null} */
  let resizeObserver = $state(null);
  let contentMounted = $state(false);
  /** @type {"idle" | "in" | "out"} */
  let revealPhase = $state(/** @type {"idle" | "in" | "out"} */ ("idle"));
  const showPopupContent = $derived(fluid ? contentMounted : isOpen);
  const fluidInteractive = $derived(
    fluid && enterable && revealPhase === "in"
  );
  const triggerClassName = $derived(
    [triggerClass, isHovered && "is-hovered"].filter(Boolean).join(" ")
  );

  onMount(() => {
    // Check if portal target exists
    portalTarget = document.getElementById("main");
    if (!portalTarget) {
      console.error("MapPopup: Portal target #main not found");
    }

    if (popupElement) {
      // Find parent popup if it exists
      let parent = triggerElement?.closest(".map-popup");
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
      clearTimeout(unmountTimeout);
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

      if (popupElement) {
        popupElement.style.removeProperty("visibility");
      }

      if (fluid) {
        clearTimeout(unmountTimeout);
        contentMounted = true;
        revealPhase = "idle";
      }

      // Wait for the popup snippet to render before measuring, otherwise the
      // popup is sized to its empty wrapper and ends up overlapping the trigger.
      tick().then(() => {
        if (!isOpen) return;
        if (popupElement && triggerElement) {
          updateTooltipPosition();
        } else {
          requestAnimationFrame(() => {
            if (isOpen && popupElement && triggerElement) {
              updateTooltipPosition();
            }
          });
        }

        clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(() => {
          if (!isOpen) return;
          visibility = "visible";
          if (fluid) {
            revealPhase = "in";
          }
        }, visibilityDelay);
      });
    } else if (!isOpen && wasOpen) {
      clearTimeout(visibilityTimeout);
      if (fluid) {
        revealPhase = "idle";
        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;
        clearTimeout(unmountTimeout);
        unmountTimeout = setTimeout(
          () => {
            if (!isOpen) {
              contentMounted = false;
              revealPhase = "idle";
              visibility = "hidden";
              if (popupElement) {
                popupElement.style.visibility = "hidden";
              }
            }
          },
          reducedMotion ? 120 : 180
        );
      } else {
        visibility = "hidden";
        if (popupElement) {
          popupElement.style.visibility = "hidden";
        }
      }
    }
    wasOpen = isOpen;
  });

  /**
   * Grow/shrink from the marker circle, not the card center — including when
   * the popup is shifted to stay on-screen.
   * @param {number} left
   * @param {number} top
   * @param {number} popupWidth
   * @param {number} popupHeight
   */
  function updateRevealOrigin(left, top, popupWidth, popupHeight) {
    if (!triggerElement) return;
    // Freeze origin during expand/collapse so resize does not snap the scale.
    if (revealPhase === "in" || !isOpen) return;

    const circle = triggerElement.querySelector(".marker-icon-circle");
    const anchorRect =
      circle instanceof HTMLElement
        ? circle.getBoundingClientRect()
        : triggerElement.getBoundingClientRect();
    const anchorX = anchorRect.left + anchorRect.width / 2 + window.scrollX;
    const anchorY = anchorRect.top + anchorRect.height / 2 + window.scrollY;
    const originX = Math.min(Math.max(anchorX - left, 0), popupWidth);
    const originY = Math.min(Math.max(anchorY - top, 0), popupHeight);
    revealOx = `${originX}px`;
    revealOy = `${originY}px`;
  }

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
      const popupWidth = popupElement.offsetWidth;
      const popupHeight = popupElement.offsetHeight;

      // Validate rect values
      if (popupWidth === 0 || popupHeight === 0) {
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
      let top = absoluteTop - popupHeight - 2;
      let left = absoluteLeft - popupWidth / 2 + triggerRect.width / 2;

      // Check right edge
      if (left + popupWidth > viewportWidth - 10) {
        left = viewportWidth - popupWidth - 10;
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
      if (spaceAbove < popupHeight + 10) {
        // Not enough space above, try below
        if (spaceBelow >= popupHeight + 10) {
          // Enough space below
          top = absoluteTop + triggerRect.height + 5;
        } else {
          // Not enough space above or below, use the side with more space
          if (spaceAbove > spaceBelow) {
            top = Math.max(
              window.scrollY + 10,
              absoluteTop - popupHeight - 2
            );
          } else {
            top = Math.min(
              absoluteTop + triggerRect.height + 5,
              window.scrollY + viewportHeight - popupHeight - 10
            );
          }
        }
      }

      // Set absolute position
      popupTop = top;
      popupLeft = left;
      updateRevealOrigin(left, top, popupWidth, popupHeight);
    } catch (error) {
      console.error("MapPopup: Error updating position", error);
    }
  }

  // Helper function to find the nearest scrollable parent
  /** @param {HTMLElement | null} element */
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

  function pointerStillOnPopupOrTrigger() {
    return Boolean(
      triggerElement?.matches(":hover") ||
        (enterable && popupElement?.matches(":hover"))
    );
  }

  function onMouseLeave() {
    // Leaflet pane moves and the growing card can fire a fake leave.
    // Wait a frame and only close if the pointer is actually gone.
    requestAnimationFrame(() => {
      if (pointerStillOnPopupOrTrigger()) {
        clearTimeout(closeTimeout);
        isHovered = true;
        return;
      }
      if (enterable) {
        clearTimeout(closeTimeout);
        closeTimeout = setTimeout(() => {
          if (pointerStillOnPopupOrTrigger()) {
            isHovered = true;
            return;
          }
          closeHoverPopup();
        }, 200);
      } else {
        closeHoverPopup();
      }
    });
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

  function closeHoverPopup({ focusTrigger = false } = {}) {
    isHovered = false;
    clearTimeout(closeTimeout);
    clearTimeout(visibilityTimeout);
    if (!fluid) {
      visibility = "hidden";
      if (popupElement) {
        popupElement.style.visibility = "hidden";
      }
    }
    if (focusTrigger && triggerElement) {
      triggerElement.focus();
    }
  }

  /** @param {KeyboardEvent} event */
  function handleEscape(event) {
    if (event.key !== "Escape" || !isOpen || alwaysOpen) {
      return;
    }

    const activeElement = document.activeElement;
    const focusInPopup = popupElement?.contains(activeElement);
    const focusInTrigger = triggerElement?.contains(activeElement);

    if (focusInPopup || focusInTrigger || isHovered) {
      event.stopPropagation();
      closeHoverPopup({ focusTrigger: focusInPopup });
    }
  }

  /** @param {MouseEvent} event */
  function handleTriggerClick(event) {
    onTriggerActivate?.(event);
  }

  /** @param {KeyboardEvent} event */
  function handleTriggerKeydown(event) {
    if (event.key === "Escape") {
      handleEscape(event);
      return;
    }

    if (isNativeButtonTrigger) {
      return;
    }

    if (
      (event.key === "Enter" || event.key === " ") &&
      typeof onTriggerActivate === "function"
    ) {
      event.preventDefault();
      onTriggerActivate(event);
    }
  }
</script>

<svelte:window onkeydown={handleEscape} />

{#snippet popupPanel()}
  {#if showPopupContent}
    <div
      class={[
        "map-popup-body",
        {
          fluid,
          "reveal-in": fluid && revealPhase === "in",
        },
      ]}
    >
      <div class="map-popup-content">
        {@render popupContent(true)}
      </div>
    </div>
  {/if}
{/snippet}

{#if portalTarget}
  <div
    id={popupId}
    class={["map-popup", fluid && "fluid-popup", fluidInteractive && "fluid-interactive"]}
    use:portal={"#main"}
    bind:this={popupElement}
    style={popupStyle}
    onmouseenter={() => {
      if (enterable) {
        clearTimeout(closeTimeout);
      }
    }}
    onmouseleave={onMouseLeave}
    onfocusin={clearCloseTimeoutIfEnterable}
    onfocusout={onMouseLeave}
    tabindex="-1"
    role="dialog"
    aria-modal="false"
    aria-label={popupAriaLabel}
    aria-labelledby={popupLabelledby}
    aria-hidden={!showPopupContent}
  >
    {@render popupPanel()}
  </div>
{:else}
  <div
    id={popupId}
    class={["map-popup", fluid && "fluid-popup", fluidInteractive && "fluid-interactive"]}
    bind:this={popupElement}
    style={popupStyle}
    onmouseenter={() => {
      if (enterable) {
        clearTimeout(closeTimeout);
      }
    }}
    onmouseleave={onMouseLeave}
    onfocusin={clearCloseTimeoutIfEnterable}
    onfocusout={onMouseLeave}
    tabindex="-1"
    role="dialog"
    aria-modal="false"
    aria-label={popupAriaLabel}
    aria-labelledby={popupLabelledby}
    aria-hidden={!showPopupContent}
  >
    {@render popupPanel()}
  </div>
{/if}

{#if isNativeButtonTrigger}
  <button
    bind:this={triggerElement}
    class={triggerClassName}
    type="button"
    aria-haspopup="dialog"
    aria-expanded={isOpen}
    aria-controls={popupId}
    aria-describedby={isOpen ? popupId : undefined}
    aria-label={triggerLabel}
    title={triggerTitle}
    onmouseenter={onMouseEnter}
    onmouseleave={onMouseLeave}
    onfocusin={onMouseEnter}
    onfocusout={onMouseLeave}
    onclick={handleTriggerClick}
    onkeydown={handleTriggerKeydown}
  >
    {@render children()}
  </button>
{:else}
  <svelte:element
    this={triggerTag}
    bind:this={triggerElement}
    class={triggerClassName}
    role={effectiveTriggerRole}
    tabindex={effectiveTriggerRole ? 0 : undefined}
    aria-haspopup={triggerHasPopupSemantics ? "dialog" : undefined}
    aria-expanded={triggerHasPopupSemantics ? isOpen : undefined}
    aria-controls={triggerHasPopupSemantics ? popupId : undefined}
    aria-describedby={triggerHasPopupSemantics && isOpen ? popupId : undefined}
    aria-label={triggerLabel}
    title={triggerTitle}
    onmouseenter={onMouseEnter}
    onmouseleave={onMouseLeave}
    onfocusin={onMouseEnter}
    onfocusout={onMouseLeave}
    onclick={handleTriggerClick}
    onkeydown={handleTriggerKeydown}
  >
    {@render children()}
  </svelte:element>
{/if}

<style>
  :global(.map-popup) {
    position: fixed;
    width: 350px;
    max-height: 312px;
    overflow: visible;
    padding: 0;
    font-size: 14px;
  }

  :global(.map-popup.fluid-popup) {
    pointer-events: none;
  }

  :global(.map-popup.fluid-popup.fluid-interactive) {
    pointer-events: auto;
  }

  .map-popup-body {
    width: 100%;
    max-height: 312px;
    overflow: hidden;
    background: var(--ln-color-surface);
    border: 1px solid var(--ln-color-border);
    border-radius: var(--ln-radius-lg);
    box-shadow: var(--ln-shadow-popup);
  }

  .map-popup-body.fluid {
    transform: scale(0.02);
    transform-origin: var(--reveal-ox, 50%) var(--reveal-oy, 100%);
    border-radius: 50%;
    clip-path: circle(2% at var(--reveal-ox, 50%) var(--reveal-oy, 100%));
    box-shadow: none;
    transition:
      transform 0.15s cubic-bezier(0.7, 0, 0.84, 0),
      clip-path 0.15s cubic-bezier(0.7, 0, 0.84, 0),
      border-radius 0.15s cubic-bezier(0.7, 0, 0.84, 0),
      box-shadow 0.15s cubic-bezier(0.7, 0, 0.84, 0);
  }

  .map-popup-body.fluid .map-popup-content {
    opacity: 0;
    transition: opacity 0.08s ease-in;
  }

  .map-popup-body.fluid.reveal-in {
    transform: scale(1);
    border-radius: var(--ln-radius-lg);
    clip-path: circle(280% at var(--reveal-ox, 50%) var(--reveal-oy, 100%));
    box-shadow: var(--ln-shadow-popup);
    transition-duration: 0.35s;
    transition-timing-function: cubic-bezier(0.42, 0, 0.58, 0.8);
  }

  .map-popup-body.fluid.reveal-in .map-popup-content {
    opacity: 1;
    transition: opacity 0.14s ease-out 0.16s;
  }

  @media (prefers-reduced-motion: reduce) {
    .map-popup-body.fluid {
      transform: none;
      clip-path: none;
      border-radius: var(--ln-radius-lg);
      box-shadow: var(--ln-shadow-popup);
      opacity: 0;
      transition: opacity 0.12s ease;
    }

    .map-popup-body.fluid.reveal-in {
      opacity: 1;
    }

    .map-popup-body.fluid .map-popup-content,
    .map-popup-body.fluid.reveal-in .map-popup-content {
      opacity: 1;
      transition: none;
    }
  }
</style>
