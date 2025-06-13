# RevZilla Scraper

> **⚠️ Scraping Principles**
> - No mock data or placeholders - work with real website data only
> - Don't make assumptions about site structure - discover and verify first
> - Document actual findings from real scraping attempts
> - Leave room for discovering edge cases and site changes
> - See core principles in [README_BEFORE_MAKING_ANY_PAGE.md] and [CODE_STANDARDS.md]

Working scraper for RevZilla.com product data.

## Key Discoveries

1. **Landing Pages vs Product Listings**
   - `/motorcycle-helmets` shows only ~15 featured products
   - Add `?view_all=true` to get full product listing (~96 products)

2. **Working Selectors**
   - Product container: `.product-tile`
   - Product name: `.product-tile__name`
   - Price: Extract from text using regex `/\$[\d,]+\.?\d*/`
   - Image: `img` element within tile

## Usage

### Discovery First (REQUIRED)

Before scraping, always run the scout to discover and verify selectors:

```bash
# Run scout to discover website structure
node revzilla_scout.js
```

This will create:
- `revzilla_data/discovery/raw_html/` - Raw HTML samples for study
- `revzilla_data/discovery/test_results/` - Selector test results
- `revzilla_data/discovery/selectors.json` - Verified selectors
- `revzilla_data/discovery/patterns.md` - Documented patterns

### Scraping

After discovery and verification:

```bash
# Scrape a category
node revzilla_scraper.js category motorcycle-helmets --pages=5 --csv

# Scrape sitemap for URLs
node revzilla_scraper.js sitemap --max=1000

# Scrape a batch of URLs
node revzilla_scraper.js batch urls_batch_1.json --csv

# Show help
node revzilla_scraper.js
```

## Output

Products are saved as JSON with structure:
```json
{
  "name": "Product Name",
  "price": "$299.99",
  "imageUrl": "https://...",
  "productUrl": "https://..."
}
```

## Files

- `revzilla_scout.js` - Discovery tool for exploring website structure (RUN FIRST)
- `revzilla_scraper.js` - Main unified scraper with all features
- `revzilla_db_integration.js` - Database integration for PostgreSQL
- `CODE_STANDARDS.md` - Strict coding standards (NO MOCK DATA, DISCOVERY FIRST)
- `revzilla_data/discovery/` - Raw HTML samples and verified selectors