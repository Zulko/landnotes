# Ideas of future directions for Landnotes

## Scanning all of the English Wikipedia

The most obvious future direction is to continue feeding the English Wikipedia to an AI for extraction. So far 400,000 pages have been processed, but based on a simple search using regular-expressions there are at least 2 million pages other pages just for events happening between 250 and 1950, and another 2 million pages for events happening after 1950. It would take a bit over $3000 to process all these pages, and then the database would cost around ~30$/month to host, see [the economics of Landnotes]. This is a bit steep for a project at this stage, so the progress will depend on user interest and whether there is interest in crowd-sourcing, credit sponsoring from, or interest from the wikimedia foundation etc.

## Non-English wikipedias

In general, I think AI has a card to play in terms of homogenizing the quality of wikipedia articles accross languages, typically to to find facts reported in some languages and not others. For instance, you can expect the French article on the Eiffel Tower to have more facts than the English one, because there may be more french-speaking people available to edit the page than english-speaking people, and because most sources are in French. On the other hand, the different language versions reflect cultural interests and blindspots. The French wikipedia page for the Eiffel Tower makes no mention of Haiti, but the English one has a whole paragraph on how some of the financing came from predatory loans that Haiti was subjected to, citing the New York Times.

In terms of data volume, and looking at the size of the backup files, non-English wikipedia is not much bigger than English wikipedia. French/Spanish/German/Chinese wikipedia combined are about the same size as the English wikipedia.

But extending the project to non-English wikipedia won't be as simple as pushing a button:

- When looking for events using scripts, or when classifying events and places into categories, we will probably need to adapt the scripts to each language so that the current script looking for "birth" in english will look for "naissance" in french for instance.
- We'll need to evaluate which AI models can extract data from these languages, and whether they still can extract data in a JSON format ({who, when, where, what}) without being confused.
- We'll need to make user-experience decisions on how to use the events extracted from non-English wikipedia. Do we translate them to english? Do we display them with the other events? Does the user need to select and unselect languages?

## Beyond wikipedia

If the project goes this far, it would be interesting to extract events from sources other than wikipedia. For instance, history books. If we fed Mark Duncan's Lafayette biography to Gemini, it would no doubt extract hundreds of interesting events. Fiction books would work too, so you could follow your favorite historical novel displayed on the map along with the real events. The Gutenberg project has around 20Gb of public domain texts. By identifying the ones with dates and feeding them to Gemini, how many events would we get?

## Historical borders

Landnote displays historical events on Open Street Map, so the old settlements, battles and travels are superimposed on today's streets, fields and highways. But this deprives us of important historical context. Some regions of the world were very different just one or two centuries ago, and borders have moved a lot. Famous German scientist Max Born and Alois Alzheimer were born in the German city of Breslau, which is now called Wroclaw in Poland. Verdi was born in a small Italian village that was technically in France at the time.

Having a layer showing historical borders on the map depending on the year would go a long way to give a better understanding of the historical events. This data is mostly available. The [historical-basemaps](https://github.com/aourednik/historical-basemaps?tab=readme-ov-file) project on Github has a great data collection and a [demo for it](https://historicborders.app/?lng=6.4513466&lat=39.3328695&zoom=4.1297515&year=1492) but the viral GPL license makes me a bit worried. There are many other projects like [Open Historical Maps](https://openhistoricalmaps.org/) and [OldMapsOnline.org](https://oldmapsonline.org/) that make me think it is achievable.

## Developer tools

- Make it possible to to develop against the live online database. This is kind of dangerous as I pay for queries to the live database, but should help getting contributors.
