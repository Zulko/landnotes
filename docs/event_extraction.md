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

## Using whole pages vs. page extracts

In Landnotes, we use regular expressions to detect dates in pages, and we only feed these pages which have a date to the AI. It would be tempting to be even more specific and only give the AI the sentences or paragraphs to that have a date. The example above shows that feeding single sentences is dangerous, as the informaiton is often distributed accross multiple sentences. It is also true that the information can be scattered accross paragraphs and sections in an article. In a very common Wikipedia pattern (seen [here](https://en.wikipedia.org/wiki/Alessandro_Marcello)), the intro section will typically say _"A. Marcello (1 February 1673 – 19 June 1747)"_ and the "Biography" section will say _"Born in Venice"_. If we want the AI to extract a "birth" event with both date and place, we need to feed it both sections at once.

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

The disambiguation is important,

- [Marie Louise](https://en.wikipedia.org/wiki/Marie_Louise) is not someone but a given name.
- Even [Marcus Aemilius Lepidus](<https://en.wikipedia.org/wiki/Marcus_Aemilius_Lepidus_(disambiguation)>) is 8 different people (did you mean Marcus Aemilius Lepidus the Roman consul? Six of them were!)
