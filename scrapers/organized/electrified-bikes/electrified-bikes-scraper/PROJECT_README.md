# Electrified Bikes Scraper

Web scraping system for collecting real specifications of electrified bikes from manufacturer websites.

## Overview

This project scrapes actual specification data for 24 electrified bike brands. All data comes from real websites - no made-up information.

## Quick Start

```bash
# Install dependencies
npm install

# Run a specific scraper
npm run scrape:segway

# Run all scrapers
npm run scrape:all
```

## Architecture

```
scrapers/
├── base-scraper.js         # Base class with common functionality
├── segway-scraper.js       # Segway specific scraper
├── surron-scraper.js       # Sur-Ron specific scraper
├── rawrr-scraper.js        # Rawrr specific scraper
├── smart-scraper.js        # Advanced scraper with multiple strategies
└── run-all-scrapers.js     # Master runner

data/
├── raw/                    # Raw scraped data by brand
├── final/                  # Consolidated database
└── reports/                # Scraping reports

tools/
├── validate-urls.js        # URL validation tool
└── source-validator.js     # Source verification
```

## Scraped Data Fields

- **model**: Bike model name
- **year**: Model year
- **specs**:
  - motor_power: Motor wattage (e.g., "5000W")
  - battery: Battery specs (e.g., "72V 40Ah")
  - top_speed: Maximum speed (e.g., "45 mph")
  - range: Distance range (e.g., "60-80 miles")
  - weight: Bike weight (e.g., "110 lbs")
- **url**: Source URL
- **images**: Product images
- **source**: Data source attribution

## Verified Working Sites

| Brand | URL | Status |
|-------|-----|--------|
| Segway | store.segway.com | ✅ Extracting specs |
| Sur-Ron | sur-ronusa.com | ✅ Valid |
| Rawrr | riderawrr.com | ✅ Valid |
| Zero Motorcycles | zeromotorcycles.com | ✅ Valid |
| Cake | ridecake.com | ✅ Valid |
| Stark Future | starkfuture.com | ✅ Valid |
| Qulbix | qulbix.com | ✅ Valid |

## Example Output

```json
{
  "brand": "Segway",
  "models": [
    {
      "model": "eBike Xyber",
      "year": 2025,
      "specs": {
        "motor_power": "65W",
        "top_speed": "20mph",
        "range": "112 miles"
      },
      "url": "https://store.segway.com/segway-ebike-xyber",
      "images": [],
      "source": "Segway Official"
    }
  ]
}
```

## Development

### Adding a New Scraper

1. Create `scrapers/[brand]-scraper.js`
2. Extend the `BaseScraper` class
3. Implement the `scrape()` method
4. Add to `package.json` scripts

### Testing

```bash
# Validate URLs
node tools/validate-urls.js

# Test individual scraper
node scrapers/segway-scraper.js

# Debug mode
node scrapers/debug-scraper.js
```

## Important Notes

- **No Fake Data**: All specifications come from actual websites
- **Rate Limiting**: 5-second delays between brands
- **Error Handling**: Failed scrapes are logged but don't stop execution
- **Source Attribution**: Every data point tracks its source

## Known Issues

- Many sites have Cloudflare protection (403 errors)
- Some domains from initial research are incorrect
- Dynamic content requires wait strategies
- Modal/popup systems hide product information

## Contributing

1. Only add real data from verified sources
2. Test scrapers before committing
3. Update documentation for new brands
4. Maintain source attribution