<script>
  // Reactive state
  let { pageTitle, snippet } = $props(); // Title to look up
  let summary = $state(""); // Fetched extract
  let thumbnail = $state(""); // Fetched thumbnail URL
  let isOpen = $state(false); // Popup visibility
  let coords = $state({ x: 0, y: 0 }); // Popup position

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
    coords = { x: event.pageX + 10, y: event.pageY + 10 };
    isOpen = true;
  }

  function handleMouseLeave() {
    isOpen = false;
  }
</script>

{#if isOpen}
  <div class="wiki-popup">
    <!-- style="top: -200px; left: -175px;"-->
    {#if thumbnail}
      <img src={thumbnail} alt="{pageTitle} thumbnail" class="thumb" />
    {/if}
    <b> From Wikipedia: </b>
    {@html summary}
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
    max-height: 200px;
    overflow: scroll;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
    padding: 0.5rem;
    transform: translateY(-100%) translateX(-50%);

    background: white;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: opacity 0.2s ease-out;
    /* opacity: 0; */
    z-index: 2000;
  }

  .thumb {
    max-width: 50%;
    max-height: 100px;
    height: auto;
    margin-bottom: 0.5rem;
    float: left;
    margin-right: 0.5rem;
    border-radius: 0.25rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
</style>
