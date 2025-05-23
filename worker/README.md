# Database of events for cloudflare

## Prerequisites

- Your SQLite file ready (let’s say it's called events.sqlite)
- A Cloudflare account
- wrangler CLI installed (`npm install -g wrangler`)
- Logged in via `wrangler login`

## 1 Create the database

```
wrangler d1 create events-db
```

This will:

- Create a D1 database named events-db
- Show the binding string you’ll use in Workers

# 2 upload the SQLITE file

**Warning:** this will overwrite the remote DB, so only do it once to initialize.

wrangler d1 create landnotes-geo-db
wrangler d1 execute landnotes-geo-db --file=geo_db.sqlite
wrangler d1 execute landnotes-geo-db --file=geo_db.sqlite --remote

```
wrangler d1 execute events-db --file=./events.sqlite
```

Result:

```
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "landnotes-geo-db",
      "database_id": "1aa44a6d-dd4f-4d51-8e9b-115a653538c0"
    }
  ]
}
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "events-db",
      "database_id": "e9fa680b-3f78-48e8-abd6-4eb17c6d24c6"
    }
  ]
}
```

## 3 Create the Worker

```
wrangler init querier
cd event-querier
```

# Deploy

Upload the data files:

```
rclone copy dev_assets/landnotes-data-files r2:landnotes-data-files
```

And deploy:

```
wrangler deploy
```
