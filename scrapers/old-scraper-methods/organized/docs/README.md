# 99Spokes Scraper Pipeline

> **⚠️ Scraping Principles**
> - Work with real 99spokes website data only - no mock or placeholder data
> - Don't make assumptions about site structure - verify through actual scraping
> - Document real findings from scraping runs
> - Leave room for discovering edge cases and site changes
> - See core principles in [README_BEFORE_MAKING_ANY_PAGE.md]

## 5-Stage Scraping Pipeline

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

### Stage 5: Image Scraper 🆕
**File:** `05_image_scraper.js`
- **Purpose:** Downloads and organizes bike images from database URLs
- **Input:** PostgreSQL database (bikes_data.comprehensive_data)
- **Output:** Organized image files in `downloads/images/brand/year/model/variant/`
- **Features:**
  - Downloads images from `comprehensive_data.media.images` array
  - Creates hierarchical folder structure matching navigation
  - Smart progress tracking with resume capability
  - Skips already downloaded images
  - Intelligent retry logic (distinguishes permanent vs temporary failures)
  - Tracks failed URLs for analysis
  - Processes in batches to manage memory
  - Saves progress every 10 bikes
- **Files created:**
  - `image_scraper_progress.json` - Progress tracking for resume
  - `failed_image_urls.json` - Failed URLs with error details
- **Status:** ✅ Ready

## Pipeline Runner
**File:** `pipeline_runner.js`
- **Purpose:** Orchestrates the entire 5-stage pipeline
- **Usage:** `node pipeline_runner.js`

## Current Database
- **bikes_catalog:** 19,953 entries (relational data)
- **bikes_data:** 19,953 entries (comprehensive JSONB data)
- **Progress:** ~57% complete, ~30k variants remaining

## Usage

### Quick Commands (run from anywhere)
```bash
# Run image scraper only
cd /Users/kevintong/Documents/Code/bikenode.com/scrapers && npm run scrape:images

# Run entire pipeline
cd /Users/kevintong/Documents/Code/bikenode.com/scrapers && npm run pipeline

# Run individual stages
cd /Users/kevintong/Documents/Code/bikenode.com/scrapers && node 01_brand_scraper.js
cd /Users/kevintong/Documents/Code/bikenode.com/scrapers && node 02_year_scraper.js
cd /Users/kevintong/Documents/Code/bikenode.com/scrapers && node 03_variant_url_scraper.js
cd /Users/kevintong/Documents/Code/bikenode.com/scrapers && node 04_data_scraper.js
cd /Users/kevintong/Documents/Code/bikenode.com/scrapers && node 05_image_scraper.js
```

### Or if you're already in the scrapers directory
```bash
# Run individual stages
node 01_brand_scraper.js      # Validate makers
node 02_year_scraper.js       # Extract years  
node 03_variant_url_scraper.js # Extract variant URLs
node 04_data_scraper.js       # Scrape comprehensive data
node 05_image_scraper.js      # Download and organize images

# Run image scraper only
npm run scrape:images

# Run entire pipeline (including images)
node pipeline_runner.js
```

## Image Organization

Images are downloaded and organized in the following structure:
```
downloads/images/
├── trek/
│   ├── 2024/
│   │   ├── domane/
│   │   │   ├── sl_6_etap/
│   │   │   │   ├── sl_6_etap_1.jpg
│   │   │   │   ├── sl_6_etap_2.jpg
│   │   │   │   └── sl_6_etap_3.jpg
│   │   │   └── sl_5/
│   │   │       └── sl_5_1.jpg
│   │   └── fuel_ex/
│   │       └── ...
│   └── 2023/
│       └── ...
└── specialized/
    └── ...
```

This structure matches the navigation hierarchy in the vehicle selection interface.