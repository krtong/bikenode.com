# Motorcycle Image Scraper Suite

> **⚠️ Scraping Principles**
> - Work with real motorcycle database records and actual image URLs only
> - Don't assume image availability - verify through actual download attempts
> - Document real download results and discovered edge cases
> - Leave room for discovering new image sources and formats
> - See core principles in [README_BEFORE_MAKING_ANY_PAGE.md]

This directory contains a comprehensive, organized motorcycle image downloading system with multi-website scraping capabilities.

## 📁 Project Structure

The project is now organized into a scalable folder structure:

```
06_motorcycle_image_scrapers/
├── scrapers/                    # All scraping scripts by type
│   ├── generic/                 # Multi-purpose scrapers
│   ├── manufacturer_specific/   # Brand-optimized scrapers
│   ├── dealer_sites/           # Dealer website scrapers
│   └── specs/                  # Specification scrapers
├── utilities/                   # Helper tools and scripts
├── data/                       # All data files organized by type
├── config/                     # Configuration files
└── logs/                       # Log files
```

See [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md) for complete details.

## 🏍️ Core Scraper Files

### Main Scrapers
- **`scrapers/generic/06_motorcycle_image_scraper.js`** - Main general motorcycle image scraper
  - Processes all motorcycles from the database (44,124 total)
  - Downloads 3 images per motorcycle (hero_1.jpg, hero_2.jpg, hero_3.jpg)
  - Hierarchical storage: `/images/motorcycles/brand/year/model/variant/`
  - Smart resume capability and progress tracking

- **`scrapers/manufacturer_specific/ducati/07_ducati_2025_image_scraper.js`** - Specialized Ducati 2025 scraper
  - Focused on Ducati 2025 models
  - Enhanced image processing for specific Ducati features
  - Status: ✅ Completed (27 motorcycles processed)

### Utility Scripts
- **`monitor_image_progress.js`** - Real-time progress monitoring
  - Shows current scraping progress and statistics
  - Calculates success rates and ETA
  - Brand statistics and directory structure overview

- **`fix_image_extensions.js`** - File extension repair utility
  - Fixes corrupted image files without proper extensions
  - Status: ✅ Completed (445 files fixed)

- **`examine_bike_images.js`** - Image quality analysis utility
  - Analyzes downloaded images for quality and completeness
  - File size and format verification

- **`project_summary.js`** - Comprehensive project documentation
  - Generates detailed project status reports
  - Technical achievements and progress summaries

## 📊 Progress & Data Files

### Progress Tracking
- **`motorcycle_scraper_progress.json`** - General scraper progress
- **`ducati_2025_progress.json`** - Ducati scraper progress

### Error Tracking
- **`motorcycle_failed_urls.json`** - Failed URLs from general scraper
- **`ducati_2025_failed_urls.json`** - Failed URLs from Ducati scraper
- **`failed_image_urls.json`** - General failed image URLs

### Logs
- **`motorcycle_scraper.log`** - Main scraper activity log

## 🚀 Usage

### Monitor Progress
```bash
cd /Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers
node monitor_image_progress.js
```

### Run Main Scraper
```bash
cd /Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers
nohup node 06_motorcycle_image_scraper.js > motorcycle_scraper.log 2>&1 &
```

### Generate Project Summary
```bash
cd /Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers
node project_summary.js
```

## 📈 Current Status

- **Total Motorcycles**: 44,124 in database
- **Processed**: 537 motorcycles (1.22% complete)
- **Images Downloaded**: 1,500+ images
- **Success Rate**: 95.6%
- **Average**: ~3 images per motorcycle
- **ETA**: ~24 hours for complete collection
- **Target**: ~132,000 total motorcycle images

## 🏗️ Technical Architecture

### Hierarchical Storage Structure
```
/images/motorcycles/
├── brand/
│   ├── year/
│   │   ├── model/
│   │   │   ├── variant/
│   │   │   │   ├── hero_1.jpg
│   │   │   │   ├── hero_2.jpg
│   │   │   │   └── hero_3.jpg
```

### Key Features
✅ **Axios Streaming Download** - Proper file extension detection  
✅ **Smart Resume** - Continues from last processed motorcycle  
✅ **Error Handling** - Distinguishes permanent vs temporary failures  
✅ **Progress Tracking** - Real-time monitoring and JSON persistence  
✅ **Quality Control** - File validation and repair utilities  
✅ **Dual Architecture** - General + specialized scrapers  

## 🎯 Project Goals

1. **Comprehensive Collection** - Download images for all 44,124 motorcycles
2. **Quality Assurance** - Ensure proper file formats and integrity
3. **Organized Storage** - Maintain hierarchical directory structure
4. **Progress Tracking** - Detailed monitoring and resume capability
5. **Error Management** - Track and analyze failed downloads
6. **Performance** - Maintain high success rate (95%+ target)

The motorcycle image scraper system represents a robust, scalable solution for collecting and organizing a comprehensive database of motorcycle images with excellent performance metrics and reliability.
