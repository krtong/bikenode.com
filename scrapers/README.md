# 99Spokes Scraper Pipeline

## 4-Stage Scraping Pipeline

### Stage 1: Brand/Make Scraper
**File:** `01_brand_scraper.js` (validate_all_makers.js)
- **Purpose:** Scrapes and validates all bike brands/makers from 99spokes
- **Input:** `maker_ids.txt` (380 makers)
- **Output:** Validated maker list
- **Status:** ✅ Complete

### Stage 2: Year Scraper  
**File:** `02_year_scraper.js` (extract_bike_families.js)
- **Purpose:** Scrapes available years for each bike brand
- **Input:** Validated maker list
- **Output:** `maker_years.json` (year ranges per brand)
- **Status:** ✅ Complete

### Stage 3: Variant URL Scraper
**File:** `03_variant_url_scraper.js` (extract_bike_variants.js)  
- **Purpose:** Extracts all bike variant URLs for each brand/year
- **Input:** `maker_years.json`
- **Output:** `bike_variants.json` (69,884 variant URLs)
- **Status:** ✅ Complete

### Stage 4: Data Scraper
**File:** `04_data_scraper.js` (database_aware_scraper.js)
- **Purpose:** Scrapes comprehensive bike data from individual URLs
- **Input:** `bike_variants.json`
- **Output:** PostgreSQL database (bikes_catalog + bikes_data tables)
- **Status:** 🔄 Active (39k/69k variants scraped)

## Pipeline Runner
**File:** `pipeline_runner.js`
- **Purpose:** Orchestrates the entire 4-stage pipeline
- **Usage:** `node pipeline_runner.js`

## Current Database
- **bikes_catalog:** 19,953 entries (relational data)
- **bikes_data:** 19,953 entries (comprehensive JSONB data)
- **Progress:** ~57% complete, ~30k variants remaining

## Usage
```bash
# Run individual stages
node 01_brand_scraper.js      # Validate makers
node 02_year_scraper.js       # Extract years  
node 03_variant_url_scraper.js # Extract variant URLs
node 04_data_scraper.js       # Scrape comprehensive data

# Run entire pipeline
node pipeline_runner.js
```