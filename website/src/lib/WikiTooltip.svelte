<script>
  // Reactive state
  let { pageTitle, snippet } = $props(); // Title to look up
  let summary = $state(""); // Fetched extract
  let thumbnail = $state(""); // Fetched thumbnail URL
  let isOpen = $state(false); // Popup visibility

  $inspect(isOpen);

  // Fetch summary from Wikipedia REST API
  async function fetchWikiInfos() {
    console.log("fetchWikiInfos", pageTitle);
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle.replaceAll(" ", "_"))}`; // Summary endpoint :contentReference[oaicite:4]{index=4}
    const res = await fetch(url, {
      headers: { "User-Agent": "landnotes/1.0 (youremail@example.com)" },
    });
    if (res.ok) {
      const data = await res.json();
      console.log("data", data);
      summary = data.extract_html; // Plain-text extract :contentReference[oaicite:5]{index=5}
      thumbnail = data.thumbnail?.source || "";
    } else {
      summary = "No information available.";
      thumbnail = "";
    }
  }

  // Handlers
  function handleMouseEnter(event) {
    console.log("handleMouseEnter", pageTitle);
    if (!summary.length) {
      fetchWikiInfos();
    }
    isOpen = true;
  }

  function handleMouseLeave() {
    isOpen = false;
  }
</script>

{#if isOpen}
  <div
    class="wiki-popup"
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    tabindex="-1"
    role="tooltip"
  >
    <div class="wiki-content">
      {#if thumbnail}
        <img src={thumbnail} alt="{pageTitle} thumbnail" class="thumb" />
      {/if}
      <div class="wiki-header">
        <h3>From Wikipedia</h3>
      </div>
      {@html summary}
    </div>
  </div>
{/if}

<span
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onfocus={handleMouseEnter}
  onblur={handleMouseLeave}
  tabindex="-1"
  role="button"
>
  {@render snippet()}
</span>

<style>
  .wiki-popup {
    position: absolute;
    width: 350px;
    max-height: 300px;
    overflow-y: auto;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
    padding: 0;
    transform: translateY(-100%) translateX(-110px);
    top: 10px;

    background: #fff;
    border: 1px solid #a2a9b1;
    border-radius: 2px;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.15);
    transition: opacity 0.2s ease-out;
    z-index: 299 !important;
  }

  /* Hide scrollbar for Chrome, Safari and Opera */
  .wiki-popup::-webkit-scrollbar {
    display: none;
  }

  .wiki-content {
    padding: 12px 16px;
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
    max-width: 120px;
    max-height: 140px;
    height: auto;
    margin-bottom: 0.5rem;
    float: right;
    margin-left: 1rem;
    margin-bottom: 0.5rem;
    border-radius: 2px;
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.15),
      0 0 2px rgba(0, 0, 0, 0.1);
  }
</style>
