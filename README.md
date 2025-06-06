# Landnotes

Landnotes shows Wikipedia places and events on top of OpenStreetMap - <a href="https://landnotes.org/?location=u01hvp8p-5&date=1949--2&strictDate=true&paneTab=about" target="_blank">try it out!</a>

There are currently 6.5 million events extracted from 400,000 articles using Google Gemini. If anything doesn't make sense, blame it on the AI! There might be 10 times more events to extract by scanning all of Wikipedia. Learn more about future directions in the [project's documentation](./docs/README.md).

<p>
<center>
  <a href="https://landnotes.org/?location=wudvf6g5-10&selected=w31030312100&wikiPage=Shikina-en" target="_blank">
    <img src="https://github.com/user-attachments/assets/f7bde8cb-e966-4600-a03c-d54bb0d20685" alt="screenshot" target="_blank"/>
  </a>
</center>
</p>

<p>
<center>
  <a href="https://landnotes.org/?location=u09y8j21-5&selected=Ambroise_Par%C3%A9_004&date=1545&strictDate=true&wikiPage=Ambroise+Par%C3%A9&wikiSection=Medicine" target="_blank">
    <img src="./docs/assets/event_screenshot.jpeg" alt="screenshot" target="_blank"/>
  </a>
</center>
</p>


## Stack

Landnotes is built on top of the following technologies :pray:

Web application:
- [OpenStreetMap](https://www.openstreetmap.org/) for the maps, via [LeafletJS](https://leafletjs.com/)
- [Svelte 5](https://svelte.dev/) for the components and interactions
- [Cloudflare](https://www.cloudflare.com/) (D1, R2, Workers) for the infrastructure.
- And of course [Wikipedia](https://www.wikipedia.org/) and its [API](https://en.wikipedia.org/api/) 

Data curation:
- [Google Gemini](https://gemini.google.com/) for the event extraction
- [wiki-dump-extractor](https://github.com/zulko/wiki-dump-extractor) (written specially for this project) for handling, indexing, parsing the wikipedia page dump.
- [mwparserfromhell](https://mwparserfromhell.readthedocs.io/en/latest/) for parsing Wikipedia markup into plain text.


## Development

Run the website locally with:

```
cd website
npm run dev:remote-dbs
```

Or to run with local databases:

```
cd website
npm run dev
```

However for the local-database mode to run properly you need a local database worker (from Cloudflare):

- First build a database using the scripts in `data_curation` (that's the hard part! Working on providing a test database).
- Then install `wrangler` on your machine.

You can run the database worker with

```
cd worker
wrangler dev
```
