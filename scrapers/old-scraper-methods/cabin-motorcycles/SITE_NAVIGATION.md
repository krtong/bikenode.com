# Site Navigation Scraping

## Overview

The site navigation feature discovers and follows links throughout a website to find all model pages dynamically. This is crucial for websites where model information is spread across multiple pages or where the site structure changes over time.

## How It Works

### 1. Navigation Discovery
- Starts from homepage and analyzes navigation structure
- Identifies menus, navigation bars, and link patterns
- Builds a map of the site structure

### 2. Model Page Detection
- Uses pattern matching to identify model-related pages
- Looks for keywords like "models", "products", "monotracer", etc.
- Tracks context around links to understand their purpose

### 3. Recursive Exploration
- Visits each discovered page up to a configurable depth
- Extracts data using adaptive scraping on each page
- Discovers additional links from model pages
- Prevents revisiting the same URL

### 4. Data Consolidation
- Combines data from all discovered pages
- Deduplicates models found on multiple pages
- Enhances data with cross-referenced information

## Usage

### Basic Navigation
```javascript
const PeravesSiteNavigator = require('./peraves/site-navigator');

const navigator = new PeravesSiteNavigator({
  maxDepth: 3,      // How deep to follow links
  debug: true       // Save navigation reports
});

const results = await navigator.navigate();
console.log(`Found ${results.models.length} models from ${results.urls_discovered.length} pages`);
```

### Full Scraping with Navigation
```javascript
const { scrapePeravesFull } = require('./peraves/full-scraper');

const results = await scrapePeravesFull({
  navigate: true,   // Enable site navigation
  debug: true,      // Save detailed reports
  maxDepth: 2       // Navigation depth
});

// Results include models from both navigation and adaptive scraping
console.log(`Total models: ${results.models.length}`);
console.log(`Confidence: ${results.metadata.confidence_score}%`);
```

### Running Tests
```bash
# Test navigation capabilities
npm run test:navigation

# Run full Peraves scraping with navigation
npm run scrape:peraves:full
```

## Key Features

### 1. Smart Link Following
- Identifies model-related links using patterns
- Understands link context (menu items vs. content links)
- Respects site boundaries (only follows internal links)

### 2. Depth Control
- Configurable maximum depth to prevent endless crawling
- Follows sub-pages like specifications, galleries, etc.
- Rate limiting to be respectful to servers

### 3. Model Detection
- Validates discovered data to ensure it's a real model
- Checks for Peraves-specific keywords
- Normalizes model names across different pages

### 4. Comprehensive Reporting
- Navigation map showing site structure
- List of all discovered URLs
- Model distribution and sources
- Confidence scoring based on multiple factors

## Navigation Report

After running with `debug: true`, check the navigation report:
```
debug/navigation/peraves-navigation-report.json
```

This contains:
- Complete navigation map
- All discovered URLs
- Models found on each page
- Errors encountered
- Timing information

## Full Scraping Report

The full scraper generates comprehensive reports:
```
debug/reports/peraves-full-report.json   # Detailed JSON report
debug/reports/peraves-models.csv         # Simplified CSV for analysis
```

## Model Enhancement

The full scraper enhances models with:
- **Model Family**: Automatically determined (Ecomobile, MonoTracer, etc.)
- **Year Estimation**: For models without explicit years
- **Completeness Score**: How complete the model data is
- **Data Quality**: Number of sources, presence of specs, etc.

## Advantages

1. **Discovers Hidden Pages**: Finds model pages not linked from homepage
2. **Adapts to Changes**: Works even when site structure changes
3. **Complete Coverage**: Ensures no models are missed
4. **Cross-Validation**: Data from multiple pages increases confidence
5. **Historical Data**: Can find archived or legacy model pages

## Configuration Options

```javascript
{
  navigate: true,      // Enable navigation (default: true)
  maxDepth: 3,        // Maximum link depth (default: 3)
  debug: false,       // Save debug reports (default: false)
  rateLimit: 2000,    // Delay between requests in ms
  timeout: 30000,     // Page load timeout
  maxPages: 50        // Maximum pages to visit
}
```

## Best Practices

1. **Start with Lower Depth**: Use maxDepth=2 for initial exploration
2. **Enable Debug Mode**: Helps understand what was discovered
3. **Review Reports**: Check navigation maps to understand site structure
4. **Monitor Performance**: Navigation can be slow on large sites
5. **Respect Robots.txt**: Ensure scraping is allowed

## Troubleshooting

### No Models Found
1. Check navigation report for discovered URLs
2. Verify model detection patterns match site content
3. Try increasing maxDepth
4. Check for JavaScript-rendered content

### Slow Performance
1. Reduce maxDepth
2. Increase rate limiting delay
3. Use navigation selectively on complex sites

### Too Many Irrelevant Pages
1. Refine model detection patterns
2. Add URL filters to skip irrelevant sections
3. Focus on specific site sections