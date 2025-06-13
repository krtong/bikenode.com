# Scrape Pipeline

A modular, 14-step web scraping pipeline designed for reliability, maintainability, and scalability.

## Overview

This pipeline separates concerns into discrete steps, each with clear inputs and outputs. No step depends on another's internals—only on its output files.

## Setup

1. Install Python 3.11+
2. Install dependencies: `pip install -r requirements.txt`
3. Configure environment variables in the root `.env` file (see `00_env/README.md`)
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
12. **12_load** - Load to database OR structured files (see below)
13. **13_qc** - Quality control checks
14. **14_refresh** - Incremental updates

## Usage

Each step is run independently:

```bash
# Step 1: Map the site
python 01_map/run_map.py https://your-domain.com

# Step 2: Filter URLs
python 02_filter/filter_urls.py

# Step 3: Group by template
python 03_group/group_urls.py

# ... continue through each step
```

## Key Principles

- **No cross-folder writes**: Each step only writes to its own folder
- **File-first approach**: All raw and intermediate data stored as files (CSV, JSON, NDJSON)
- **Explicit I/O**: All inputs/outputs clearly defined
- **Fail loudly**: Scripts exit with error codes on failures
- **No hard-coded secrets**: Everything from `.env`
- **Idempotent**: Running a step twice produces the same result
- **Database optional**: Only clean, production-ready data goes to database (step 12+)

## Project Structure

- **00_env/** - Environment configuration documentation
- **01_map/** through **14_refresh/** - Pipeline steps
- **orchestration/** - Shared configuration and utilities for the pipeline:
  - `config.py` - Centralized configuration management
  - `utils_minimal.py` - Core utility functions (logging, file I/O, URL handling)
  - `run_pipeline.py` - Automated pipeline orchestration script
  - `check_health.py` - Pipeline health and dependency checks
- **tests/** - Integration tests for pipeline conformance

## Data Storage Options

### File-Based Storage (Default)
```bash
# Use structured file storage instead of database
python 12_load/load_files.py --domain your-domain.com
```

This creates organized file structure:
```
12_load/data/your-domain.com/
├── catalog.json       # Master product catalog
├── products/         # Individual product JSON files
├── indexes/          # Quick lookup indexes
└── history/          # Price history tracking
```

### Database Storage (Optional)
```bash
# Load to PostgreSQL (requires configuration)
python 12_load/load_db.py --domain your-domain.com
```

## See Also

- [SCRAPING_PIPELINE_SPEC.md](./SCRAPING_PIPELINE_SPEC.md) - Detailed specification
- [DATA_STORAGE_POLICY.md](./DATA_STORAGE_POLICY.md) - When to use files vs database
- [SCRAPING_DESIGN_PRINCIPLES.md](../SCRAPING_DESIGN_PRINCIPLES.md) - Core philosophy