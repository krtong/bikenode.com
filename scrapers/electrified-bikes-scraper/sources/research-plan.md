# Electrified Bikes Research Plan

## Phase 1: Source Discovery (Manual Research)

### Task 1: Find Official Websites
For each brand, locate:
- Official manufacturer website
- Official product pages
- Downloadable spec sheets/brochures
- Press release sections

### Task 2: Identify Retailer Sources
Find retailers that carry multiple brands:
- **Luna Cycle**: https://lunacycle.com
- **Alien Rides**: https://alienrides.com
- **Charged Cycle Works**: https://chargedcycleworks.com
- **Bikes Xpress**: https://bikes-xpress.com

### Task 3: Review Site Mapping
Identify review sites with structured data:
- **Electric Bike Review**: Look for database/comparison features
- **Electrek**: Check for bike database section
- **YouTube Channels**: Find channels that consistently review these bikes

### Task 4: Forum Research
Document active communities:
- Reddit communities for each brand
- Facebook groups
- Discord servers
- Specialized forums

## Phase 2: Data Structure Analysis

### For Each Source, Document:
1. **URL Structure**
   - Product listing patterns
   - Individual product page patterns
   - API endpoints (if any)

2. **Data Format**
   - HTML structure (CSS selectors)
   - JSON-LD structured data
   - Meta tags
   - PDF availability

3. **Data Quality**
   - Completeness of specs
   - Consistency of format
   - Update frequency
   - Historical data availability

4. **Access Method**
   - Static HTML
   - JavaScript rendered
   - API available
   - Authentication required

## Phase 3: Scraping Priority

### Tier 1 (Easiest/Most Reliable)
- Static HTML with structured data
- Public APIs
- Well-formatted retailer sites

### Tier 2 (Moderate Difficulty)
- JavaScript-rendered sites
- Sites requiring pagination
- PDF spec sheets

### Tier 3 (Challenging)
- Sites with anti-scraping measures
- Unstructured text requiring parsing
- Video/image-based specs

## Data Points to Collect

### Essential Specs
- Model name (exact)
- Year(s) available
- Motor power (watts)
- Battery (voltage, amp-hours)
- Top speed
- Range
- Weight

### Additional Specs (if available)
- Charging time
- Frame material
- Suspension travel
- Brake type
- Wheel size
- Controller specs
- Display type
- Modes/settings
- Price (MSRP)

### Meta Information
- Source URL
- Date scraped
- Confidence level
- Notes/caveats

## Validation Strategy

### Cross-Reference Approach
1. Collect same model from multiple sources
2. Compare specs for consistency
3. Flag discrepancies for manual review
4. Build confidence scores based on:
   - Number of sources agreeing
   - Source reliability ranking
   - Data recency

### Unit Normalization
- Power: Convert all to watts (W)
- Speed: Convert all to mph
- Range: Convert all to miles
- Weight: Convert all to lbs
- Battery: Standardize to "V Ah" format

## Next Steps

1. **Manual Research Phase** (1-2 days)
   - Visit each brand's official site
   - Document findings in `brand-sources.json`
   - Take screenshots of data formats

2. **Build Source Database** (1 day)
   - Create structured list of all sources
   - Rank by reliability and ease of scraping
   - Identify quick wins

3. **Prototype Scrapers** (2-3 days)
   - Start with easiest sources
   - Build modular scrapers
   - Test data extraction

4. **Data Collection** (1 week)
   - Run scrapers
   - Validate data
   - Build final dataset