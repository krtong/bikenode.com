# DOM Scout Migration

## Changes Made

### 1. Documentation Updates

- **SCRAPING_ARCHITECTURE.md**: Updated to use DOM Scout
- **ADAPTIVE_SCRAPING.md**: Renamed to LEGACY_ADAPTIVE_SCRAPING.md with deprecation
- **Manufacturer READMEs**: Removed hardcoded specifications

### 2. New Required Files

Created for each manufacturer:
- **scout.js**: Configuration with URLs to investigate (no assumptions)
- **DISCOVERY.md**: Template for documenting findings after DOM Scout analysis
- **scout-reports/**: Directory for raw data storage

### 3. Code Changes

#### BMW Full Scraper
- Removed hardcoded variant mappings (`'125' → 'C1 125'`)
- Removed hardcoded production periods (`2000-2002`)
- Removed hardcoded displacement values (`125cc`, `176cc`)
- Added TODO warnings for all hardcoded data

#### Deprecation Notices
- **WebsiteAnalyzer**: Marked as deprecated - violates "no assumptions" principle
- **AdaptiveScraper**: Marked as deprecated - pattern detection violates philosophy
- **PeravesAdaptiveScraper**: Marked as deprecated

### 4. New Process

Before:
```
Website → Pattern Detection → Smart Scraping → Data
```

After:
```
Website → DOM Scout (Pure Collection) → Human Analysis → Evidence-Based Scraping → Data
```

## Migration Guide

### For Existing Scrapers

1. **Stop using adaptive scrapers immediately**
2. Run DOM Scout on target websites
3. Manually analyze collected data
4. Update scout.js with verified selectors only
5. Remove all hardcoded assumptions

### For New Scrapers

1. **Always start with DOM Scout**
   ```bash
   npm run scout:[manufacturer]
   ```

2. **Analyze raw data manually**
   ```bash
   # Review what was collected
   cat scout-reports/[manufacturer]/latest/census/elements.json
   grep -r "search_term" scout-reports/[manufacturer]/latest/raw/
   ```

3. **Document findings**
   - Update DISCOVERY.md with actual findings
   - Only include selectors you've verified exist

4. **Write evidence-based scraper**
   - Use only selectors from scout.js
   - No assumptions about structure
   - Return empty results if selectors fail

## Key Principles

### ✅ DO
- Collect everything without filtering
- Save exact HTML/CSS as received
- Document what you actually found
- Use only verified selectors
- Return empty results when no data found

### ❌ DON'T
- Look for "products" or "prices"
- Assume any website structure
- Use pattern detection
- Save "successful patterns"
- Generate placeholder data

## Verification

To verify compliance:
1. No hardcoded model data in scrapers
2. All manufacturers have scout.js files
3. DISCOVERY.md files exist (even if empty)
4. scout-reports/ directory exists
5. Adaptive scraper files have deprecation notices

## Next Steps

1. **Run DOM Scout** on all manufacturer websites
2. **Analyze collected data** to find actual selectors
3. **Update scout.js files** with verified selectors
4. **Rewrite scrapers** to use evidence-based approach
5. **Remove deprecated code** once migration is complete

Remember: The goal is to be a "perfect recording device, not a smart analyzer."