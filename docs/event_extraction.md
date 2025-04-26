## LLM tricks

Works much better when the page is formatted to plain english.

## Choice of LLM

Google Gemini Flash 2.0 was chosen because:

- It can answer in JSON (`{who: [], where: "", when: "", what: ""}`)
- It has a long context window (1 million tokens) which means it can be fed full wikipedia pages easily.
- It has an acceptable output size (up to 8000 tokens, which is over 100 events for a page).
- It is cheap (15c/M tokens, and half that in batch mode)
- It extracts ~30% more events (and better) than the cheaper version Fash-2.0-lite.
