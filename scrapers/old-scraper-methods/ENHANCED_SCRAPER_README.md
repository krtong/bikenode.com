# Enhanced MotorcycleSpecs Scraper v2.0

An advanced web scraper for motorcyclespecs.co.za with significant improvements over the original version.

## New Features

### 1. Better Image Downloading
- **Smart Filtering**: Automatically skips logos, icons, banners, and navigation images
- **Resolution Detection**: Only downloads images larger than 100x100 pixels
- **Image Optimization**: Automatically resizes large images while maintaining quality
- **Thumbnail Generation**: Creates 300x200 thumbnails for all images
- **Deduplication**: Uses MD5 hashing to avoid downloading duplicate images
- **Folder Structure**: Organized into originals/, thumbnails/, and optimized versions

### 2. Progress Tracking
- **Visual Progress Bars**: Real-time progress bars for manufacturers, models, and images
- **Detailed Statistics**: Tracks successful downloads, failures, and skipped duplicates
- **Resume Capability**: Saves progress automatically and can resume interrupted scrapes
- **Performance Metrics**: Tracks processing time and average time per motorcycle

### 3. Data Improvements
- **Enhanced Metadata Extraction**: Captures structured data, meta tags, and JSON-LD
- **Year Detection**: Multiple patterns to extract model years from content
- **Category Detection**: Automatically categorizes motorcycles (sport, cruiser, touring, etc.)
- **Data Quality Scoring**: Rates each scraped entry from 0-100% based on completeness
- **Technical Specs Separation**: Separates engine specs from general specifications
- **Feature Extraction**: Captures bulleted lists as features

### 4. Performance Improvements
- **Concurrent Downloads**: Uses p-limit for controlled concurrent image downloads
- **Smart Rate Limiting**: Randomized delays to avoid detection
- **Connection Pooling**: HTTP keep-alive for better performance
- **Resource Blocking**: Blocks unnecessary CSS and fonts to speed up page loads
- **Enhanced Error Handling**: Graceful degradation and detailed error reporting

## Installation

```bash
# Install dependencies
npm install puppeteer cli-progress p-limit sharp

# Or if using the existing package.json
npm install
```

## Usage

### Basic Usage
```bash
node motorcyclespecs_scraper_enhanced.js
```

### With Options
```bash
# Limit to first 5 manufacturers
node motorcyclespecs_scraper_enhanced.js --max-manufacturers 5

# Limit models per manufacturer
node motorcyclespecs_scraper_enhanced.js --max-models 10

# Start from specific manufacturer
node motorcyclespecs_scraper_enhanced.js --start-from "Honda"

# Disable image downloads
node motorcyclespecs_scraper_enhanced.js --download-images false

# Disable resume (start fresh)
node motorcyclespecs_scraper_enhanced.js --no-resume
```

## Output Structure

```
scraped_data/
├── motorcycles/
│   └── motorcyclespecs_enhanced_TIMESTAMP.json
├── images/
│   ├── motorcycles/
│   │   └── [manufacturer]/
│   │       └── [model]_[index].jpg
│   ├── originals/
│   │   └── [manufacturer]/
│   │       └── [model]_[index].jpg
│   └── thumbnails/
│       └── [manufacturer]/
│           └── [model]_[index].jpg
├── logs/
│   ├── scraper_progress.json
│   ├── image_mapping_TIMESTAMP.json
│   └── scraping_report_TIMESTAMP.txt
└── cache/
```

## Data Structure

Each motorcycle entry includes:

```json
{
  "title": "Motorcycle Model Name",
  "manufacturer": "Brand Name",
  "model": "Model Name",
  "category": "sport|cruiser|touring|adventure|naked|dirt|scooter|electric",
  "years": [2020, 2021, 2022],
  "specifications": {
    "Length": "2100 mm",
    "Width": "740 mm",
    "Height": "1100 mm",
    "Wheelbase": "1450 mm",
    "Seat Height": "820 mm",
    "Weight": "200 kg"
  },
  "technicalSpecs": {
    "Engine Type": "4-stroke, DOHC",
    "Displacement": "998 cc",
    "Max Power": "200 hp @ 13,000 rpm",
    "Max Torque": "113 Nm @ 11,000 rpm"
  },
  "features": [
    "ABS",
    "Traction Control",
    "Quick Shifter"
  ],
  "images": [
    {
      "url": "https://...",
      "alt": "Image description",
      "width": 1920,
      "height": 1080,
      "quality": "high"
    }
  ],
  "downloadedImages": [
    {
      "status": "success",
      "path": "./scraped_data/images/motorcycles/...",
      "originalPath": "./scraped_data/images/originals/...",
      "thumbnailPath": "./scraped_data/images/thumbnails/...",
      "size": 2073600,
      "hash": "d41d8cd98f00b204e9800998ecf8427e"
    }
  ],
  "content": "Full text content...",
  "metadata": {
    "description": "Meta description",
    "keywords": "meta keywords"
  },
  "url": "https://www.motorcyclespecs.co.za/...",
  "scraped_at": "2024-01-01T00:00:00.000Z",
  "dataQuality": 85
}
```

## Categories

The scraper automatically detects these categories:
- **sport**: Sport bikes, supersports, racing bikes
- **cruiser**: Cruisers, choppers, bobbers
- **touring**: Touring bikes, baggers
- **adventure**: Adventure, ADV, dual-sport bikes
- **naked**: Naked bikes, streetfighters
- **dirt**: Dirt bikes, motocross
- **scooter**: Scooters and mopeds
- **electric**: Electric motorcycles
- **standard**: Default category
- **small-displacement**: Under 250cc
- **large-displacement**: Over 1000cc

## Progress Resume

The scraper automatically saves progress to `scraper_progress.json`. If interrupted:

1. Simply run the scraper again
2. It will detect the progress file and ask to resume
3. Continues from the last processed model

To force a fresh start:
```bash
node motorcyclespecs_scraper_enhanced.js --no-resume
```

## Performance Metrics

The final report includes:
- Total processing time
- Average time per motorcycle
- Image download statistics
- Data quality metrics
- Category breakdown
- Top manufacturers by model count

## Error Handling

- **Graceful Degradation**: Continues scraping even if individual pages fail
- **Retry Logic**: Automatic retries for failed downloads
- **Detailed Logging**: All errors are logged with context
- **Progress Preservation**: Progress saved even on fatal errors

## Tips for Best Results

1. **Start Small**: Test with `--max-manufacturers 1` first
2. **Monitor Progress**: Watch the progress bars for any issues
3. **Check Reports**: Review the generated reports for data quality
4. **Verify Images**: Check the image folders for quality
5. **Use Resume**: Take advantage of resume for large scraping jobs

## Troubleshooting

### Images not downloading
- Check internet connection
- Verify image URLs are accessible
- Look for errors in console output

### Scraper hanging
- Some pages may take longer to load
- Check if site is blocking requests
- Try reducing concurrent downloads

### Low data quality scores
- Site structure may have changed
- Some models may have limited data
- Review the scraped content manually