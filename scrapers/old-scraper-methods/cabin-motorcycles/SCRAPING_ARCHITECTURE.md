# Cabin Motorcycles Scraping Architecture

## Overview

This scraping system follows the DOM Scout philosophy: "Collect everything. Assume nothing. Let humans analyze." We use pure data collection without making any assumptions about website structure.

## Key Principles

1. **No Hardcoded Data**: All data must come from real web sources - no pre-defined models, years, or specifications.
2. **Scout First, Scrape Second**: Use DOM Scout to collect raw website data before writing any scraper code.
3. **Zero Assumptions**: Never assume website structure, selectors, or data patterns.
4. **Evidence-Based Selectors**: Only use selectors discovered through actual data collection.
5. **Pure Data Preservation**: Save all raw HTML/CSS/JSON for offline analysis.

## Architecture Components

### 1. DOM Scout (Primary Tool)
- Collects complete HTML, CSS, and JavaScript data
- Makes ZERO assumptions about website structure
- Saves everything for human analysis
- Located at: `/scrapers/dom-scout/`

### 2. Scout Files (`*/scout.js`)
Each manufacturer must have a scout.js file containing:
- URLs to investigate
- Last scouted timestamp
- Discovered selectors (after human analysis)
- No hardcoded assumptions

### 3. Discovery Documentation (`*/DISCOVERY.md`)
Required for each manufacturer:
- Scout findings
- Reliable selectors found
- Data collection challenges
- Evidence for all decisions

### 4. Data Flow

```
DOM Scout Collection → Human Analysis → Scout Configuration → Evidence-Based Scraping
         ↓                    ↓                   ↓                      ↓
    Raw HTML/CSS        DISCOVERY.md         scout.js            Real Scrapers
```

## Running the System

### 1. Scout Websites First (REQUIRED)
```bash
# Scout each manufacturer's websites
npm run scout:bmw
npm run scout:honda
npm run scout:peraves
npm run scout:lit
```
This creates raw data collections in `scout-reports/` containing:
- Complete HTML files
- All CSS styles
- Element census (tags, classes, IDs)
- Zero interpretation or assumptions

### 2. Analyze Scout Data (MANUAL PROCESS)
```bash
# Review collected data
cat scout-reports/bmw/latest/census/elements.json
grep -r "C1" scout-reports/bmw/latest/raw/

# Document findings
vim bmw/DISCOVERY.md
```

### 3. Update Scout Configuration
Based on evidence from scout data:
```javascript
// bmw/scout.js
module.exports = {
  selectors: {
    // Only selectors you've verified exist in the data
    title: 'h1.page-title',  // Found in 15 pages
    specs: 'table.specifications'  // Found in 3 pages
  }
};
```

### 4. Run Evidence-Based Scrapers
```bash
npm run scrape:all
```
Scrapers will:
- Use only selectors from scout.js
- Return empty results if selectors fail
- Never generate or assume data

## Manufacturer-Specific URLs to Scout

### Peraves
- Official: www.peravescz.com
- Wikipedia: en.wikipedia.org/wiki/Peraves
- Wikipedia: en.wikipedia.org/wiki/Ecomobile

### BMW C1
- Wikipedia EN: en.wikipedia.org/wiki/BMW_C1
- Wikipedia DE: de.wikipedia.org/wiki/BMW_C1
- Archive.org: web.archive.org/web/*/bmw-motorrad.com/c1

### Honda Gyro
- Honda Japan: honda.co.jp
- Wikipedia JP: ja.wikipedia.org/wiki/ジャイロキャノピー
- Global Honda: powersports.honda.com

### Lit Motors
- Official: litmotors.com
- Wikipedia: en.wikipedia.org/wiki/Lit_Motors
- Tech coverage: Search news sites

## Required Files Per Manufacturer

```
manufacturer/
├── scout.js          # Scout configuration (REQUIRED)
├── DISCOVERY.md      # Human analysis findings (REQUIRED)
├── scraper.js        # Evidence-based scraper
└── README.md         # No hardcoded specs allowed
```

## Troubleshooting

### No Scout Data
1. Run DOM Scout first: `npm run scout:[manufacturer]`
2. Check `scout-reports/[manufacturer]/latest/`
3. Ensure URLs are accessible

### Selectors Not Working
1. Re-run DOM Scout to get fresh data
2. Manually verify selectors exist in raw HTML
3. Update scout.js with correct selectors
4. Never guess or assume selectors

### Adding New Manufacturers
1. Create directory structure
2. Add URLs to scout
3. Run DOM Scout
4. Analyze raw data
5. Document findings
6. Create evidence-based scraper

## BANNED Practices

❌ **NEVER DO**:
- Hardcode model years or variants
- Assume website structure
- Use pattern detection
- Generate placeholder data
- Skip the scout phase

✅ **ALWAYS DO**:
- Run DOM Scout first
- Analyze raw data manually
- Document evidence in DISCOVERY.md
- Use only verified selectors
- Return empty results when no data found