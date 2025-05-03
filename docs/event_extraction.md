# Extracting events

The goal of landnotes is to extract as many events as possible to render a rich world where millions of people, places and actions are interconnected.

## Script based extraction

Right off the bat a simple script that looks at infoboxes for places and dates of births and deaths can scrap 1.4 million births and 900,000 deaths (which might mean that one third of the people on wikipedia are alive today!).

Some pages descrive events, for instance the [Boston tea party](https://en.wikipedia.org/wiki/Boston_Tea_Party) or [assassination of Julius Caesar](https://en.wikipedia.org/wiki/Assassination_of_Julius_Caesar).

Then there is a flurry of infoboxes for buildings (~300k), artwork release, etc.

However, only it gives very little info about other
You can press the

## LLM tricks

Works much better when the page is formatted to plain english.

## Choice of LLM

Google Gemini Flash 2.0 was chosen because:

- It can answer in JSON (`{who: [], where: "", when: "", what: ""}`)
- It has a long context window (1 million tokens) which means it can be fed full wikipedia pages easily.
- It has an acceptable output size (up to 8000 tokens, which is over 100 events for a page).
- It is cheap (15c/M tokens, and half that in batch mode)
- It extracts ~30% more events (and better) than the cheaper version Fash-2.0-lite.

The disambiguation is important,

- [Marie Louise](https://en.wikipedia.org/wiki/Marie_Louise) is not someone but a given name.
- Even [Marcus Aemilius Lepidus](<https://en.wikipedia.org/wiki/Marcus_Aemilius_Lepidus_(disambiguation)>) is 8 different people (did you mean Marcus Aemilius Lepidus the Roman consul? Six of them were!)
