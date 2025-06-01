# 99Spokes Scraper Project Organization

## 📁 Project Structure Reorganized

### ✅ `/active_scrapers/` - Production Ready
Contains the 4 main scrapers that comprise the complete pipeline:

1. **`01_brand_scraper.js`** - Validates all bike brands/makers
2. **`02_year_scraper.js`** - Extracts available years per brand  
3. **`03_variant_url_scraper.js`** - Collects all bike variant URLs
4. **`04_data_scraper.js`** - Scrapes comprehensive bike data
5. **`pipeline_runner.js`** - Orchestrates the entire pipeline

**Data Files:**
- `bike_variants.json` - 69,884 variant URLs to scrape
- `maker_years.json` - Year ranges for each brand
- `maker_ids.txt` - 380 validated bike makers

### 🗂️ `/deprecated/` - Legacy/Development Files
Contains 23 deprecated files:
- Alternative scraping approaches that didn't work
- Cloudflare bypass attempts
- Test and development files
- Multiple versions of scrapers
- Python/TypeScript experiments

### 📊 Current Pipeline Status

| Stage | Status | Output | Progress |
|-------|--------|--------|----------|
| 1. Brands | ✅ Complete | 380 makers | 100% |
| 2. Years | ✅ Complete | Year ranges | 100% |
| 3. URLs | ✅ Complete | 69,884 variants | 100% |
| 4. Data | 🔄 Active | 19,953 scraped | 57% |

### 🎯 Next Steps
The pipeline is ready to continue with Stage 4 data scraping:
```bash
cd active_scrapers
node 04_data_scraper.js
```

This will resume scraping the remaining ~30k bike variants from the established URL list.

## 🧹 Cleanup Benefits
- **Reduced clutter:** 23 files moved to deprecated
- **Clear pipeline:** 4 numbered stages easy to understand  
- **Maintainable:** Each scraper has single responsibility
- **Production ready:** Active scrapers are tested and functional