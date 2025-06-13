# Crawler-Scraper Pipeline Demo

## What This Pipeline Does

The crawler-scraper pipeline is a 14-step web scraping system that:

1. **Discovers all URLs** on a website (step 01_map)
2. **Filters URLs** to keep only scrapeable pages (step 02_filter)
3. **Groups URLs** by template pattern (step 03_group)
4. **Downloads all HTML** pages (step 08_fetch)
5. **Extracts structured data** using CSS selectors (step 09_scrape)
6. **Cleans and normalizes** the data (steps 10-11)
7. **Stores data** in files or database (step 12_load)

## Current Demo: quotes.toscrape.com

The pipeline has been tested on quotes.toscrape.com and has:
- Found 50 URLs across the site
- Downloaded all HTML pages to `08_fetch/html/`
- Identified patterns like:
  - Homepage with quotes
  - Author pages (`/author/Albert-Einstein`)
  - Tag pages (`/tag/love/`)
  - Pagination (`/page/2/`)

## For Bikenode.com Use Cases

This pipeline can be configured to scrape:

### 1. Motorcycle Manufacturer Sites
- Map all product pages
- Extract specs, prices, images
- Track model changes over time

### 2. Parts Catalogs
- Discover all parts listings
- Extract part numbers, compatibility
- Monitor availability

### 3. Review Sites
- Find all motorcycle reviews
- Extract ratings, pros/cons
- Aggregate user feedback

## How to Use for Your Domain

```bash
# 1. Map a motorcycle site
python 01_map/run_map.py revzilla.com

# 2. Filter to product pages
python 02_filter/filter_urls.py

# 3. Group by template (products, categories, etc)
python 03_group/group_urls.py --domain revzilla.com

# 4. Download all pages
python 08_fetch/crawl_full.py --domain revzilla.com

# 5. Extract product data
python 09_scrape/parse_dom.py --domain revzilla.com
```

## Key Features

- **Modular**: Each step can be run independently
- **Resumable**: Can restart from any step
- **Scalable**: Handles thousands of pages
- **Flexible**: Works with any website structure
- **Production-ready**: Includes error handling, logging, QC

## Next Steps

1. Configure CSS selectors for your target site
2. Run the pipeline on a motorcycle-related domain
3. Review extracted data quality
4. Set up incremental updates (step 14)