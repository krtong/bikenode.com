# ⚠️ CRITICAL: NO FAKE DATA POLICY ⚠️

## This is a Web Scraper - It Must ONLY Return Real Data

### ABSOLUTE RULES - NO EXCEPTIONS

1. **NEVER generate fake/synthetic data**
2. **NEVER use fallback/placeholder data**
3. **NEVER interpolate missing years or models**
4. **NEVER return hardcoded specifications**
5. **NEVER hide scraping failures with fake data**

### What This Means

❌ **BANNED**: 
```javascript
// NEVER DO THIS
if (results.length === 0) {
  results.push({
    model: 'PLACEHOLDER',
    year: 2024,
    specs: { generated: true }
  });
}
```

❌ **BANNED**:
```javascript
// NEVER DO THIS
for (let year = 1990; year <= 2024; year++) {
  models.push(generateModelForYear(year));
}
```

❌ **BANNED**:
```javascript
// NEVER DO THIS
if (process.env.NODE_ENV === 'development') {
  return getSeedData();
}
```

✅ **CORRECT**:
```javascript
// THIS IS CORRECT
if (results.length === 0) {
  return {
    models: [],
    errors: ['No data found on website'],
    source: url
  };
}
```

### Why This Policy Exists

1. **Data Integrity**: Users must be able to trust that all data is real
2. **Failure Visibility**: We need to know when scraping fails to fix it
3. **No Contamination**: Fake data must never enter the production database
4. **Honest Systems**: A scraper that returns fake data is lying to its users

### What To Do Instead

- **Scraping fails?** → Return empty array with error details
- **Need test data?** → Create separate test fixtures clearly marked as fake
- **Website structure changed?** → Fix the scraper, don't fake the data
- **Demo needed?** → Use a separate demo database, not the scraper

### Every Scraped Item MUST Include

```javascript
{
  source_url: 'https://exact-page-scraped-from.com',
  scraped_at: '2024-01-15T10:30:00Z',
  source_type: 'web_scraping', // NEVER 'generated' or 'seed'
  extraction_method: 'css selector used or method name'
}
```

### Validation Requirements

All scrapers MUST pass this validation:

```javascript
function validateScrapedData(data) {
  // Reject any item with banned patterns
  const banned = [
    'PLACEHOLDER', 'DEVELOPMENT', 'SEED', 'MOCK', 'FAKE',
    'generated', 'fallback', 'synthetic', 'interpolated'
  ];
  
  const serialized = JSON.stringify(data).toLowerCase();
  for (const pattern of banned) {
    if (serialized.includes(pattern.toLowerCase())) {
      throw new Error(`Fake data detected: contains "${pattern}"`);
    }
  }
  
  // Require real source attribution
  data.forEach(item => {
    if (!item.source_url || !item.scraped_at) {
      throw new Error('Missing required source attribution');
    }
  });
}
```

### Code Review Checklist

Before approving any scraper code:

- [ ] Returns empty array when no data found?
- [ ] No loops generating years/models?
- [ ] No fallback data of any kind?
- [ ] No seed data imports?
- [ ] All data has source_url?
- [ ] No "generated_from_pattern" flags?
- [ ] No placeholder text anywhere?

### Remember

**Empty results are correct and honest.**
**Fake results are lies.**

A web scraper that doesn't scrape but generates data is not a web scraper - it's a fraud.

---

*This policy is non-negotiable. Any code that generates fake data must be rejected in code review.*