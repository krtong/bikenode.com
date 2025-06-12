# Web Scraping Design Principles & Rules

## Core Philosophy

**"Collect everything. Assume nothing. Let humans analyze."**

Our scraping approach follows a pure data collection philosophy that makes ZERO assumptions about any website structure or content.

## Fundamental Principles

### 1. Pure Data Collection
- Scrapers should act as neutral observers that record what exists without interpretation
- Download and preserve raw website data exactly as it appears
- Never modify, filter, or categorize content during collection

### 2. No Assumptions
- Don't assume what constitutes a "product", "price", "title", or any other semantic element
- Don't assume any website structure or organization
- Don't categorize pages or content types
- Don't filter content based on perceived relevance

### 3. Human-First Analysis
- Humans analyze collected data to discover patterns
- Scrapers don't make decisions about what's important
- Pattern detection and selector identification happen after collection, not during

## Implementation Rules

### ✅ ALLOWED Practices

```javascript
// Pure data collection
const html = await page.content();
const url = page.url();
const timestamp = new Date().toISOString();

// Collecting all elements without discrimination
const allElements = Array.from(document.querySelectorAll('*'));
const allLinks = Array.from(document.querySelectorAll('a[href]')).map(a => a.href);

// Saving raw data
await fs.writeFile(`raw/${hash}.html`, html);

// Following links based only on depth/domain rules
if (currentDepth < maxDepth) {
  for (const link of allLinks) {
    queue.push({ url: link, depth: currentDepth + 1 });
  }
}
```

### 🚫 FORBIDDEN Practices

```javascript
// ❌ Looking for specific elements
const products = $('.product');
const prices = $('[class*="price"]');

// ❌ Making assumptions about structure
if (page.includes('product')) { ... }
if (className.includes('item')) { ... }

// ❌ Categorizing or interpreting
const pageType = detectPageType(html);
const isProductPage = checkIfProduct(url);

// ❌ Filtering content
const relevantElements = filterImportant(elements);
const mainContent = extractMainContent(html);

// ❌ Pattern matching during collection
const patterns = findCommonPatterns(pages);
const selectors = recommendSelectors(elements);

// ❌ Any hardcoded selectors
const SELECTORS = {
  title: 'h1',
  price: '.price',
  description: '.desc'
};
```

## Scraping Workflow

### Phase 1: Discovery & Collection
1. Run a pure data collector on the target website
2. Download all HTML, CSS, JavaScript, and assets
3. Record all elements, classes, IDs, and attributes
4. Save everything without filtering or interpretation

### Phase 2: Human Analysis
1. Manually examine the collected raw data
2. Identify patterns and structures in the HTML
3. Document findings with evidence from actual data
4. Note working selectors and their reliability

### Phase 3: Implementation
1. Create scrapers based on documented evidence
2. Use only selectors verified from collected data
3. Include references to where patterns were found
4. Test against saved raw data before live deployment

## Data Storage Structure

```
scraped-data/
└── [domain]/
    └── [timestamp]/
        ├── manifest.json          # Collection metadata
        ├── raw/
        │   ├── pages/            # Complete HTML files
        │   ├── css/              # Stylesheets
        │   ├── json/             # API responses
        │   └── assets/           # Images, etc.
        ├── metadata/
        │   ├── urls.json         # All URLs visited
        │   ├── elements.json     # Element census
        │   └── links.json        # Link graph
        └── analysis/
            ├── patterns.md       # Human-written analysis
            └── selectors.json    # Verified selectors
```

## Why These Principles Matter

1. **Resilience**: When websites change, we have exact historical data for comparison
2. **Completeness**: No blind spots from preconceived notions about what's important
3. **Flexibility**: Same collected data can support different analysis needs
4. **Debugging**: When scrapers break, we can see exactly what changed
5. **Evidence-Based**: Every scraper decision is backed by real data, not assumptions

## Implementation Checklist

Before deploying any scraper, verify:

- [ ] NO hardcoded assumptions about content types
- [ ] NO pattern matching during data collection
- [ ] NO content filtering based on perceived relevance
- [ ] NO categorization of pages or elements
- [ ] NO interpretation of data during collection
- [ ] ALL selectors are documented with evidence
- [ ] ALL patterns are discovered from real data
- [ ] Raw data is preserved for future reference

## Remember

> "A scraper's job is to be a perfect recording device, not a smart analyzer. It's a camera, not a detective."

The intelligence comes from human analysis of collected data, not from the scraper trying to be clever during collection.