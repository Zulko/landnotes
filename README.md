# Landnotes

Landnotes shows Wikipedia places and events on top of OpenStreetMap - <a href="https://landnotes.org/?paneTab=about" target="_blank">try it out!</a>

There are currently 6.5 million events extracted from 400,000 articles using Google Gemini. If anything doesn't make sense, blame it on the AI! There are 10 times more articles to process but this might take $3000 dollars. See the [docs](./docs) for more details.

![Screenshot from 2025-03-10 00-34-36](https://github.com/user-attachments/assets/f7bde8cb-e966-4600-a03c-d54bb0d20685)

## Stack

Landnotes is built on top of

- [OpenStreetMap](https://www.openstreetmap.org/) for the maps, via [LeafletJS](https://leafletjs.com/)
- [mwparserfromhell](https://mwparserfromhell.readthedocs.io/en/latest/) for parsing Wikipedia markup
- [Google Gemini](https://gemini.google.com/) for the event extraction
- [Svelte 5](https://svelte.dev/) for the components and interactions
- [Cloudflare](https://www.cloudflare.com/) (D1, R2, Workers) for the infrastructure

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
