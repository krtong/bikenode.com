# Electrified Bikes Scraping Strategy

## Overview
Based on source validation, we have 12 accessible sources out of 16 tested. This document outlines the strategy for collecting real specification data.

## Accessible Sources

### ✅ Manufacturer Sites (6/8)
1. **Sur-Ron** - All 3 sites accessible
   - sur-ronusa.com (primary for US market)
   - sur-ron.com (international)
   - sur-ronmoto.com (alternate)

2. **Segway** - store.segway.com accessible
3. **Zero Motorcycles** - zeromotorcycles.com accessible
4. **Super73** - super73.com accessible

### ✅ Retailer Sites (3/3)
1. **Luna Cycle** - Major retailer with multiple brands
2. **Alien Rides** - Specializes in Sur-Ron, Talaria
3. **Charged Cycle Works** - Good for comparison data

### ✅ Review Sites (3/3)
1. **Electric Bike Review** - Structured reviews
2. **Electrek** - News and reviews
3. **RideApart** - Motorcycle/e-bike coverage

## Data Collection Phases

### Phase 1: Manual Reconnaissance (Day 1)
1. Visit each accessible site manually
2. Document:
   - Exact URL patterns for models
   - HTML structure for specs
   - Available data points
   - JavaScript requirements
3. Take screenshots of data locations
4. Save example HTML for parser development

### Phase 2: Parser Development (Days 2-3)
Build specific parsers for each source type:

#### A. Manufacturer Site Parser
- Handle different HTML structures
- Extract from spec tables
- Parse unstructured text
- Download PDF links

#### B. Retailer Site Parser
- Product listing pages
- Individual product pages
- Comparison features
- Price data (optional)

#### C. Review Site Parser
- Article content
- Spec boxes
- Comparison tables

### Phase 3: Data Collection (Days 4-5)
1. Run parsers on all sources
2. Save raw HTML/data
3. Extract specifications
4. Store in structured format

### Phase 4: Data Validation (Day 6)
1. Cross-reference same models across sources
2. Identify conflicts
3. Build confidence scores
4. Manual verification of conflicts

## Technical Implementation

### 1. Scraper Architecture
```
Main Scraper
├── Source Manager (tracks URLs, status)
├── Page Fetcher (Puppeteer for JS sites)
├── Parser Manager
│   ├── Manufacturer Parser
│   ├── Retailer Parser
│   └── Review Parser
├── Data Extractor
│   ├── Spec Normalizer
│   └── Conflict Resolver
└── Data Storage (JSON files)
```

### 2. Data Storage Structure
```
data/
├── raw/
│   ├── 2024-01-08/
│   │   ├── surron-usa/
│   │   ├── luna-cycle/
│   │   └── ...
├── processed/
│   ├── by-brand/
│   │   ├── surron.json
│   │   └── talaria.json
│   └── by-source/
│       ├── manufacturer.json
│       └── retailer.json
└── final/
    └── electrified-bikes-specs.json
```

### 3. Spec Extraction Patterns

#### Motor Power
- Look for: W, kW, watts, power, motor
- Patterns: "6000W", "6kW", "6,000 watts"

#### Battery
- Look for: V, Ah, voltage, amp-hours
- Patterns: "60V 32Ah", "60V/32Ah"

#### Speed
- Look for: mph, km/h, top speed, max speed
- Patterns: "45 mph", "45mph", "72 km/h"

#### Range
- Look for: miles, km, range
- Patterns: "40-60 miles", "65km"

#### Weight
- Look for: lbs, kg, pounds, weight
- Patterns: "110 lbs", "50kg"

## Priority Order

### High Priority Brands (Most Popular)
1. Sur-Ron - All models
2. Talaria - Need alternative sources
3. Segway - Dirt eBike series
4. Zero Motorcycles - Full lineup

### Medium Priority
5. Super73
6. ONYX
7. Monday Motorbikes
8. Cake

### Lower Priority
- Remaining brands as time permits

## Fallback Strategies

### For Inaccessible Sites (Talaria)
1. Check retailer sites that carry the brand
2. Search YouTube reviews for specs
3. Check Reddit/forums
4. Look for PDF spec sheets via Google

### For Missing Specifications
1. Search "{brand} {model} specifications"
2. Check image alt text and meta tags
3. Look for comparison articles
4. Check marketplace listings

## Success Metrics
- Number of models with complete specs
- Spec completeness per model (%)
- Number of sources per spec
- Confidence level per spec

## Output Format
```json
{
  "metadata": {
    "collected_date": "2024-01-08",
    "total_brands": 24,
    "total_models": 100,
    "sources_used": 12
  },
  "brands": {
    "Sur-Ron": {
      "models": {
        "Light Bee X": {
          "years": [2024, 2023],
          "specs": {
            "motor_power": {
              "value": "6000W",
              "sources": ["sur-ronusa.com", "lunacycle.com"],
              "confidence": 1.0
            },
            "battery": {
              "value": "60V 32Ah",
              "sources": ["sur-ronusa.com"],
              "confidence": 0.8
            }
          }
        }
      }
    }
  }
}
```