# Data Storage Policy

> **⚠️ MANDATORY READING FIRST**
> 
> **Read before proceeding:**
> 1. [SCRAPING_DESIGN_PRINCIPLES.md](../SCRAPING_DESIGN_PRINCIPLES.md)
> 
> **STORAGE RULES:**
> - **NO PLACEHOLDERS** - Never store "example", "test", or synthetic data
> - **PRESERVE EVERYTHING** - Store raw data exactly as collected
> - **CHECK BEFORE CREATING** - Verify similar files don't already exist
> - **SPECIFIC NAMES** - Use descriptive file names, not generic ones

This document defines when to use file storage vs database storage in the pipeline.

## File Storage (JSON/CSV/NDJSON)

Use file storage for:
- **Raw data** - Unprocessed HTML, API responses
- **Intermediate data** - Partially processed, work-in-progress
- **Non-production data** - Test data, samples, experiments
- **Metadata** - URL lists, patterns, configurations
- **Logs and reports** - Quality checks, statistics

### File Formats by Purpose:
- **CSV** - Structured tabular data (dump.csv, clean.csv)
- **NDJSON** - Streaming records (parsed.ndjson, deduped.ndjson)
- **JSON** - Configuration, statistics, single documents
- **TXT** - Simple lists (all_urls.txt, patterns.txt)
- **HTML** - Raw scraped pages
- **YAML/JSON** - Configuration files

## Database Storage (PostgreSQL)

Use database ONLY for:
- **Clean, validated data** - After step 11_clean
- **Production-ready data** - Fully processed, normalized
- **Data with relationships** - Products, prices, images
- **Data needing queries** - Search, filtering, aggregation

## Pipeline Storage Rules

1. **Steps 01-11**: Use ONLY file storage
   - All intermediate processing stays in files
   - Each step reads/writes files in its directory

2. **Step 12_load**: Optional database load
   - Only loads from 11_clean/clean.csv
   - Data must be fully cleaned and validated
   - Can be skipped if database not needed

3. **Steps 13-14**: Mixed storage
   - Can read from both files and database
   - Quality checks compare files vs database
   - Results saved as files (reports, logs)

## Example Flow

```
01_map/dump.csv           → Raw URL metadata (FILE)
02_filter/all_urls.txt    → Filtered URLs (FILE)
03_group/by_template/*.txt → Grouped URLs (FILE)
08_fetch/html/*.html      → Raw HTML (FILE)
09_scrape/parsed.ndjson   → Raw extracted data (FILE)
10_dedupe/deduped.ndjson  → Deduplicated raw data (FILE)
11_clean/clean.csv        → Clean, normalized data (FILE)
12_load → database        → Production data (DATABASE) [OPTIONAL]
13_qc/qc_report.txt       → Quality report (FILE)
```

## Key Principle

> "Collect everything, assume nothing" - All raw and intermediate data stays in files for full auditability and reprocessing capability. Only the final, production-ready data optionally goes to a database.