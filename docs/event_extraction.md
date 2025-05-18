# Extracting events

The goal of Landnotes is to extract as many events as possible to render a rich world where millions of people, places and actions. For these events to appear on the map we need to extract basic where/when/what/who information, which is done using classic scripts with regexes for the most structured data, and AI for reading plain text.

## Parsing events in infoboxes

Right off the bat a simple script that looks at infoboxes for places and dates of births and deaths can scrap 1.4 million births and 900,000 deaths (which might mean that one third of the people on wikipedia are alive today!). Around 20,000 pages describe a specific event, for instance the [Boston tea party](https://en.wikipedia.org/wiki/Boston_Tea_Party) or [assassination of Julius Caesar](https://en.wikipedia.org/wiki/Assassination_of_Julius_Caesar). And there is a flurry of infoboxes that describe buildings openings (~300k), artwork release, etc.

The information in infoboxes is generally also available in structured form in the wikimedia database. But it is often not the whole story. For instance, the page on the assassination of Julius Caesar refers to a series of events in the months preceding the assassination, but these are not available in structured form. Which is why parsing pages with an AI can help retrieve more events.

## The need for AI models

If all events were told like "Julius Caesar was assassinated in Rome on 15 March 44 BC", then we could extract events (where/when/who/what) using classic scripts and regular expressions. But events are usually described in more complex ways.

Take this paragraph from the [Assassination of Julius Caesar](https://en.wikipedia.org/wiki/Assassination_of_Julius_Caesar):

> The second incident occurred in 44 BC. One day in January, the tribunes Gaius Epidius Marullus and Lucius Caesetius Flavus discovered a diadem on the head of the statue of Caesar on the Rostra in the Roman Forum. According to Suetonius, the tribunes ordered the wreath be removed as it was a symbol of Jupiter and royalty. Nobody knew who had placed the diadem, but Caesar suspected that the tribunes had arranged for it to appear so that they could have the honour of removing it. Matters escalated shortly after on the 26th, when Caesar was riding on horseback to Rome on the Appian Way.

When did matters escalate ? On the 26th of January 44 BC. The year, month, and day are all in separate sentences, which is way to complex for a rule-based script to handle, but should be understood by a decent AI model.

## Using whole pages vs. page extracts with dates

In Landnotes, we use regular expressions to detect dates in pages, and we only feed these pages which have a date to the AI. It would be tempting to be even more specific and only give the AI the sentences or paragraphs to that have a date.

The example above shows that feeding single sentences is dangerous, as the informaiton is often distributed accross multiple sentences. It is also true that the information can be scattered accross paragraphs and sections in an article. In a very common Wikipedia pattern (seen [here](https://en.wikipedia.org/wiki/Alessandro_Marcello)), the intro section will typically say _"A. Marcello (1 February 1673 – 19 June 1747)"_ and the "Biography" section will say _"Born in Venice"_. If we want the AI to extract a "birth" event with both date and place, we need to feed it both sections at once. Similarly, the location of an action might be given at the top of a page and then omitted in the sections. Finally, in practice removing paragraphs that don't have a date results in modest gains (less than 30% reduction in input tokens) that is not worth the decrease in quality.

## Dealing with AI forgetfulness

Modern AI models have a context window of 1 million tokens which means that in theory we could send hundreds of wikipedia pages to them at once, but there are not many advantage in doing so - the total number of tokens would be roughly the same. At worst, giving a long text to the AI increases the chances of it forgetting to list some of the events in it.

This is a weakness of current AI models: they are unreliable. If you give the Aggripina the Younger page to Gemini 2.0 flash, it might extract anywhere from 20 to 30 events. Prompt engineering helps (you basically say "please pretty please do not omit any events omg pay attention") but it is what it is: there is a significant, ~30% variance in the output of the AI.

This could be solved in some ways that each have their drawbacks:

- Feed the AI smaller chunks of text so it cannot miss the events in each chunk (this comes with the text chunking issues discussed in the previous section)
- Run the AI multiple times and somehow understand what the whole set of events in the page is, even though these events are worded a bit differently at every run. This multiplies the costs of the project.
- Use a much longer prompt that shows the level of detail expected in the answer.
- Use a more expensive model in the hope that it will know better.

## Converting pages to plain english

The text for the wikipedia pages is read from wikipedia dumps and is in [Wikitext format](https://en.wikipedia.org/wiki/Help:Wikitext), which can be complex and cryptic. Converting it to plain english (I am using the [mwparserfromhell](https://github.com/earwig/mwparserfromhell) library) not only reduces the number of tokens significantly, but also results in more than double the number of events extracted.

During this conversion, the infobox is heavily parsed to feel like bullet points in normal text, sections are indicated more clearly ("Section: name of the section"), image captions (which often contain events) are annotated to indicate that they are in fact image captions, etc. Basically, we write the plain english version of the page that we would like to read as a human if HTML didn't exist.

## Choice of AI model

Google Gemini Flash 2.0 as the model for this project:

- It is programming friendly and can give structured JSON (`{who: [], where: "", when: "", what: ""}`)
- It has a long context window (1 million tokens) which means it can be fed full wikipedia pages easily.
- It has an acceptable output size (up to 8000 tokens, which well over 100 events).
- It is cheap (15c per million tokens, and half that in batch mode)
- It extracts ~30% more events, and with better summaries, than its twice-cheaper variant Fash-2.0-lite.

## Having LLMs guess the context

Big AI models like ChatGPT or Gemini are proper scholars. Somewhere in their trillions of weights is encoded a lot of the information from Wikipedia, which they have probably read a few times. You can ask Gpt-4o "Did Moritz Moszkowski like Debussy?" and without needing a search it will tell you that they lived at the same time in the same city but that there was an "aesthetic gap" between them (Moszkowski was more conservative). It will also confidently says there is "no record of Moszkowski expressing admiration or dislike for Debussy" while in the [Moszkowski](https://en.wikipedia.org/wiki/Moritz_Moszkowski) page he calls Debussy a "madman". So it doesn't have perfect information, but it knows its subjects.

Should we leverage that model knowledge, which might on occasion be brash, or hallucinatory, to complete events when needed? This is controversial, but the choice for Landnotes has been "why not".

Take again this Mark Antony paragraph:

> At the start of the War of Mutina in December 44 BC, Mark Antony besieged Decimus Junius Brutus Albinus – the governor of Cisalpine Gaul – in Mutina in an attempt to force him to surrender the province to him in accordance with an illegal law he had passed earlier that year in June.

We learn that a law was passed illegally by Mark Antony. But where? Anyone with a bit of context on ancient Rome would surely say "in Rome" or even "in the senate", and so does Gemini, and it's probably right.

But having LLMs guess a context is double-edged. Take this event from the page on [Arcangello Corelli](https://en.wikipedia.org/wiki/Arcangelo_Corelli):

> In 1687 Corelli led the festival performances of music for Queen Christina of Sweden

Anyone reading this can be forgiven for assuming that this took place in Sweden, or even in Stockholm. But it was in Rome, where [Queen Christina of Sweden](https://en.wikipedia.org/wiki/Christina,_Queen_of_Sweden) lived half of her life (she was not reigning anymore but still carried the title).

## Finding wikipedia pages for people and places

For each events, the AI returns one or several places where the event happened, and one or several people who were involved. An event is only useful for the purposes of Landnotes if at least one of the places returned by the AI can be attributed coordinates on the map which means finding a wikipedia page for the place that is geotagged with latitude/longitude coordinates. Moreover, because Landnotes is built for exploration, we want to make it possible for users to get to the wikipedia page of these places and people, if there are such pages. So how do we find pages and geolocations for our AI-extracted events? The most obvious approach is to find a page with the same name.

### Using page titles

If the event lists "Winston Churchill" as participant to an event and there is a "Winston Churchill", this is it, case closed. If the place is "Berlin" and there is a "Berlin" page and it has geo coordinates, we're good. English Wikipedia has around 2 million geotagged pages and 1.5 million pages for people, so a lot of cases get resolved this way. But it is not always this simple.

### Using redirects

Sometimes the place doesn't directly have a page. This is the case for "Mutina" (in the Marc Antony paragraph above). In this case we can try leveraging redirects. Wikipedia has a database of12 million redirects (about as many as pages) which encode a lot of encyclopedic knowledge. There is indeed a redirect entry for "Mutina" which points to modern-day "Modena", which does have geo coordinates. Redirects are also useful for people whose are referred using a number of variations. For instance Julius Caesar is sometimes just called "Caesar", and pedants will write "Gaius Julius Caesar". Fortunately, all these are redirected to the same page. One might argue that "Caesar" is ambiguous (dozens of emperors were called Caesar), but Wikipedia has a nice etiquette whereby if a page has a particularly high claim to a shared name, it redirects there. So although there are many Churchills on wikipedia (there are even multiple Winston Churchills!) requesting just "Churchill" redirects to Winston Churchill (_the_ Churchill).

This is mostly helpful and sometimes double-edged: sadly for Samuel Jackson the 18th century naval officer, his name gets redirected to Samual Lee Jackson the actor.

### The pitfalls of disambiguation pages

An extracted event might say "Napoleon married Marie Louise" (because this is how it appears in the text). There is a page for Napoleon, and there is a page for "[Marie Louise](https://en.wikipedia.org/wiki/Marie_Louise)", however it is a disambiguation page (all the people named "Marie Louise") which is not very useful. By keeping a list of all disambiguation pages (these are relatively easy to find) we can at least avoid these pages. But it still doesn't help with finding our "Marie Louise". This is where page hyperlinks can help.

### Using page hyperlinks

Another tool we have to remove ambiguity in people and place names is the hyperlinks on the page. For instance the page on [Herbert Ingram](https://en.wikipedia.org/wiki/Herbert_Ingram) mentions "Bostonee, Lincolnshire" a lot, and many times it gets shortened as simply "Boston". This puts the AI at risk to note an event as happening in "Boston" which would then be placed on the map as the other "Boston, Massachusetts". However the page contains at least one hyperlink `[Boston | Boston, linkcolnshire]` which means that the text displayed is Boston but the page to link is "Boston, Lincolnshire". This is a clear indication of what "Boston" means in this page. By parsing all the hyperlinks on a page, which is easy to do with regular expressions, we can get a page-specific vocabulary that is a good protection against ambiguous names.

## Guessing the page section for each event

Landnote presents users with short summaries of events, from which the users can go to the original wikipedia page. However, for large pages, we don't want to leave to the user the burden of finding event in the page. Ideally we would bring the user directly to the section of the page that mentions the event. But how do we know which section the event was extracted from?

A first solution would be to ask the AI model to add section titles when it lists events. But this would add some mental load to the model which would have to track section titles. This might distract an AI that is already prone to dropping events. It would add output tokens making extraction more expensive, and there is no guarantee that the section titles would even always be correct.

A second solution is to do a second pass after the events are found, where we ask the AI to attribute a section to each event. This would work, but would double the AI costs of the project.

A third solution is to feed pages to the AI section by section, so we know for sure where each event comes from. But feeding pages section by section is problematic as explained above.

The current solution is simply a post-processing of the event where we match the text (summary, people and places) with the different sections. This is a bit tricky because the AI rephrases the events, and might change slightly the people names. But it tends to work well. Each word from the event text is matched against each section. Sections get higher scores if they match words that don't match in any other section. This can be highly parallelized (I am using `rapidfuzz` for this) and seems to work well.
