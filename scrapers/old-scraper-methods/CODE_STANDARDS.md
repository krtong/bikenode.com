# Scraper Development Code Standards

## Core Philosophy: "Study First, Scrape Second"

**Never make assumptions about website structure. Always scout and understand before coding.**

## 🔍 Discovery-First Development Process

### 1. **Always Scout Before Scraping**
```bash
# REQUIRED: Run DOM Scout before writing any scraper
npm run scout -- --url "https://example.com" --depth 3

# Study the report before writing a single line of scraper code
cat scout-reports/example-com/recommendations.md
```

### 2. **Preserve Raw Data for Study**
```
project/
├── scout-reports/          # ALWAYS commit these
│   └── example-com/
│       ├── metadata.json
│       ├── selectors.json
│       ├── patterns.json
│       ├── recommendations.md
│       └── raw/           # Raw HTML/JSON for offline study
│           ├── pages/
│           └── api/
└── scrapers/
    └── example/
        ├── scout.js       # Scout configuration
        ├── scraper.js     # Actual scraper
        └── test-data/     # Sample extractions
```

### 3. **Document Your Discoveries**
Every scraper MUST have:
- `DISCOVERY.md` - What you learned about the site
- `scout-report/` - Raw scout data
- `test-data/` - Example extractions

## 📋 Mandatory Scout File

Every scraper directory MUST contain a `scout.js` file:

```javascript
// scrapers/example/scout.js
const { DOMScout } = require('../../dom-scout');

module.exports = {
  // Scout configuration
  config: {
    baseUrl: 'https://example.com',
    depth: 3,
    patterns: ['product', 'item', 'listing'],
    followPatterns: ['product-detail', 'item']
  },
  
  // Expected selectors (from scout report)
  selectors: {
    title: '.product-title',       // 95% confidence
    price: '.price-now',          // 89% confidence
    description: '.item-details'   // 78% confidence
  },
  
  // Known patterns
  patterns: {
    listing: '.products-grid > article',
    pagination: 'a[href*="page="]',
    api: '/api/products?page='
  },
  
  // Last scouted
  lastScouted: '2024-01-15T10:30:00Z',
  
  // Notes
  notes: [
    'Site uses React - wait for dynamic content',
    'API requires auth token from cookies',
    'Pagination limited to 50 pages'
  ]
};
```

## 🚫 Forbidden Practices

### 1. **Never Hardcode Selectors Without Scouting**
```javascript
// ❌ FORBIDDEN - No evidence these selectors exist
const SELECTORS = {
  title: 'h1.product-name',
  price: '.cost'
};

// ✅ CORRECT - Selectors from scout report
const { selectors } = require('./scout');
```

### 2. **Never Assume Site Structure**
```javascript
// ❌ FORBIDDEN - Assuming structure
const products = $('.product-list .item');

// ✅ CORRECT - Use discovered patterns
const { patterns } = require('./scout');
const products = $(patterns.listing);
```

### 3. **Never Skip Error Handling for Missing Elements**
```javascript
// ❌ FORBIDDEN - Assumes element exists
const price = $('.price').text();

// ✅ CORRECT - Handle missing elements
const priceElement = $('.price');
const price = priceElement.length > 0 ? priceElement.text() : null;
```

## 📊 Required Scraper Structure

```javascript
// scrapers/example/scraper.js

const { selectors, patterns, config } = require('./scout');
const { validateScrapedData } = require('../shared/validation');

class ExampleScraper {
  constructor() {
    // Load scout configuration
    this.scout = require('./scout');
    this.lastScouted = new Date(this.scout.lastScouted);
    
    // Warn if scout data is old
    const daysSinceScouted = (Date.now() - this.lastScouted) / (1000 * 60 * 60 * 24);
    if (daysSinceScouted > 30) {
      console.warn(`⚠️  Scout data is ${Math.round(daysSinceScouted)} days old. Re-scout recommended.`);
    }
  }
  
  async scrape(url) {
    // 1. Always check if selectors still work
    const testResult = await this.testSelectors(url);
    if (testResult.failed.length > 0) {
      console.error('❌ Selectors have changed:', testResult.failed);
      console.log('🔍 Re-run scout to update selectors');
      return { error: 'SELECTORS_CHANGED', failed: testResult.failed };
    }
    
    // 2. Proceed with scraping using validated selectors
    // ...
  }
  
  async testSelectors(url) {
    // Test each selector before using
    // ...
  }
}
```

## 🧪 Testing Requirements

### 1. **Selector Drift Detection**
```javascript
// Run daily to detect when sites change
npm run test:selector-drift
```

### 2. **Sample Data Validation**
```javascript
// All scrapers must pass validation
const { validateNoFakeData } = require('../shared/validation');

test('scraped data is real', async () => {
  const data = await scraper.scrape(testUrl);
  expect(() => validateNoFakeData(data)).not.toThrow();
});
```

## 📈 Continuous Discovery

### 1. **Schedule Regular Re-Scouting**
```yaml
# .github/workflows/scout-drift.yml
- cron: '0 0 * * 0'  # Weekly
  run: npm run scout:all
```

### 2. **Monitor Selector Performance**
```javascript
// Track selector success rates
const metrics = {
  selector: '.product-title',
  attempts: 1000,
  successes: 950,
  successRate: 0.95,
  lastSuccess: '2024-01-15T10:30:00Z',
  lastFailure: '2024-01-14T08:22:00Z'
};
```

## 🎯 Best Practices

### 1. **Progressive Enhancement**
```javascript
// Start with most reliable selectors
const title = $(scout.selectors.title).text() ||
              $(scout.fallbackSelectors.title).text() ||
              $('h1').first().text();
```

### 2. **Confidence-Based Selection**
```javascript
// Use selectors based on confidence scores
const getSelector = (type) => {
  const candidates = scout.selectors[type];
  return candidates.find(s => s.confidence > 0.8)?.selector;
};
```

### 3. **Adaptive Scraping**
```javascript
// Detect and adapt to site changes
if (!$(scout.selectors.price).length) {
  console.log('🔄 Price selector failed, re-discovering...');
  const newSelector = await discoverSelector(page, 'price');
  await updateScoutFile({ price: newSelector });
}
```

## 📝 Documentation Requirements

Every scraper MUST include:

### `DISCOVERY.md`
```markdown
# Discovery Report for Example.com

## Scout Summary
- Last scouted: 2024-01-15
- Pages analyzed: 47
- Confidence level: High (>90% selector reliability)

## Key Findings
1. Site uses server-side rendering (no JS required)
2. Consistent CSS class naming: `.product-*` pattern
3. API endpoint found: `/api/products`

## Reliable Selectors
- Title: `h1.product-title` (98% confidence)
- Price: `.price-current` (95% confidence)

## Edge Cases
- Sale items have different price structure
- Some products have variants in dropdown

## Recommended Approach
1. Use API for listing pages
2. Scrape HTML for detailed specs
3. Check for `.sale-price` before `.regular-price`
```

## 🚀 Getting Started with New Scraper

```bash
# 1. Scout the website
npm run scout -- --url "https://newsite.com" --depth 3

# 2. Review the report
cat scout-reports/newsite-com/recommendations.md

# 3. Create scraper from template
npm run create-scraper -- --name newsite --scout-report ./scout-reports/newsite-com

# 4. Test with discovered selectors
npm run test:scraper -- --name newsite

# 5. Document your findings
echo "# Discovery Report" > scrapers/newsite/DISCOVERY.md
```

## Remember

> "A scraper without scouting is like sailing without a map. You might reach your destination, but you'll likely get lost when the winds change."

**Always leave room for discovery. If you don't know something, study it first.**