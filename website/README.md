# Hierarchical Bike Scraper

A comprehensive web scraper for 99spokes.com that extracts complete bike taxonomy:
Year > Brand > Family > Bike/Build > Specifications

## Features

- Extracts bikes from 2000-2026
- Captures full bike hierarchy (year, brand, family, model)
- Saves detailed specifications for each bike
- Extracts geometry tables
- Supports resuming interrupted scrapes
- Exports structured CSV and JSON data
- Handles security challenges gracefully

## Prerequisites

- Python 3.7 or higher
- Chrome browser installed

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/bikenode.com.git
cd bikenode.com
```

### 2. Set up the environment

You can set up the environment by running the setup script:

```bash
chmod +x setup.sh
./setup.sh
```

Or manually install the requirements:

```bash
pip3 install -r requirements.txt
```

### 3. Verify installation

To verify that everything is installed correctly:

```bash
python3 -c "import selenium; print(f'Selenium version: {selenium.__version__}')"
```

## Usage

### Basic Scraper Usage

Run the scraper with default settings:

```bash
python3 run_scraper.py
```

### Options

- `--year YEAR`: Specify the model year (default: 2025)
- `--pages PAGES`: Maximum number of pages to scrape (default: 3)
- `--output FILENAME`: Output CSV filename (default: bikes_YEAR.csv)
- `--analyze-only`: Only analyze page structure, don't scrape data
- `--headless`: Run in headless mode (not recommended due to CAPTCHA)

### Examples

Scrape 2024 bikes and save to custom file:
```bash
python3 run_scraper.py --year 2024 --output my_2024_bikes.csv
```

Just analyze the page structure:
```bash
python3 run_scraper.py --analyze-only
```

## CAPTCHA Handling

This scraper is designed to handle Cloudflare and other bot protection systems:

1. When a CAPTCHA or security challenge appears, the browser window will remain visible
2. Solve the CAPTCHA manually in the browser window
3. The scraper will automatically continue once the challenge is solved

## Troubleshooting

If you encounter the error "ModuleNotFoundError: No module named 'selenium'", make sure you've installed the requirements:

```bash
pip3 install -r requirements.txt
```

If you have issues with ChromeDriver, try:
```bash
pip3 install webdriver-manager
```

# Bikenode Website

This directory contains the frontend website code for the Bikenode.com platform.

## Overview

The Bikenode website serves as the primary interface for users to access bike information, search functionality, and account management.

## Structure

- HTML files: Core website pages
- CSS files: Styling for the website
- JavaScript: Interactive functionality 
- Assets: Images and media files

## Development

To run the website locally:

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. The site will be available at `http://localhost:3000`

## Building

To build the site for production:

```bash
npm run build
```

This will create optimized files in the `dist` directory.

## Testing

Run tests with:

```bash
npm test
```