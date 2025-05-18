# The economics of Landnotes

## AI costs

Thew

## Server costs

5$/month.

Let's say that in a typical session, a user makes 100 requests to the server, each request reading ~100 rows in average.

Rows read: 25 billion free every month + 0.001$/million rows read. so this is 2.5 million free sessions a month and then 0.01$ per 1000 sessions. Basically, it comes free.

Worker requests: 10 million requests/month + $0.3/million requests. So taking the numbers from above, that's 100k free sessions a month, then $0.03 per 1000 sessions. A steeper cost line but a good problem to have.

### Database costs

Storage: 5Gb included + 0.75Gb/month.

Google Gemini was chosen because:

Using he general rule of thumb is 50c- 1$ per 1000 pages.

The prompt (and possibly the JSON output schema) add 600 tokens per request, so would cost ~50$/million pages.
