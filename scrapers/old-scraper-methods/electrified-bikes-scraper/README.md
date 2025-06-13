# Electrified Bikes Scraper Project

> **⚠️ STOP! READ THESE DOCUMENTS FIRST**
> 
> **Mandatory prerequisites:**
> 1. [SCRAPING_DESIGN_PRINCIPLES.md](../../SCRAPING_DESIGN_PRINCIPLES.md)
> 2. [CODE_STANDARDS.md](../CODE_STANDARDS.md)
> 
> **STRICT REQUIREMENTS:**
> - **NO PLACEHOLDERS** - No fake brand names or theoretical models
> - **VERIFY BEFORE CREATING** - Check if brand scrapers already exist
> - **REAL WEBSITES ONLY** - Confirm URLs work before adding to scraper
> - **HYPERSPECIFIC FILES** - Name files like "surron-2024-scraper.js" not "bike-scraper.js"

## Overview
This project aims to collect year/make/model/specs data for electrified bikes (Sur-Ron, Talaria, Segway, etc.) from various online sources.

## Target Brands
1. Sur-Ron
2. Talaria
3. Segway
4. Zero Motorcycles
5. Super73
6. ONYX
7. Cake
8. Stark Future
9. Delfast
10. Stealth Electric Bikes
11. Monday Motorbikes
12. Volcon
13. Electric Motion
14. Kuberg
15. Flux Performance
16. 79Bike
17. HappyRun
18. Rawrr
19. E-Ride Pro
20. Qulbix
21. Stage 2 (Razor)
22. Arctic Leopard
23. Ventus
24. Altis

## Data Structure
```json
{
  "brands": {
    "Sur-Ron": {
      "models": [
        {
          "model": "Light Bee X",
          "years": [2024, 2023, 2022],
          "specs": {
            "motor_power": "6000W",
            "battery": "60V 32Ah",
            "top_speed": "47 mph",
            "range": "40-60 miles",
            "weight": "110 lbs"
          }
        }
      ]
    }
  }
}
```

## Scraping Strategy

### 1. Primary Sources (Manufacturer Websites)
- Direct from manufacturer sites when accessible
- Official spec sheets and brochures (PDFs)
- Press releases

### 2. Secondary Sources (Retailers/Dealers)
- Luna Cycle (carries multiple brands)
- Alien Rides
- Electric Bike Company
- Local dealer websites

### 3. Review Sites
- ElectricBikeReview.com
- Electrek.co
- InsideEVs.com
- YouTube reviews (for spec mentions)

### 4. Forums and Communities
- Reddit (r/Surron, r/ebikes)
- Endless Sphere forum
- Facebook groups
- Discord communities

### 5. Marketplace Listings
- Used bike listings often include specs
- Craigslist, Facebook Marketplace
- eBay listings

## Technical Approach

### Phase 1: Manual Research
- Build a source list for each brand
- Identify which sites have structured data
- Document URL patterns

### Phase 2: Automated Scraping
- Use Puppeteer for JavaScript-heavy sites
- Simple HTTP requests for static content
- PDF parsing for spec sheets

### Phase 3: Data Validation
- Cross-reference specs from multiple sources
- Flag conflicting data for manual review
- Build confidence scores

## Challenges
1. Many sites use JavaScript rendering
2. Specs often in unstructured text
3. Model names vary (Light Bee vs LightBee)
4. Year information often missing
5. Units vary (kW vs W, km vs miles)

## File Structure
```
electrified-bikes-scraper/
├── README.md
├── sources/
│   ├── brand-sources.json
│   └── verified-urls.json
├── scrapers/
│   ├── manufacturer-scraper.js
│   ├── retailer-scraper.js
│   └── review-scraper.js
├── data/
│   ├── raw/
│   ├── processed/
│   └── final/
└── tools/
    ├── data-validator.js
    └── spec-normalizer.js
```