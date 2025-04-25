<script>
  // Reactive state
  let { pageTitle, snippet } = $props(); // Title to look up
  let summary = $state(""); // Fetched extract
  let thumbnail = $state(""); // Fetched thumbnail URL
  let isOpen = $state(false); // Popup visibility
  let tooltipElement = $state(null); // Reference to tooltip element
  let triggerElement = $state(null); // Reference to trigger span
  let toolTipTop = $state(0);
  let toolTipLeft = $state(0);
  let tooltipStyle = $state(""); // Dynamic style for positioning
  let imageHeight = $state(140);
  let imageWidth = $state(120);
  let imageHasWhiteBackground = $state(false);

  // Fetch summary from Wikipedia REST API
  async function fetchWikiInfos() {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle.replaceAll(" ", "_"))}`; // Summary endpoint :contentReference[oaicite:4]{index=4}
    const res = await fetch(url, {
      headers: { "User-Agent": "landnotes/1.0 (youremail@example.com)" },
    });
    if (res.ok) {
      const data = await res.json();
      // Get HTML extract and limit to 300 characters if needed
      // Find the last period before 300 characters to cut at the end of a sentence
      if (data.extract_html?.length > 350) {
        // Find the last period that's not followed by a digit (to avoid cutting at "2.5" etc.)
        let cutoff = -1;
        const text = data.extract_html.substring(0, 350);
        for (let i = text.length - 1; i >= 0; i--) {
          if (
            text[i] === "." &&
            (i === text.length - 1 || !/\d/.test(text[i + 1]))
          ) {
            cutoff = i;
            break;
          }
        }
        summary =
          cutoff > 0
            ? data.extract_html.substring(0, cutoff + 1)
            : data.extract_html.substring(0, 347) + "...";
      } else {
        summary = data.extract_html;
      }

      thumbnail = data.thumbnail?.source || "";

      // Calculate dimensions that maintain aspect ratio within our constraints
      if (data.thumbnail) {
        const maxWidth = 120;
        const maxHeight = 140;
        const origWidth = data.thumbnail.width;
        const origHeight = data.thumbnail.height;

        // Calculate scaling factor based on both constraints
        const widthRatio = maxWidth / origWidth;
        const heightRatio = maxHeight / origHeight;
        const ratio = Math.min(widthRatio, heightRatio);

        // Set dimensions scaled proportionally
        imageWidth = Math.floor(origWidth * ratio);
        imageHeight = Math.floor(origHeight * ratio);
      }
    } else {
      summary = "No information available.";
      thumbnail = "";
    }
    checkImageCornersForWhiteBackground(thumbnail);
  }

  // Position the tooltip based on available screen space
  function updateTooltipPosition() {
    if (!tooltipElement || !triggerElement) return;

    const triggerRect = triggerElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Default position (above and centered)
    let top = -tooltipRect.height - 2;
    let left = -(tooltipRect.width / 2) + triggerRect.width / 2;

    // Check right edge
    if (triggerRect.left + left + tooltipRect.width > viewportWidth) {
      left = viewportWidth - tooltipRect.width - triggerRect.left - 10;
    }

    // Check left edge
    if (triggerRect.left + left < 10) {
      left = 10 - triggerRect.left;
    }

    // Check if tooltip would appear above viewport
    if (triggerRect.top + top < 10) {
      // Position below the trigger instead of above
      top = triggerRect.height + 5;
    }
    [toolTipTop, toolTipLeft] = [top, left];
  }

  $effect(() => {
    tooltipStyle = `transform: translate(${toolTipLeft}px, ${toolTipTop}px); ${
      isOpen ? "visibility: visible;" : "visibility: hidden;"
    }`;
  });

  // Handlers
  async function handleMouseEnter(event) {
    if (!summary.length) {
      await fetchWikiInfos();
    }
    isOpen = true;

    // Update position after render
    setTimeout(updateTooltipPosition, 0);
  }

  function handleMouseLeave() {
    isOpen = false;
  }

  // Update position when window is resized
  function handleResize() {
    if (isOpen) {
      updateTooltipPosition();
    }
  }

  // Lifecycle
  $effect(() => {
    if (isOpen) {
      window.addEventListener("resize", handleResize);
      updateTooltipPosition();
    } else {
      window.removeEventListener("resize", handleResize);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });

  function isWhitePixel(r, g, b, a, tolerance = 20) {
    return (
      a <= tolerance ||
      (r >= 255 - tolerance && g >= 255 - tolerance && b >= 255 - tolerance)
    );
  }

  function checkImageCornersForWhiteBackground(imgSrc) {
    // the best vanity feature!
    const img = new Image();
    img.crossOrigin = "anonymous"; // Enable CORS if needed
    img.src = imgSrc;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);

      const positions = [
        [0, 0], // top-left
        [img.width - 1, 0], // top-right
        [0, img.height - 1], // bottom-left
        [img.width - 1, img.height - 1], // bottom-right
      ];

      let whiteCorners = 0;
      positions.forEach(([x, y]) => {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        if (isWhitePixel(pixel[0], pixel[1], pixel[2], pixel[3])) {
          whiteCorners++;
        }
      });

      imageHasWhiteBackground = whiteCorners >= 3; // Adjust threshold as needed
    };
  }
</script>

<div
  class="wiki-popup"
  bind:this={tooltipElement}
  style={tooltipStyle}
  tabindex="-1"
  role="tooltip"
>
  <div class="wiki-content">
    {#if thumbnail}
      <img
        src={thumbnail}
        alt="{pageTitle} thumbnail"
        class="thumb {imageHasWhiteBackground ? '' : 'with-shadow'}"
        fetchpriority="high"
        style={`height: ${imageHeight}px; width: ${imageWidth}px;`}
      />
    {/if}
    <div class="wiki-header">
      <h3>From Wikipedia</h3>
    </div>
    <div class="wiki-summary">{@html summary}</div>
  </div>
</div>

<span
  bind:this={triggerElement}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onfocus={handleMouseEnter}
  onblur={handleMouseLeave}
  tabindex="-1"
  role="button"
>
  {@render snippet(pageTitle)}
</span>

<style>
  .wiki-popup {
    position: absolute;
    width: 350px;
    max-height: 250px;
    overflow-y: hidden;
    padding: 0;

    background: #fff;
    border: 1px solid #a2a9b1;
    border-radius: 2px;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.15);
    transition: opacity 0.2s ease-out;
    z-index: 8000 !important;
    font-size: 14px;
  }

  /* Hide scrollbar for Chrome, Safari and Opera */
  /* .wiki-popup::-webkit-scrollbar {
    display: none;
  } */

  .wiki-content {
    padding: 12px 12px;
  }

  .wiki-content p {
    margin: 0;
  }

  .wiki-header h3 {
    font-family: "Linux Libertine", "Georgia", "Times", serif;
    font-size: 1.2rem;
    font-weight: normal;
    margin: 0 0 8px 0;
    color: #222;
    border-bottom: none;
  }

  .thumb {
    margin-bottom: 0.2rem;
    float: right;
    margin-left: 1rem;
    border-radius: 2px;

    &.with-shadow {
      box-shadow:
        0 2px 4px rgba(0, 0, 0, 0.15),
        0 0 2px rgba(0, 0, 0, 0.1);
    }
  }

  .wiki-summary {
    font-weight: normal;
  }
</style>
