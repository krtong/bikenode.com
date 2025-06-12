# BMW C1 Scraper

Scrapes data for BMW's C1 cabin scooter.

## Overview

The BMW C1 was a semi-enclosed scooter with safety features. All specifications and model details must be discovered through DOM Scout data collection.

## Scout Requirements

Before running this scraper:
1. Run DOM Scout on BMW C1 sources
2. Analyze collected data for model information
3. Update scout.js with verified selectors
4. Document findings in DISCOVERY.md

## Data Sources to Scout

URLs that need to be scouted for BMW C1 data:
1. Wikipedia pages (multiple languages)
2. Archive.org snapshots of BMW Motorrad
3. Motorcycle specification databases

See `scout.js` for specific URLs to investigate.

## Running the Scraper

```bash
# First, scout the websites
npm run scout:bmw

# Then run the scraper
npm run scrape:bmw
```

## Note on Historical Data

The C1 is a discontinued model. All data must come from web sources - no hardcoded specifications are allowed. The scraper will return empty results if web sources are unavailable.

## Usage

```bash
npm run scrape:bmw
```

## Notes

- The C1 was ahead of its time but struggled with market acceptance
- Despite innovative safety features, riders preferred traditional scooters
- Became a cult classic among urban commuters
- Influenced later cabin motorcycle designs