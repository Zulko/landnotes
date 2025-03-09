# World of Wikipedia

Wikipedia pages on top of OpenStreetMap!

This is a study in making as slick an experience as possible with no servers, just a static github page serving (at most) a 26Mb database, and getting map tiles from OpenStreetMap.

The geodata is retrieved in [this notebook](./geodata_curation/geodata_curation.ipynb)) and overlaid in front of OpenStreetMap/LeafJS, using a Svelte/Vite app for interactions and ngeohash and LokiJS for efficient queries.

