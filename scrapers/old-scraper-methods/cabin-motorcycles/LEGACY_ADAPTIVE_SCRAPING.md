# ⚠️ DEPRECATED - Legacy Adaptive Scraping System

**This approach has been deprecated in favor of the DOM Scout philosophy.**

## Why This Was Deprecated

The adaptive scraping system violated core principles by:
- Making assumptions about website patterns
- Trying to be "smart" about structure detection
- Categorizing and interpreting content
- Saving "successful patterns" (assuming structure)

## What to Use Instead

### DOM Scout Philosophy
"Collect everything. Assume nothing. Let humans analyze."

### New Process
1. **Run DOM Scout** to collect raw website data
2. **Manually analyze** the collected HTML/CSS/JSON
3. **Document findings** in DISCOVERY.md
4. **Create evidence-based scrapers** using verified selectors

### Migration Guide
If you have existing adaptive scrapers:
1. Run DOM Scout on the target websites
2. Study the raw data collected
3. Create scout.js with verified selectors
4. Rewrite scraper to use scout configuration
5. Remove all pattern detection logic

## Original Documentation
The original adaptive scraping documentation has been preserved below for historical reference only. Do not use this approach for new scrapers.

---

# Adaptive Scraping System (DEPRECATED)

[Original content preserved for reference...]# Adaptive Scraping System

## Overview

The adaptive scraping system analyzes website structures before scraping, then dynamically adjusts its extraction strategy based on what it finds. This approach is more robust than hardcoded selectors and adapts to website changes.

## How It Works

### 1. Website Analysis Phase
- Analyzes DOM structure to understand layout
- Identifies patterns (containers, classes, structured data)
- Generates scraping recommendations
- Saves successful patterns for reuse

### 2. Strategy Selection
The system chooses from multiple strategies in priority order:

1. **Profile-based**: Uses previously successful patterns
2. **Structured Data**: Extracts JSON-LD structured data
3. **Container-based**: Uses identified container patterns
4. **Pattern-based**: Uses detected class/element patterns
5. **Generic**: Fallback text pattern matching

### 3. Data Extraction
- Executes chosen strategy
- Normalizes extracted data
- Enhances with additional processing
- Validates and deduplicates results

## Usage

### Basic Adaptive Scraping
```javascript
const AdaptiveScraper = require('./shared/adaptive-scraper');

const scraper = new AdaptiveScraper({
  analyzeFirst: true,  // Always analyze before scraping
  useProfiles: true,   // Save/load successful patterns
  saveHTML: true       // Save HTML for debugging
});

const result = await scraper.scrape('https://example.com', {
  javascript: true,    // Use Puppeteer for JS sites
  enhance: true        // Post-process data
});

console.log(`Strategy used: ${result.metadata.strategy}`);
console.log(`Items found: ${result.data.length}`);
```

### Manufacturer-Specific Adaptive Scraper
```javascript
const { scrapePeravesAdaptive } = require('./peraves/adaptive-scraper');

const results = await scrapePeravesAdaptive();
// Returns normalized data with metadata about sources
```

## Running Tests

### Test Adaptive System
```bash
npm run test:adaptive
```

This runs comprehensive tests showing:
- Direct adaptive scraping on single pages
- Full manufacturer scraping with multiple sources
- Strategy comparison across different sites

### Test Specific Manufacturer
```bash
npm run scrape:peraves:adaptive
```

## Key Features

### 1. Multi-Source Fallback
Each manufacturer scraper tries multiple sources:
- Official websites
- Wikipedia pages
- Archive.org snapshots
- Specialized databases

### 2. Scraping Profiles
Successful patterns are saved as profiles:
- Located in `scraping-profiles/`
- Reused for faster subsequent scraping
- Updated when patterns change

### 3. Strategy Adaptation
The system adapts based on what it finds:
- Structured data → Direct JSON extraction
- Container patterns → Element-based extraction
- No patterns → Text pattern matching

### 4. Data Normalization
All scraped data is normalized to standard format:
```javascript
{
  make: 'Manufacturer',
  model: 'Model Name',
  year: 2024,
  category: 'cabin',
  specifications: {
    source: 'wikipedia',
    subcategory: 'fully_enclosed',
    // ... other specs
  }
}
```

## Debugging

### Analysis Reports
After running analysis:
- Check `debug/analysis/` for detailed reports
- Review HTML structure analysis
- See recommended strategies

### Scraping Profiles
Successful patterns are saved:
- Check `scraping-profiles/` directory
- Each URL has a hashed profile file
- Contains selectors that worked

### Debug Output
The system provides detailed logging:
```
🔍 Analyzing website structure...
📌 Using strategy: structured-data
✅ Scraped 5 items
```

## Advantages Over Static Scraping

1. **Resilient to Changes**: Adapts when websites update
2. **No Hardcoded Selectors**: Discovers patterns dynamically
3. **Multi-Strategy**: Falls back through multiple approaches
4. **Learning System**: Saves successful patterns
5. **Source Transparency**: Clear about data origin

## Adding New Manufacturers

1. Create adaptive scraper class:
```javascript
class ManufacturerAdaptiveScraper {
  constructor() {
    this.adaptiveScraper = new AdaptiveScraper({
      profilesDir: './scraping-profiles/manufacturer'
    });
    
    this.sources = {
      official: 'https://manufacturer.com',
      wikipedia: 'https://en.wikipedia.org/wiki/Manufacturer'
    };
  }
  
  async scrape() {
    // Implement multi-source scraping
  }
}
```

2. Add normalization logic for manufacturer-specific data
3. Test with `npm run test:adaptive`

## Best Practices

1. **Always Analyze First**: Run website analysis before implementing scrapers
2. **Use Multiple Sources**: Don't rely on single website
3. **Monitor Success Rates**: Track which sources work
4. **Update Profiles**: Delete old profiles when sites change significantly
5. **Test Regularly**: Sites change, test scrapers periodically

## Troubleshooting

### No Data Found
1. Run analysis: `npm run analyze`
2. Check if site uses JavaScript rendering
3. Try with `javascript: true` option
4. Check for robots.txt blocking

### Wrong Strategy Selected
1. Delete existing profile to force re-analysis
2. Check analysis report for better selectors
3. Manually specify preferred selectors

### Performance Issues
1. Disable `analyzeFirst` after initial run
2. Use saved profiles for repeated scraping
3. Implement caching for static content