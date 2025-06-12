# RevZilla Scraper Code Standards

## STRICTLY PROHIBITED CODE PATTERNS

The following patterns are **BANNED** from this codebase. Any code containing these patterns will be rejected:

### 1. NO MOCK/FAKE DATA
❌ **FORBIDDEN:**
```javascript
// Creating fake product data
const mockProducts = [
  { name: 'Test Helmet', price: '$299' },
  { name: 'Sample Jacket', price: '$399' }
];

// Generating placeholder images
createPlaceholderImage('helmet.svg');
```

✅ **REQUIRED:** Only use real data scraped from actual websites.

### 2. NO HARDCODED ASSUMPTIONS
❌ **FORBIDDEN:**
```javascript
// Hardcoded brand lists
const commonBrands = ['Arai', 'Shoei', 'AGV', 'HJC'];

// Arbitrary price ranges
if (price > 50 && price < 5000) { }

// Assumed selectors
const products = $('.product-index-item'); // Never tested
```

✅ **REQUIRED:** 
- Extract brands dynamically from the page
- Use minimal filtering (e.g., price > 0)
- Only use selectors that have been verified to work

### 3. NO PLACEHOLDER/TODO CODE
❌ **FORBIDDEN:**
```javascript
// TODO: Implement this later
const productDetails = null;

// Placeholder function
async function scrapeDetails() {
  console.log('Not implemented yet');
  return null;
}
```

✅ **REQUIRED:** Only commit working code. If something isn't working, don't include it.

### 4. NO ARBITRARY LIMITS
❌ **FORBIDDEN:**
```javascript
// Random limits
features = features.slice(0, 15);
images = images.slice(0, 10);
```

✅ **REQUIRED:** 
- Remove duplicates but keep all data
- If limits are needed, make them configurable parameters

### 5. NO NAVIGATION AS FEATURES
❌ **FORBIDDEN:**
```javascript
features: [
  "Helmet Finder",
  "Shop All Accessories",
  "Browse Categories"
]
```

✅ **REQUIRED:** Properly filter out navigation elements. Features should be actual product features.

### 6. NO HARDCODED CREDENTIALS
❌ **FORBIDDEN:**
```javascript
const dbConfig = {
  host: 'localhost',
  user: 'postgres',
  password: 'postgres'
};
```

✅ **REQUIRED:** Use environment variables exclusively. No defaults.

## REQUIRED: DISCOVERY FIRST APPROACH

Before writing ANY scraper, you MUST first explore and document the website structure:

### 1. Create a Scout File
Every scraper project MUST have a scout file (e.g., `revzilla_scout.js`) that:
- Visits the target pages and saves raw HTML
- Tests potential selectors and documents what works
- Identifies patterns and variations
- Saves examples for offline study

### 2. Save Raw Samples
Create a discovery folder structure:
```
project_data/
└── discovery/
    ├── raw_html/          # Complete page HTML samples
    ├── selectors.json     # Tested and verified selectors
    ├── patterns.md        # Documented patterns and findings
    └── test_results/      # Results from selector testing
```

### 3. Study Before Coding
- Analyze saved HTML samples offline
- Test selectors on multiple examples
- Document variations and edge cases
- NEVER assume a selector works without testing

### 4. No Assumptions Rule
❌ **FORBIDDEN:**
```javascript
// Assuming product cards use a common class
const products = document.querySelectorAll('.product-card');
```

✅ **REQUIRED:**
```javascript
// Only use selectors verified by scout
// Reference: discovery/selectors.json - tested on 50+ pages
const products = document.querySelectorAll('.product-tile');
```

## REQUIRED PRACTICES

### 1. Test Before Committing
- Run your code and verify it actually works
- Don't commit code you haven't tested
- Include only selectors that successfully extract data

### 2. Use Real Data
- Test with actual URLs from the target website
- Verify extracted data makes sense
- Don't create synthetic test data

### 3. Document What Works
- Clearly state which selectors are verified
- Note which data points can be successfully extracted
- Don't claim features that don't work

### 4. Handle Failures Gracefully
```javascript
// Good: Return empty/null for missing data
const brand = brandElement?.textContent?.trim() || null;

// Bad: Make up data or use placeholders
const brand = brandElement?.textContent || 'Unknown Brand';
```

### 5. Be Honest About Limitations
- If something doesn't work, say so in comments
- Don't hide failures with fake data
- Document what needs to be fixed

## VERIFICATION CHECKLIST

Before committing any scraper code, verify:

- [ ] No mock/fake data anywhere
- [ ] No hardcoded lists or assumptions
- [ ] No TODO/placeholder functions
- [ ] No arbitrary limits on data
- [ ] No navigation items in product features
- [ ] No hardcoded credentials
- [ ] Code has been tested with real URLs
- [ ] Extracted data is from actual scraping
- [ ] All selectors have been verified to work
- [ ] Failures return null/empty, not fake data

## CONSEQUENCES

Code containing any of the forbidden patterns will be:
1. Immediately flagged in code review
2. Required to be rewritten before merging
3. Documented as technical debt if accidentally merged

## PHILOSOPHY

**"Real data or no data"** - If we can't scrape it, we don't fake it.