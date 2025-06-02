# Data curation for landnotes

A lot is happening in this repo. Here are the notebooks, in the order in which they should be run:

- `wikipedia_dump_extraction.ipynb`: downloads and pre-processes the wikipedia dump.
  - Downloads the wikipedia dump
  - Extracts "redirect" pages to a key-value store (Bombay -> Mumbai)
  - Converts the dump to avro format
  - Indexes the dump so it can be queried by page title
  - Extracts the interpage links (e.g. a page might display "Capitole" but the word has a link to "Toulouse Capitole" which is useful and page-specific context).
  - Lists pages which are "disambiguation" pages" (we don't want these pages to appear in Landnotes)
  - Extracts and parses the infoboxes from the pages.
- `geodata_curation.ipynb`: Creates the `places` database.
  - Downloads the SQL wikipedia dump for "geotagged places"
  - Parses it to a CSV/dataframe
  - Downloads the corresponding SQL dump with page titles and reconstructs the full dataset.
  - Filter out places which might come from lists or non-earth location (Mars craters etc)
  - Attribute a geohash to every place.
  - Compute the score of every page (this is the length of the site's page, using the Wikipedia page dump, after some parsing)
  - Hierachize the places to decide which appear at low or high zoom levels.
  - Write the places to a sqlite file for local testing.
  - Write the corresponding SQL for Cloudflare upload. 
  - Create a database of the pages with geolocation