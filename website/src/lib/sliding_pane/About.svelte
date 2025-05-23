<script>
  import { appState } from "../appState.svelte";
  const { closePane } = $props();
</script>

<div class="about-page">
  <h1>Welcome to Landnotes</h1>

  <p>
    Landnotes shows wikipedia places and events on a map (use the menu
    <img src="/icons/menu.svg" alt="menu" class="menu-icon" />
    to switch between the two).
  </p>

  <p>
    It is a work in progress with 6.5 million events extracted from 400,000
    articles using Google Gemini. If anything doesn't make sense, blame it on
    the AI! There are 10 times more articles to process but this might take
    $3000 dollars.
  </p>

  <p>
    Learn more on the <a
      href="https://github.com/Zulko/landnotes"
      target="_blank">Github page</a
    >.
  </p>

  <button class="close-button" onclick={closePane}> Start Exploring </button>
</div>

<style>
  .about-page {
    padding: 16px;
    overflow-y: auto;
    color: #222;
    font-family: sans-serif;
  }

  h1 {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 1.8em;
    font-weight: normal;
    border-bottom: 1px solid #a2a9b1;
    padding-bottom: 0.2em;
    text-align: center;
  }

  p {
    margin-bottom: 16px;
    line-height: 1.5;
    color: #222;
  }

  a {
    color: #0645ad;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  .menu-icon {
    display: inline;
    width: 16px;
    height: 16px;
    vertical-align: middle;
    margin: 0 2px;
  }

  .close-button {
    display: block;
    margin: 20px auto;
    padding: 8px 16px;
    background-color: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
    transition: background-color 0.2s;
  }

  .close-button:hover {
    background-color: #0b57d0;
  }

  .close-button:active {
    background-color: #054a9e;
  }
</style>
