# Landnotes

Wikipedia content on top of OpenStreetMap. [Try it out!](https://landnotes.org/?location=wudykm00-10&selected=w31030312100)

![Screenshot from 2025-03-10 00-34-36](https://github.com/user-attachments/assets/f7bde8cb-e966-4600-a03c-d54bb0d20685)

The geodata is retrieved with [this notebook](./data_curation/geodata_curation.ipynb)) and overlaid in front of OpenStreetMap in the app built on these great libraries:

- Svelte for the components and interactions
- LeafletJS for the Open Street Map interface

## Local development

The website is a Svelte 5 application which you run with:

```
cd website
npm run dev
```

For it to run properly you need the local database worker (from Cloudflare):

- First build a database using the scripts in `data_curation` (that's the hard part. will be working on providing a test database).
- Then install `wrangler` on your machine.

You can run the database worker with

```
cd worker
wrangler dev
```
