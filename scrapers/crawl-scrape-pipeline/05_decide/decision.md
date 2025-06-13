# Scraping Decision Document

This document records the scraping strategy for each URL template discovered in step 04_probe.

## Template Decisions

### Example: Product Pages
- **Pattern**: `/product/{slug}`
- **Method**: Parse static HTML via CSS selectors
- **Rationale**: Pages load completely without JavaScript
- **Fields Available**: title, price, description, images, availability

### Example: API Endpoints
- **Pattern**: `/api/products/{id}`
- **Method**: Use JSON API directly
- **Rationale**: Structured data available via API
- **Authentication**: API key required (in .env)

### Example: Search Results
- **Pattern**: `/search?q={query}`
- **Method**: Needs headless rendering (Playwright)
- **Rationale**: Results loaded dynamically via JavaScript
- **Pagination**: Infinite scroll, need to trigger load events

## Notes

- Update this document after running 04_probe and analyzing the findings
- Each template should have a clear scraping strategy
- Consider performance, reliability, and data completeness