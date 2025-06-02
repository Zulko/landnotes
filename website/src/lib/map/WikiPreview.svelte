<script>
  // Reactive state
  import { uiGlobals, appState } from "../appState.svelte";
  let { pageTitle, openWikiPage = null, isOpen = false } = $props(); // Title to look up
  let summary = $state(""); // Fetched extract
  let thumbnail = $state(""); // Fetched thumbnail URL
  let imageHeight = $state(140);
  let imageWidth = $state(120);
  let imageHasWhiteBackground = $state(false);
  let infosFetched = $state(false);
  let fontSize = $state("1rem"); // New state for dynamic font size

  $effect(() => {
    if (isOpen && !infosFetched) {
      fetchWikiInfos();
    }
  });

  // New effect to update font size based on content
  $effect(() => {
    if (summary) {
      const baseSize = 0.9;
      const shouldReduce = summary.length > 250;
      fontSize = `${shouldReduce ? "12px" : "14px"}`; // 0.0625rem = 1px
    }
  });

  /**
   * Fetches summary and thumbnail information from Wikipedia API for the given page title.
   * Updates the component state with extracted summary and image properties.
   * @returns {Promise<void>}
   */
  async function fetchWikiInfos() {
    const wikiEndpoint = "https://en.wikipedia.org/api/rest_v1/page/summary/";
    const encodedTitle = encodeURIComponent(pageTitle.replaceAll(" ", "_"));

    let url;
    let requestOptions;

    if (uiGlobals.isSafariOrFirefox) {
      url = `${wikiEndpoint}${encodedTitle}?origin=*`;
      requestOptions = { headers: {} };
    } else {
      url = `${wikiEndpoint}${encodedTitle}`;
      requestOptions = {
        headers: { "User-Agent": "landnotes/1.0 (website@landnotes.org)" },
      };
    }

    const res = await fetch(url, requestOptions);
    if (res.ok) {
      const data = await res.json();
      summary = extractSummary(data.extract_html);

      thumbnail = data.thumbnail?.source || "";
      // Calculate dimensions that maintain aspect ratio within our constraints
      if (data.thumbnail) {
        ({ imageWidth, imageHeight } = calculateDimensions(data.thumbnail));
        imageHasWhiteBackground =
          await checkImageCornersForWhiteBackground(thumbnail);
      }
    } else {
      summary = "No information available.";
      thumbnail = "";
    }
    infosFetched = true;
  }

  /**
   * Calculates optimal dimensions for the thumbnail while maintaining aspect ratio.
   * @param {Object} thumbnail - The thumbnail object from Wikipedia API
   * @param {number} thumbnail.width - Original width of the thumbnail
   * @param {number} thumbnail.height - Original height of the thumbnail
   * @returns {Object} Object containing calculated imageWidth and imageHeight
   */
  function calculateDimensions(thumbnail) {
    const maxWidth = 120;
    const maxHeight = 140;
    const origWidth = thumbnail.width;
    const origHeight = thumbnail.height;

    // Calculate scaling factor based on both constraints
    const widthRatio = maxWidth / origWidth;
    const heightRatio = maxHeight / origHeight;
    const ratio = Math.min(widthRatio, heightRatio);

    // Set dimensions scaled proportionally
    return {
      imageWidth: Math.floor(origWidth * ratio),
      imageHeight: Math.floor(origHeight * ratio),
    };
  }

  /**
   * Extracts a readable summary from Wikipedia HTML content.
   * Truncates text to approximately 350 characters, ending at a sentence boundary.
   * @param {string} html - The HTML content from Wikipedia API
   * @returns {string} Truncated summary text
   */
  function extractSummary(html) {
    if (html.length < 350) {
      return html;
    }
    // Find the last period that's not followed by a digit (to avoid cutting at "2.5" etc.)
    let cutoff = -1;
    const text = html.substring(0, 350);
    for (let i = text.length - 1; i >= 0; i--) {
      if (
        text[i] === "." &&
        (i === text.length - 1 || !/\d/.test(text[i + 1]))
      ) {
        cutoff = i;
        break;
      }
    }
    return cutoff > 0
      ? html.substring(0, cutoff + 1)
      : html.substring(0, 347) + "...";
  }

  /**
   * Determines if a pixel is white or nearly white based on RGBA values.
   * @param {number} r - Red channel value (0-255)
   * @param {number} g - Green channel value (0-255)
   * @param {number} b - Blue channel value (0-255)
   * @param {number} a - Alpha channel value (0-255)
   * @param {number} [tolerance=20] - Tolerance threshold for considering a pixel as white
   * @returns {boolean} True if the pixel is considered white, false otherwise
   */
  function isWhitePixel(r, g, b, a, tolerance = 20) {
    return (
      a <= tolerance ||
      (r >= 255 - tolerance && g >= 255 - tolerance && b >= 255 - tolerance)
    );
  }

  /**
   * Checks if an image has white background by examining its corner pixels.
   * @param {string} imgSrc - The URL of the image to check
   * @returns {Promise<boolean>} Promise that resolves to true if the image has a white background
   */
  async function checkImageCornersForWhiteBackground(imgSrc) {
    if (!imgSrc) return false;

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // Enable CORS if needed

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

        resolve(whiteCorners >= 3); // Resolves the promise with the result
      };

      img.onerror = () => {
        resolve(false); // Handle load failures by resolving to false
      };

      img.src = imgSrc;
    });
  }
</script>

<div
  class="wiki-content"
  style="max-height: {uiGlobals.isTouchDevice
    ? '220px'
    : '260px'}; font-size: {fontSize};"
>
  {#if infosFetched}
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
      <h3 style="font-size: 1.1rem;">From Wikipedia</h3>
    </div>
    <div class="wiki-summary" style="font-size: {fontSize};">
      {@html summary}
    </div>
    {#if uiGlobals.isTouchDevice}
      <div style="margin-top: 2rem;"></div>
      <button
        tabindex="0"
        class="open-wiki-page"
        onclick={() => {
          openWikiPage && openWikiPage(pageTitle);
          appState.selectedMarkerId = null; // Deselect marker to close popup
        }}
        onkeydown={(e) => {
          if (e.key === "Enter") {
            openWikiPage && openWikiPage(pageTitle);
            appState.selectedMarkerId = null; // Deselect marker to close popup
          }
        }}
      >
        Tap for more
      </button>
    {/if}
  {:else}
    <div class="wiki-content">
      <div class="wiki-header">
        <div class="spinner"></div>
      </div>
    </div>
  {/if}
</div>

<style>
  .wiki-content {
    padding: 12px 12px;
    position: relative;
    overflow-y: hidden !important;
  }

  .wiki-content::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 20px;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0),
      rgba(255, 255, 255, 1)
    );
    pointer-events: none;
  }

  .wiki-header h3 {
    font-family: "Linux Libertine", "Georgia", "Times", serif;
    font-size: 1.2rem;
    font-weight: normal;
    margin: 0 0 -0.5em;
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
    max-height: 160px !important;
  }

  :global(.wiki-summary p) {
    margin-bottom: 0em;
  }

  .open-wiki-page {
    cursor: pointer;
    display: block;
    padding: 0.5em 1em;
    background-color: white;
    color: #0645ad;
    text-decoration: none;
    font-weight: 600;
    border: 1px solid #0645ad;
    border-radius: 4px;
    margin: 0.2em auto 0.2em;
    transition:
      background-color 0.2s,
      transform 0.1s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    position: absolute;
    bottom: 5px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    width: max-content;
  }

  .spinner {
    width: 24px;
    height: 24px;
    margin: 20px auto;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #0645ad;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
