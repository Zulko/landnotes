# World of Wikipedia

Wikipedia pages on top of OpenStreetMap! [Try it out](https://zulko.github.io/world-of-wikipedia/?lat=26.503184&lon=127.992096&zoom=10&marker=JTdCJTIyZ2VvaGFzaCUyMiUzQSUyMnd1ZHY0NHI3JTIyJTJDJTIycGFnZV90aXRsZSUyMiUzQSUyMlNoaWtpbmEtZW4lMjIlMkMlMjJuYW1lJTIyJTNBJTIyJTIyJTJDJTIycGFnZV9sZW4lMjIlM0ElMjI2NjMwJTIyJTJDJTIyY2F0ZWdvcnklMjIlM0ElMjJsYW5kbWFyayUyMiUyQyUyMmxhdCUyMiUzQTI2LjIwNDM2NjY4Mzk1OTk2JTJDJTIybG9uJTIyJTNBMTI3LjcxNTIwNjE0NjI0MDIzJTJDJTIyZ2VvMiUyMiUzQSUyMnd1JTIyJTJDJTIyaWQlMjIlM0ElMjJ3dWR2NDRyNy1TaGlraW5hLWVuJTIyJTJDJTIyJTI0bG9raSUyMiUzQTE3NTkxJTJDJTIyZGlzcGxheUNsYXNzJTIyJTNBJTIyc2VsZWN0ZWQlMjIlN0Q%3D)

![Screenshot from 2025-03-10 00-34-36](https://github.com/user-attachments/assets/f7bde8cb-e966-4600-a03c-d54bb0d20685)


This is a study in making as slick an experience as possible with no servers, just a static github page serving (at most) a 26Mb database, and getting map tiles from OpenStreetMap.

The geodata is retrieved with [this notebook](./geodata_curation/geodata_curation.ipynb)) and overlaid in front of OpenStreetMap in the app built on these great libraries:
- Svelte for the components and interactions
- LeafletJS for the Open Street Map interface
- LokiJS for in-browser data queries
- ngeohash for geohash operations
- FuseJS for text searches
- ViteJS for bundling, Pako for gzip decompression.

For development, start the server with:

```
npm install
npm run dev
```
