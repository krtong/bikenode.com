# 99Spokes.com Bike Data Scraper

This project contains scripts to scrape bicycle data from 99spokes.com using various approaches.

## Overview

The scrapers extract comprehensive data about bicycles including:
- Brand
- Model
- Year
- Price
- Category
- Detailed specifications
- Image URLs

## Available Scrapers

### 1. Standard AI-based Scraper (`99spokes_scraper.ts`)

This scraper uses Stage Hands' AI capabilities to:
- Navigate through bike listing pages
- Extract basic information from listing cards
- Visit individual bike detail pages
- Extract comprehensive specifications
- Save data at various checkpoints

### 2. Direct Scraper (`99spokes_direct_scraper.ts`)

This scraper uses a more direct approach:
- Analyzes page structure to identify key selectors
- Extracts data using specific instructions
- Falls back to AI extraction when needed
- Provides more detailed logging and error handling

### 3. JavaScript Scraper (`99spokes_scraper.js`)

A JavaScript version of the scraper that uses the Stage Hands API:
- Simpler implementation without TypeScript
- Uses the same AI-based extraction approach
- Provides similar functionality to the TypeScript version

### 4. Simple Puppeteer Scraper (`99spokes_simple.js`)

A direct scraper using Puppeteer:
- Uses CSS selectors to extract data
- No dependency on AI for extraction
- More reliable but less flexible
- Handles basic error scenarios

### 5. Cloudflare Bypass Scraper (`99spokes_cloudflare_bypass.js`)

A specialized scraper designed to bypass Cloudflare protection:
- Uses puppeteer-extra with stealth plugin
- Implements browser fingerprinting techniques
- Handles JavaScript challenges
- Includes delays to avoid triggering anti-bot measures
- Saves detailed logs and screenshots for debugging

### 6. Alternative Cloudflare Bypass (`99spokes_cloudflare_bypass_alt.js`)

A lightweight approach to bypass Cloudflare without browser automation:
- Uses curl with specific headers to mimic a real browser
- Implements multiple user agent fallbacks
- Parses HTML directly with regex patterns
- Works in environments where browser automation is not available
- Lower success rate but more compatible with restricted environments

### 7. Python Cloudscraper (`99spokes_cloudscraper.py`)

A Python-based solution using the cloudscraper library:
- Successfully bypasses Cloudflare protection
- Uses BeautifulSoup for HTML parsing
- Extracts bike specifications from detail pages
- Saves HTML content for debugging
- Most reliable approach for bypassing Cloudflare

## Setup and Usage

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

### Running the Scrapers

1. Run the standard AI-based scraper:
   ```bash
   npm run start:99spokes
   ```

2. Run the direct scraper:
   ```bash
   npm run start:99spokes:direct
   ```

3. Run the JavaScript scraper:
   ```bash
   npm run start:99spokes:js
   ```

4. Run the simple Puppeteer scraper:
   ```bash
   npm run start:99spokes:simple
   ```

5. Run the complete pipeline:
   ```bash
   npm run pipeline
   ```

6. Run the Cloudflare bypass scraper:
   ```bash
   npm run start:99spokes:cloudflare
   ```

7. Run the alternative Cloudflare bypass:
   ```bash
   npm run start:99spokes:cloudflare:alt
   ```

8. Run the Python cloudscraper:
   ```bash
   npm run start:99spokes:cloudscraper
   ```

9. Process the scraped data:
   ```bash
   npm run process:bikes
   ```

## Output

The scrapers generate several types of output:

1. **JSON Data Files**:
   - Complete dataset: `./data/99spokes_bikes_[timestamp].json`
   - Individual bike data: `./checkpoints/bike_[brand]_[model]_[timestamp].json`
   - Listing page data: `./checkpoints/bikes_listing_page_[page]_[timestamp].json`

2. **Screenshots**:
   - Listing pages: `./screenshots/bikes_page_[page].png`
   - Detail pages: `./screenshots/bike_detail_[page]_[i].png`
   - Error states: `./screenshots/error_*.png`

## Error Handling

Both scrapers implement robust error handling:
- Errors during page navigation are caught and logged
- Extraction failures trigger fallback mechanisms
- Screenshots are taken at error points for debugging
- Basic data is preserved even when detailed extraction fails

## Limitations

- The scrapers are limited to processing a small number of bikes for testing purposes
- Some bike specifications may not be extracted correctly if the website structure changes
- Rate limiting or IP blocking by 99spokes.com may affect the scraper's functionality
- 99spokes.com uses Cloudflare protection with JavaScript challenges that prevent simple HTTP requests
- A more advanced approach using browser automation with JavaScript challenge solving capabilities would be needed for successful scraping

## Future Improvements

- Implement proxy rotation to avoid IP blocking
- Add support for filtering bikes by category, brand, etc.
- Create a database schema for storing the extracted data
- Develop an incremental update mechanism to only scrape new or changed bikes
- Implement rate limiting to avoid overloading the target website
- Add support for distributed scraping across multiple machines
- Create a web interface for viewing and searching the scraped data
- Implement automatic data validation and cleaning
- Add support for comparing bikes across different websites
- Develop a notification system for price changes and new models

## Troubleshooting

### Common Issues

1. **Browser Launch Failures**
   - Ensure you have the necessary dependencies installed for Puppeteer
   - Try running with different browser options (e.g., `--no-sandbox`)
   - Check if you're running in a container environment that might restrict browser launching

2. **Extraction Failures**
   - Website structure may have changed; update selectors
   - Try using the AI-based approach as a fallback
   - Check screenshots in the `screenshots` directory for debugging

3. **Rate Limiting**
   - Implement delays between requests
   - Use rotating proxies
   - Consider reducing the number of pages and bikes to scrape

4. **TypeScript Errors**
   - Ensure type definitions are correct
   - Use type assertions where necessary
   - Check the `tsconfig.json` configuration

5. **Cloudflare Protection**
   - 99spokes.com uses Cloudflare protection with JavaScript challenges
   - Simple HTTP requests (like Axios) will receive a 403 Forbidden response
   - Browser automation tools like Puppeteer or Playwright may also be blocked
   - Consider using specialized tools like:
     - Puppeteer-extra with Stealth plugin
     - Playwright with extra headers and browser fingerprinting
     - Commercial services like ScrapingBee or Bright Data
   - Implement proper delays between requests to avoid triggering anti-bot measures