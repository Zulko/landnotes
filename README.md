# Landnotes

Wikipedia content on top of OpenStreetMap. [Try it out!](https://landnotes.org/?lat=26.501344&lon=127.992096&zoom=10&marker=JTdCJTIyaWQlMjIlM0ElMjJ3dWR2NDRyNy1TaGlraW5hLWVuJTIyJTJDJTIycGFnZV90aXRsZSUyMiUzQSUyMlNoaWtpbmEtZW4lMjIlMkMlMjJwYWdlX2xlbiUyMiUzQTY2MzAlMkMlMjJnZW9oYXNoJTIyJTNBJTIyd3VkdjQ0cjclMjIlMkMlMjJsYXQlMjIlM0ElMjIyNi4yMDQzNjclMjIlMkMlMjJsb24lMjIlM0ElMjIxMjcuNzE1MjA2JTIyJTdE)

![Screenshot from 2025-03-10 00-34-36](https://github.com/user-attachments/assets/f7bde8cb-e966-4600-a03c-d54bb0d20685)


This is a study in making as slick an experience as possible with no servers, just a static github page serving (at most) a 26Mb database, and getting map tiles from OpenStreetMap.

The geodata is retrieved with [this notebook](./geodata_curation/geodata_curation.ipynb)) and overlaid in front of OpenStreetMap in the app built on these great libraries:
- Svelte for the components and interactions
- LeafletJS for the Open Street Map interface
- ngeohash for geohash operations
- FuseJS for text searches
- ViteJS for bundling, Pako for gzip decompression.

For development, start the server with:

```
npm install
npm run dev
```
