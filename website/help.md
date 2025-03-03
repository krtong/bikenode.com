# BikeNode.com Scraper User Guide

## Overview

This project provides a comprehensive toolset for scraping bicycle data from 99spokes.com. It includes tools for:

1. **Basic scraping**: Extract bicycle data for specific years
2. **DOM analysis**: Analyze website structure to understand how to extract data
3. **Challenge handling**: Deal with bot protection challenges and CAPTCHAs
4. **Batch scraping**: Run multiple scraping tasks sequentially
5. **Data exporting**: Convert scraped data to various formats (CSV, JSON, Excel, HTML)
6. **Data merging**: Combine data from multiple scraping sessions

## Getting Started

### Prerequisites
- Python 3.7 or newer
- Chrome browser
- Required Python packages (installed via `setup.sh` or `requirements.txt`)

### Quick Start

For a user-friendly interface to all tools, run:
```bash
./start.sh
```

## Tool Documentation

### Main Scraper (`run_scraper.py`)

This is the primary tool for scraping bicycle data.

```bash
# Basic usage
python run_scraper.py

# Scrape 2024 bikes, save to a custom file
python run_scraper.py --year 2024 --output my_bikes.csv

# Only analyze the DOM structure
python run_scraper.py --analyze-only

# Export to different formats
python run_scraper.py --format json
python run_scraper.py --format excel
```

#### Options
- `--year YEAR`: Model year to scrape (default: 2025)
- `--pages NUM`: Maximum number of pages to scrape (default: 3)
- `--output FILE`: Output filename (default: exports/bikes_YEAR.csv)
- `--format FORMAT`: Output format (csv, json, or excel)
- `--headless`: Run in headless mode (no browser window)
- `--analyze-only`: Only analyze page structure, don't scrape
- `--verbose`: Show more detailed logs
- `--log-file FILE`: Save logs to a file

### Challenge Detection Fixer (`fix_challenge_detection.py`)

When bot challenges are incorrectly detected or causing issues:

```bash
python fix_challenge_detection.py
```

This tool will:
1. Open a browser to check if there's actually a challenge
2. Save screenshots and page source for analysis
3. Modify the scraper code to improve challenge detection

### Batch Runner (`batch_run.py`)

For scraping multiple years or datasets in sequence:

```bash
# Create a sample configuration
python batch_run.py config

# Run the batch scraping
python batch_run.py run
```

The configuration file (`batch_config.json`) lets you define multiple scraping jobs:
```json
{
  "output_dir": "exports",
  "format": "csv",
  "runs": [
    {
      "year": 2025,
      "pages": 3,
      "output": "bikes_2025.csv"
    },
    {
      "year": 2024,
      "pages": 3,
      "output": "bikes_2024.csv"
    }
  ],
  "post_process": {
    "merge": true,
    "output": "all_bikes_{timestamp}.csv"
  }
}
```

### Data Exporter (`run_exports.py`)

Convert existing CSV data to other formats:

```bash
# Convert to JSON
python run_exports.py bikes_2025.csv --format json

# Convert to Excel
python run_exports.py bikes_2025.csv --format excel

# Convert to HTML (interactive table)
python run_exports.py bikes_2025.csv --format html

# Convert to all formats
python run_exports.py bikes_2025.csv --format all
```

### Data Merger (`merge_data.py`)

Merge multiple bike datasets into one:

```bash
# Merge specific files
python merge_data.py --input bikes_2023.csv bikes_2024.csv --output all_bikes.csv

# Merge all CSVs in a directory
python merge_data.py --input-dir exports --pattern "*.csv" --output all_bikes.csv --deduplicate
```

## Troubleshooting

### Bot Protection Challenges

If you encounter bot protection challenges:

1. Run in non-headless mode to see the challenges
2. Solve them manually when prompted
3. Consider using a VPN if your IP is frequently challenged

### Extraction Issues

If data extraction fails or returns incomplete results:

1. Run in analyze-only mode to inspect the page structure
2. Check the debug_output directory for screenshots and HTML
3. Review the DOM analysis results to identify the correct selectors

### Dependency Issues

If you get import errors or missing module messages:

```bash
# Reinstall all dependencies
pip install -r requirements.txt

# For Conda users
conda install -y selenium pandas requests
pip install webdriver-manager beautifulsoup4 tqdm colorama
```

## Advanced Usage

For advanced users or developers:

- The core scraper class is in `data/bicycles/scrape.py`
- You can import this class in your own Python scripts
- Debug output is saved in the `debug_output` directory
- Challenge reports are saved in the `challenge_reports` directory
```

## Happy Scraping!

For further assistance or to report issues, please contact the developers or create an issue on the GitHub repository.
