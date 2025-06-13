# Scraping Pipeline Specification

> **⚠️ MANDATORY: Read These First**
> 
> **MUST READ BEFORE PROCEEDING:**
> 1. [SCRAPING_DESIGN_PRINCIPLES.md](../SCRAPING_DESIGN_PRINCIPLES.md)
> 
> **CRITICAL RULES:**
> - **NO PLACEHOLDERS** - Never use mock data, test data, or example.com
> - **NO ASSUMPTIONS** - Never assume website structure or content
> - **CHECK FIRST** - Always verify files exist before referencing them
> - **SPECIFIC NAMES** - No generic file names like "utils.py" or "helpers.js"
> - **VERIFY EXISTENCE** - Check for similar files before creating new ones

Below is the exact guidance you'd hand to an AI developer—no fluff, no missing pieces—so it knows precisely **what to build**, **where**, **with what tools**, and **why**.  Treat each folder as its own contract: inputs, outputs, tech, and scope.

---

## 00_env/

* **Purpose**: hold only environment-specific secrets and configuration.
* **Scope**: a single `.env` file (template) that all scripts load via `python-dotenv`.
* **Tech**: no code, only key=value pairs (DB URL, proxy credentials, API tokens).

## 01_map/

* **Purpose**: discover every reachable URL on the target domain.
* **Inputs**: root domain (CLI arg).
* **Outputs**: `dump.csv` containing columns `url,status_code,content_type,…`.
* **Tech**: `run_map.py` in Python 3.11 using either:

  * **Screaming Frog CLI** (called via `subprocess`)
  * or a minimal Scrapy spider (`scrapy.Spider`) that only grabs headers, not bodies.
* **Rules**: do **not** save full HTML here—only metadata.

## 02_filter/

* **Purpose**: trim `dump.csv` to only those URLs you intend to scrape.
* **Inputs**: `01_map/dump.csv`.
* **Outputs**: `all_urls.txt` (one URL per line).
* **Logic**: keep rows where `status_code == 200` **and** `content_type` starts with `text/html`.
* **Tech**: `filter_urls.py` in Python using the built-in `csv` module (no Pandas).

## 03_group/

* **Purpose**: split `all_urls.txt` into separate lists by page "template" (layout).
* **Inputs**: `02_filter/all_urls.txt` and a site-specific pattern file (if provided).
* **Outputs**: `by_template/<template_name>.txt` (one list per pattern).
* **Logic**: match each URL against ordered regexes; a URL must go into exactly one file.
* **Tech**: `group_urls.py` in Python, using the `re` module.

## 04_probe/

* **Purpose**: fetch one representative URL per template to inspect how data loads.
* **Inputs**: each `by_template/*.txt` list.
* **Outputs**:

  * `pages/<template_name>.html` or `.json`
  * `netlogs/<template_name>.har` (Playwright HAR)
  * `findings.yaml` listing for each template:

    ```yaml
    template_name:
      source: html|json
      needs_js: true|false
    ```
* **Tech**: `probe_template.py` in Python using Playwright:

  * load the URL, wait for network idle
  * save response body and HAR
  * timeout after 15 s

## 05_decide/

* **Purpose**: human-review or automated rule to record *how* each template should be scraped.
* **Inputs**: `04_probe/findings.yaml`.
* **Outputs**: `decision.md` with one bullet per template:

  ```
  - product_page: use JSON API at /api/item?id={id}
  - blog_post: parse static HTML via CSS selectors
  - search_results: needs headless rendering
  ```
* **Tech**: manual or templated script (no assumptions).

## 06_plan/

* **Purpose**: encode the **final** extraction rules in machine-readable form.
* **Inputs**: `05_decide/decision.md`.
* **Outputs**:

  * `css_selectors.yaml`
  * `api_endpoints.yaml`
    each keyed by `template_name`.
* **Tech**: hand-edited YAML; drives all parsers.

## 07_sample/

* **Purpose**: validate that your plan works on a small subset.
* **Inputs**: first 30 URLs from each `by_template/*.txt`, plus `06_plan/*.yaml`.
* **Outputs**:

  * `output.ndjson` (parsed records)
  * `sample.log` (counts, errors)
* **Tech**: `crawl_sample.py` in Python using Scrapy or Crawlee with YAML-driven pipelines.
* **Fail rule**: if >10% of fields miss, exit non-zero.

## 08_fetch/

* **Purpose**: download **every** URL in `all_urls.txt`—raw page bodies only.
* **Inputs**: `02_filter/all_urls.txt`.
* **Outputs**:

  * `html/<timestamp>_<template>_<id>.html`
  * `json/<timestamp>_<template>_<id>.json`
  * `fetch.log`
* **Tech**: `crawl_full.py` in Python using Scrapy/Crawlee; obeys `robots.txt`, `User-Agent` header, configurable concurrency and delay.

## 09_scrape/

* **Purpose**: apply selectors/API rules to raw files to produce **raw structured rows**.
* **Inputs**: `08_fetch/html/`, `08_fetch/json/`, plus `06_plan/*.yaml`.
* **Outputs**: `parsed.ndjson` (one JSON object per page).
* **Tech**:

  * `parse_dom.py` for HTML templates,
  * `parse_json.py` for API templates
    – both streaming NDJSON writers to limit memory use.

## 10_dedupe/

* **Purpose**: remove duplicate records.
* **Inputs**: `09_scrape/parsed.ndjson`.
* **Outputs**: `deduped.ndjson`.
* **Logic**: drop subsequent records with the same `url` or unique key.
* **Tech**: `dedupe.py` in Python.

## 11_clean/

* **Purpose**: normalize data types, convert units, strip symbols.
* **Inputs**: `10_dedupe/deduped.ndjson`.
* **Outputs**: `clean.csv`.
* **Tech**: `clean.py` using `pandas` or standard CSV + manual conversions; always preserve raw value in `_raw` fields on failure.

## 12_load/

* **Purpose**: bulk-load `clean.csv` into the production database.
* **Inputs**: `11_clean/clean.csv`, `00_env/.env` (DB URL).
* **Outputs**: rows upserted into tables defined by `schema.sql`.
* **Tech**:

  * `schema.sql` (CREATE TABLE, indexes)
  * `load_db.py` in Python using `psycopg2` or `sqlalchemy`, idempotent upserts.

## 13_qc/

* **Purpose**: verify data quality after load.
* **Inputs**: database connection and `11_clean/clean.csv`.
* **Outputs**: `qc_report.txt` with metrics and pass/fail.
* **Tech**: `tests.py` in Python using `pytest`; asserts row count, null constraints, regex checks on critical fields.

## 14_refresh/

* **Purpose**: keep data current by detecting and fetching only new/changed URLs.
* **Inputs**: previous `dump.csv`, new crawl run, existing DB keys.
* **Outputs**: incremental URL diffs and new records in DB.
* **Tech**:

  * `remap.py` to diff two `dump.csv` files,
  * `incremental_crawl.py` to run steps 02–12 only on new URLs.

---

## Key AI-coding constraints

* **One script per folder**; no cross-folder writes.
* **Explicit inputs/outputs in code**; no hidden defaults.
* **Fail loudly** on missing files, missing selectors, parse errors.
* **Load secrets only from `00_env/.env`**; do not hard-code.
* **Use pinned versions** in `requirements.txt`; no placeholders or mocks.
* **File storage for raw data**: Steps 1-11 use ONLY files (CSV, JSON, NDJSON, TXT).
* **Database only for clean data**: Step 12 optionally loads clean.csv to database.
* **No raw data in database**: Never push unprocessed, non-production data to database.

Hand this spec to your code-gen AI and it will know **exactly** what to build, where to read, what to write, and which stack to use—nothing more, nothing less.