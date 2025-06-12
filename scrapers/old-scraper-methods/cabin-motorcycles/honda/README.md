# Honda Gyro Canopy Scraper

Scrapes data for Honda's Gyro Canopy three-wheeled delivery vehicle.

## Overview

The Honda Gyro Canopy is a three-wheeled scooter with roof protection used for delivery services. All specifications and model details must be discovered through DOM Scout data collection.

## Scout Requirements

Before running this scraper:
1. Run DOM Scout on Honda sources
2. Analyze collected data for model information
3. Update scout.js with verified selectors
4. Document findings in DISCOVERY.md

## Data Sources to Scout

URLs that need to be scouted for Honda Gyro data:
1. Honda Japan official website
2. Japanese Wikipedia pages
3. Global Honda sites
4. Motorcycle specification databases

See `scout.js` for specific URLs to investigate.

## Running the Scraper

```bash
# First, scout the websites
npm run scout:honda

# Then run the scraper
npm run scrape:honda
```

## Note on Japanese Sources

Many sources are in Japanese. The scout will collect the raw data, and human analysis will determine what can be extracted. No specifications should be hardcoded based on assumptions.

## Usage

```bash
npm run scrape:honda
```

## Notes

- The Gyro Canopy represents a unique solution to urban delivery challenges
- Its continuous 30+ year production run demonstrates its effectiveness
- The design has remained largely unchanged, proving its functional success
- No direct competitors have matched its market dominance in Japan