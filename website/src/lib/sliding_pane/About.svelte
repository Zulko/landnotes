<script>
  const { closePane } = $props();
  const menuIconPath = `${import.meta.env.BASE_URL}icons/menu.svg`;
</script>

<div class="about-page">
  <h1>Welcome to Landnotes</h1>

  <p>
    Landnotes shows Wikipedia places and events on a map (see the menu
    <img src={menuIconPath} alt="menu" class="menu-icon" />
    for options).
  </p>

  <p>
    There are currently 6.5 million events extracted from 400,000 articles using
    Google Gemini. If anything doesn't make sense, blame it on the AI! There
    might be 10 times more events to extract by scanning all of Wikipedia -
    learn more on the project's <a
      href="https://github.com/Zulko/landnotes"
      target="_blank"
      rel="noreferrer">GitHub page</a
    >.
  </p>

  <button class="close-button" onclick={closePane}> Start Exploring </button>
</div>

<style>
  .about-page {
    padding: 16px;
    overflow-y: auto;
    color: var(--ln-color-text);
    font-family: sans-serif;
  }

  h1 {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 1.4em;
    font-weight: normal;
    border-bottom: 1px solid var(--ln-color-border-strong);
    padding-bottom: 0.2em;
    text-align: center;
  }

  p {
    margin-bottom: 16px;
    line-height: 1.5;
    color: var(--ln-color-text);
  }

  a {
    color: var(--ln-color-primary);
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
    min-height: var(--ln-space-touch);
    background-color: var(--ln-color-primary);
    color: var(--ln-color-surface);
    border: none;
    border-radius: var(--ln-radius-lg);
    cursor: pointer;
    font-size: 1em;
    transition: background-color var(--ln-transition-base);
  }

  .close-button:hover {
    background-color: var(--ln-color-primary-hover);
  }

  .close-button:active {
    background-color: var(--ln-color-primary-active);
  }
</style>
