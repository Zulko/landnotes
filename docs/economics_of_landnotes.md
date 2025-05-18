# The economics of Landnotes

## AI costs

We process one page per request. The page is ~3000 tokens in average, the prompt adds ~500 tokens. The output size is very variable but seems to be around 1000 tokens in average.
We use Gemini Flash 2.0 in batch mode which costs 7.5c/million input tokens and 30c/million output tokens. This brings us to a cost of $70/100,000 pages. Gemini offers a promotional $300 credit to new customers, and these were used to process the first ~400,000 pages. Processing the ~4 million wikipedia pages which are estimated to contain dates (from a regular-expression search on the 12 million pages of English wikipedia) would therefore cost ~$3000.

## Server costs

Landnotes uses cloudflare for hosting. The base cost is 5$/month.

Data storage: There is an allowance of 5Gb, then $0.75/GB/month. Right now the project uses less than 5Gb but if we were storing all events accross 4 million pages, that would be around 25-30Gb so in the $20/month.

For the next server cost computations, let's say that in a typical session, a user makes 100 requests to the server, each request reading ~100 rows in average.

Rows read: 25 billion free every month + 0.001$/million rows read. so this is 2.5 million free sessions a month and then 0.01$ per 1000 sessions. Basically, it comes free.

Worker requests: 10 million requests/month + $0.3/million requests. So taking the numbers from above, that's 100k free sessions a month, then $0.03 per 1000 sessions. A steeper cost line but a good problem to have.
