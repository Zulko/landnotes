#!/bin/bash
# update_bucket.sh
#
# This script uploads files from local_assets to an R2 bucket.
# 
# Usage:
#   ./update_bucket.sh          # Uploads files using the local dev environment
#   ./update_bucket.sh --remote # Uploads files to the production R2 bucket
#

# Default to local mode
USE_LOCAL="--local"

# Check if --remote flag is provided
if [[ "$1" == "--remote" ]]; then
  USE_LOCAL=""
  echo "Running in remote mode - uploading to production bucket"
else
  echo "Running in local mode - uploading to local dev environment"
fi

# Upload files to R2 bucket
for file in local_assets/files/events_by_month_region/*; do
  npx wrangler r2 object put landnotes-data-files/events_by_month_region/$(basename "$file") \
    --file="$file" $USE_LOCAL
done 

for file in local_assets/files/events_by_page/*; do
  npx wrangler r2 object put landnotes-data-files/events_by_page/$(basename "$file") \
    --file="$file" $USE_LOCAL
done