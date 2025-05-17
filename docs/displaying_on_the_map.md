# How places and events are displayed on the map in Landnotes

Just like in any map website, as a user zooms in on smaller regions, new markers forplaces and events start appearing. The implementation of this mechanism (often referred to as "Levels of Detail") impacts has a big impact on the user experience:

- It is opinionated: markers that appear at the world level will be shown to more users than the ones that only appear at the level of a city district. We need to ensure that the pages at the top levels are the most interesting ones.
- It is database-intensive: as the users zoom and pan all over the map, we want to make sure the queries made in the background are as efficient as possible, in part to keep the website fluid and reactive, and in greater part because the database provider, CloudFlare, charges per database row scanned.

This page describes how Levels of Detail works in Landnotes.

## Spatial hierarchies with geocoding

To explain how we make new markers progressively appear as a user zooms in, we have to first talk about geohashing, whereby we attribute a short string to different regions of the world.

In the most common geocoding method, we first split the world in a grid of 32 regions:

![Geohashing grid](./assets/geohash_level0.png)

Then we split each of these regions in 32 smaller regions, for a total of 1024 regions:

![Geohashing grid](./assets/geohash_level1.png)

## Ranking places and events

Which places should have a marker at the world level and which ones should only appear at the street level? It is a matter of opinion.

Landote's mission is to help discover interesting topics and well-documented wikipedia pages, and so the criteria is simply "the size of the wikipedia page".

Initially, Landnotes used the total number of characters in a page as a the score (the wikipedia dumps provide that number for each wikipedia page). But the longest pages often owe their length to a high number of journalistic references, because they cover current events and controversial subjects (conflicts, assassinations, politicians). Having these pages appear first made for a grim world, so the page length is now measured after removing all references (using a regex), which favors pages with actual wikipedia content.

There could be alternative criteria for page ranking, based for instance on the number of wikipedia pages that link to a given page, similar to how Google used to rank the internet back in the 2000s.
