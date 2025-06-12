# Lit Motors C-1 Scraper

Scrapes data for Lit Motors' self-balancing enclosed electric motorcycle project.

## Overview

The Lit Motors C-1 is a fully-enclosed electric motorcycle concept. All specifications and development details must be discovered through DOM Scout data collection.

## Scout Requirements

Before running this scraper:
1. Run DOM Scout on Lit Motors sources
2. Analyze collected data for project information
3. Update scout.js with verified selectors
4. Document findings in DISCOVERY.md

## Data Sources to Scout

URLs that need to be scouted for Lit Motors data:
1. Official Lit Motors website
2. Wikipedia pages
3. Tech news coverage
4. Company databases (Crunchbase, etc.)

See `scout.js` for specific URLs to investigate.

## Running the Scraper

```bash
# First, scout the websites
npm run scout:lit

# Then run the scraper
npm run scrape:lit
```

## Note on Development Status

As a startup project, information availability varies. The scraper will only return data found on actual websites - no assumptions or projections are made.

## Usage

```bash
npm run scrape:lit
```

## Future Outlook

The C-1 represents a bold vision for urban transportation, combining:
- Zero emissions
- Minimal footprint
- Maximum safety
- Weather independence

While production has been delayed, the technology remains promising and development continues. The success of the C-1 could revolutionize urban commuting by offering a vehicle that combines the best aspects of cars and motorcycles.