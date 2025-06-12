# Scrape Pipeline

A modular, 14-step web scraping pipeline designed for reliability, maintainability, and scalability.

## Overview

This pipeline separates concerns into discrete steps, each with clear inputs and outputs. No step depends on another's internals—only on its output files.

## Setup

1. Install Python 3.11+
2. Install dependencies: `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and fill in your values
4. Install Playwright browsers: `playwright install`

## Pipeline Steps

1. **01_map** - Discover all URLs on the domain
2. **02_filter** - Keep only scrapeable URLs (200 OK, HTML)
3. **03_group** - Group URLs by template pattern
4. **04_probe** - Inspect one URL per template
5. **05_decide** - Document scraping strategy per template
6. **06_plan** - Define extraction rules (selectors/APIs)
7. **07_sample** - Test on 30 URLs per template
8. **08_fetch** - Download all raw HTML/JSON
9. **09_scrape** - Extract structured data
10. **10_dedupe** - Remove duplicates
11. **11_clean** - Normalize and clean data
12. **12_load** - Import to database
13. **13_qc** - Quality control checks
14. **14_refresh** - Incremental updates

## Usage

Each step is run independently:

```bash
# Step 1: Map the site
python 01_map/run_map.py https://example.com

# Step 2: Filter URLs
python 02_filter/filter_urls.py

# Step 3: Group by template
python 03_group/group_urls.py

# ... continue through each step
```

## Key Principles

- **No cross-folder writes**: Each step only writes to its own folder
- **Explicit I/O**: All inputs/outputs clearly defined
- **Fail loudly**: Scripts exit with error codes on failures
- **No hard-coded secrets**: Everything from `.env`
- **Idempotent**: Running a step twice produces the same result

## See Also

- [SCRAPING_PIPELINE_SPEC.md](./SCRAPING_PIPELINE_SPEC.md) - Detailed specification
- [SCRAPING_DESIGN_PRINCIPLES.md](../SCRAPING_DESIGN_PRINCIPLES.md) - Core philosophy