# Motorcycle Image Scraper - Folder Structure

## Overview
This document outlines the organized folder structure for the comprehensive motorcycle image scraping system, designed to handle multiple websites, manufacturers, and data sources.

## Root Directory Structure

```
06_motorcycle_image_scrapers/
├── README.md                          # Main project documentation
├── FOLDER_STRUCTURE.md               # This file - folder organization guide
│
├── scrapers/                         # All scraping scripts organized by type
│   ├── generic/                      # General-purpose scrapers
│   │   ├── 06_motorcycle_image_scraper.js      # Main multi-source image scraper
│   │   └── 08_motorcycle_variant_analyzer.js   # Variant discovery and analysis
│   │
│   ├── manufacturer_specific/        # Brand-specific optimized scrapers
│   │   ├── ducati/
│   │   │   └── 07_ducati_2025_image_scraper.js
│   │   ├── honda/                    # Future Honda-specific scrapers
│   │   ├── yamaha/                   # Future Yamaha-specific scrapers
│   │   ├── kawasaki/                 # Future Kawasaki-specific scrapers
│   │   ├── suzuki/                   # Future Suzuki-specific scrapers
│   │   ├── bmw/                      # Future BMW-specific scrapers
│   │   ├── ktm/                      # Future KTM-specific scrapers
│   │   ├── harley_davidson/          # Future Harley-Davidson scrapers
│   │   ├── triumph/                  # Future Triumph-specific scrapers
│   │   ├── aprilia/                  # Future Aprilia-specific scrapers
│   │   ├── mv_agusta/                # Future MV Agusta-specific scrapers
│   │   └── indian/                   # Future Indian Motorcycle scrapers
│   │
│   ├── dealer_sites/                 # Dealer website scrapers
│   │   ├── cycletrader/              # Future CycleTrader scrapers
│   │   ├── motorcycles_com/          # Future Motorcycles.com scrapers
│   │   └── local_dealers/            # Future local dealer scrapers
│   │
│   └── specs/                        # Specification-focused scrapers
│       ├── technical_specs/          # Detailed technical specification scrapers
│       ├── pricing/                  # Price data scrapers
│       └── reviews/                  # Review and rating scrapers
│
├── utilities/                        # Helper scripts and tools
│   ├── image_processing/             # Image manipulation and validation
│   │   └── examine_bike_images.js    # Image analysis and validation tool
│   │
│   ├── file_management/              # File system operations
│   │   └── fix_image_extensions.js   # File extension repair utility
│   │
│   ├── progress_monitoring/          # Progress tracking and reporting
│   │   └── monitor_image_progress.js # Enhanced progress monitoring
│   │
│   └── analysis/                     # Data analysis and reporting
│       └── project_summary.js       # Project status and statistics
│
├── data/                             # All data files organized by type
│   ├── progress/                     # Progress tracking files
│   │   ├── motorcycle_scraper_progress.json
│   │   └── ducati_2025_progress.json
│   │
│   ├── failed_urls/                  # Failed URL tracking
│   │   ├── motorcycle_failed_urls.json
│   │   └── ducati_2025_failed_urls.json
│   │
│   ├── analysis_results/             # Analysis output files
│   │   └── variant_analysis.json
│   │
│   └── missing_variants/             # Missing variant data
│       └── missing_variants.csv
│
├── config/                           # Configuration files
│   ├── scraper_config.json           # (Future) Global scraper settings
│   ├── manufacturer_configs/         # (Future) Brand-specific configurations
│   └── site_configs/                 # (Future) Website-specific settings
│
└── logs/                             # Log files
    ├── motorcycle_scraper.log        # Main scraper logs
    └── error_logs/                   # (Future) Error-specific logs
```

## Purpose of Each Directory

### `/scrapers/`
Contains all scraping scripts organized by their purpose and target:

- **`generic/`**: Multi-purpose scrapers that work across various websites
- **`manufacturer_specific/`**: Optimized scrapers for specific motorcycle brands
- **`dealer_sites/`**: Scrapers targeting motorcycle dealer websites
- **`specs/`**: Specialized scrapers for technical specifications and data

### `/utilities/`
Helper scripts and tools for maintenance and analysis:

- **`image_processing/`**: Tools for image validation, resizing, and analysis
- **`file_management/`**: File system utilities and maintenance scripts
- **`progress_monitoring/`**: Progress tracking and performance monitoring
- **`analysis/`**: Data analysis and reporting tools

### `/data/`
All generated data files organized by type:

- **`progress/`**: JSON files tracking scraper progress
- **`failed_urls/`**: Failed URL logs for debugging
- **`analysis_results/`**: Output from analysis scripts
- **`missing_variants/`**: Data about missing motorcycle variants

### `/config/`
Configuration files for different scrapers and settings:

- Global scraper configurations
- Manufacturer-specific settings
- Website-specific parameters

### `/logs/`
Log files for debugging and monitoring:

- Scraper execution logs
- Error logs
- Performance logs

## Usage Guidelines

### Adding New Scrapers

1. **Generic scrapers**: Add to `/scrapers/generic/`
2. **Brand-specific scrapers**: Add to `/scrapers/manufacturer_specific/{brand}/`
3. **Dealer scrapers**: Add to `/scrapers/dealer_sites/{site}/`
4. **Spec scrapers**: Add to `/scrapers/specs/{type}/`

### File Naming Convention

- Use descriptive names with version numbers if applicable
- Include the target website or manufacturer in the filename
- Use snake_case for consistency
- Examples:
  - `honda_official_image_scraper.js`
  - `cycletrader_listing_scraper_v2.js`
  - `universal_specs_scraper.js`

### Data File Management

- All progress files go in `/data/progress/`
- Failed URLs are tracked in `/data/failed_urls/`
- Analysis results are saved in `/data/analysis_results/`
- Use consistent naming patterns for related files

### Configuration Management

- Global settings in `/config/scraper_config.json`
- Manufacturer-specific configs in `/config/manufacturer_configs/`
- Website-specific settings in `/config/site_configs/`

## Scalability Features

This structure is designed to support:

1. **Multiple concurrent scrapers** for different websites
2. **Brand-specific optimizations** for better success rates
3. **Modular utility functions** for code reuse
4. **Centralized data management** for easy analysis
5. **Configuration-driven scrapers** for easy maintenance
6. **Comprehensive logging** for debugging and monitoring

## Future Expansion Plans

1. **Manufacturer Website Scrapers**: Direct scraping from official brand websites
2. **Dealer Network Scrapers**: Multi-dealer inventory scraping
3. **Specification Databases**: Comprehensive technical data collection
4. **Price Tracking**: Historical price data collection
5. **Review Aggregation**: Customer review and rating collection
6. **Market Analysis**: Sales data and trend analysis

## Performance Monitoring

The organized structure supports:

- Individual scraper performance tracking
- Centralized progress monitoring
- Success rate analysis by source
- Resource usage optimization
- Error pattern analysis

This structure ensures the motorcycle image scraping system remains maintainable, scalable, and efficient as it expands to cover more websites and data sources.
