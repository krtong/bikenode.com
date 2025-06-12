# RevZilla Scraper V3

An advanced, production-ready web scraper for RevZilla motorcycle gear catalog with enhanced error handling, anti-detection measures, and data deduplication.

## Features

- **Robust Error Handling**: Automatic retries with exponential backoff
- **Anti-Detection**: User agent rotation, request throttling, browser fingerprint masking
- **Data Deduplication**: Automatic detection and removal of duplicate products
- **Mock Data Mode**: Test functionality without making real requests
- **State Persistence**: Resume scraping from where it left off
- **Memory Management**: Automatic browser restarts to prevent memory leaks
- **Comprehensive Logging**: Detailed logs for debugging and monitoring
- **Flexible Configuration**: Extensive options for customization

## Installation

```bash
npm install
```

## Quick Start

### Test with Mock Data
```bash
npm run mock
```

### Scrape Specific Category
```bash
npm run scrape:helmets
```

### Full Scraping (All Categories)
```bash
npm run scrape:all
```

## Usage

### Basic Usage

```javascript
import RevZillaScraperV3 from './revzilla_scraper_v3.js';

const scraper = new RevZillaScraperV3({
    outputDir: './data',
    downloadImages: true,
    maxPagesPerCategory: 10
});

await scraper.init();
await scraper.scrapeAll();
await scraper.cleanup();
```

### Advanced Configuration

```javascript
const scraper = new RevZillaScraperV3({
    // Output settings
    outputDir: './scraped_data',
    imagesDir: './scraped_data/images',
    logsDir: './logs',
    
    // Rate limiting (milliseconds)
    delays: {
        betweenPages: 5000,      // 5 seconds between pages
        betweenProducts: 4000,   // 4 seconds between products
        betweenCategories: 8000, // 8 seconds between categories
        onError: 15000,         // 15 seconds after error
        maxRetryDelay: 90000    // Max 90 seconds retry delay
    },
    
    // Retry configuration
    maxRetries: 5,
    retryBackoff: 1.5,
    
    // Performance settings
    batchSize: 25,
    maxConcurrentDownloads: 3,
    browserRestartAfter: 50,
    
    // Network settings
    connectionTimeout: 60000,
    navigationTimeout: 45000,
    
    // Anti-detection
    userAgents: [...],  // Custom user agents
    useProxy: false,
    proxyList: []
});
```

### Using Mock Data for Testing

```javascript
const scraper = new RevZillaScraperV3({
    useMockData: true,  // Enable mock mode
    outputDir: './test_data'
});

// Will generate realistic fake data instead of scraping
await scraper.scrapeAll();
```

### Scraping Specific Categories

```javascript
// Single category
await scraper.scrapeCategory('motorcycle-helmets', {
    maxPages: 5,
    downloadImages: true
});

// Multiple categories
const categories = {
    'motorcycle-helmets': { name: 'Helmets' },
    'motorcycle-jackets': { name: 'Jackets' }
};

await scraper.scrapeAll({ categories });
```

### Resume from Interruption

```javascript
// The scraper automatically saves state
// To resume, just run again:
await scraper.scrapeAll({
    resumeFrom: 'motorcycle-gloves'  // Resume from specific category
});
```

## Data Output

### Product Schema

Each product is saved with the following structure:

```json
{
    "id": "unique_product_id",
    "url": "https://www.revzilla.com/...",
    "scraped_at": "2024-01-01T12:00:00.000Z",
    "name": "Product Name",
    "brand": "Brand Name",
    "sku": "SKU123",
    "category": "motorcycle-helmets",
    "price": {
        "regular": 299.99,
        "sale": 249.99,
        "currency": "USD",
        "in_stock": true
    },
    "rating": {
        "average": 4.5,
        "count": 123
    },
    "description": "Product description...",
    "features": ["Feature 1", "Feature 2"],
    "specifications": {
        "Material": "Carbon Fiber",
        "Weight": "3.5 lbs"
    },
    "sizes": [
        {"value": "s", "text": "Small", "available": true},
        {"value": "m", "text": "Medium", "available": true}
    ],
    "colors": [
        {"value": "black", "text": "Black", "available": true}
    ],
    "images": {
        "main": "https://...",
        "gallery": ["https://..."],
        "local_paths": ["./images/..."]
    },
    "scrape_status": "completed",
    "error_count": 0
}
```

### Output Files

- `motorcycle-{category}_page{n}_{date}.json` - Raw scraped data
- `deduplicated_products_{date}.json` - Cleaned, unique products
- `scraper_report_v3_{date}.json` - Scraping statistics and summary
- `validation_report.json` - Data quality report

## Error Handling

The scraper includes comprehensive error handling:

1. **Network Errors**: Automatic retry with exponential backoff
2. **Browser Crashes**: Automatic browser restart
3. **Rate Limiting**: Intelligent delay management
4. **Bot Detection**: Enhanced stealth mode, proxy support
5. **Memory Issues**: Periodic browser restarts

## Anti-Detection Measures

1. **User Agent Rotation**: Randomly selects from realistic user agents
2. **Request Throttling**: Configurable delays between requests
3. **Browser Fingerprinting**: Masks automation indicators
4. **Proxy Support**: Optional proxy rotation
5. **Human-like Behavior**: Random viewport sizes, realistic timing

## Performance Optimization

1. **Batch Processing**: Processes products in configurable batches
2. **Concurrent Downloads**: Parallel image downloading with limits
3. **Memory Management**: Automatic browser restarts
4. **Resource Blocking**: Blocks unnecessary CSS, fonts, analytics
5. **State Persistence**: Resume capability for long-running jobs

## CLI Commands

```bash
# Basic scraping
node revzilla_scraper_v3.js

# Specific category
node revzilla_scraper_v3.js --category motorcycle-helmets

# Limited pages
node revzilla_scraper_v3.js --max-pages 5

# No image downloads
node revzilla_scraper_v3.js --no-images

# Resume from interruption
node revzilla_scraper_v3.js --resume motorcycle-boots

# Mock data mode
node revzilla_scraper_v3.js --mock
```

## Testing

```bash
# Run all tests
npm test

# Quick test with mock data
node quick_test.js

# Test real scraping (careful mode)
node test_real_scraping.js

# Complete system test
npm run test:complete
```

## Monitoring

The scraper provides real-time events:

```javascript
scraper.on('log', (entry) => {
    console.log(`[${entry.level}] ${entry.message}`);
});

scraper.on('product', (product) => {
    console.log(`Scraped: ${product.name}`);
});
```

## Best Practices

1. **Start Small**: Test with a single category and few pages first
2. **Monitor Logs**: Check logs regularly for errors or blocking
3. **Use Delays**: Don't reduce delays too much to avoid detection
4. **Rotate Proxies**: Use residential proxies for production
5. **Handle Failures**: Implement proper error handling in your code
6. **Validate Data**: Always validate scraped data quality
7. **Respect Robots.txt**: Follow website's scraping guidelines

## Troubleshooting

### Socket Hang Up Errors
- Increase delays between requests
- Check internet connection stability
- Consider using proxies

### 403/503 Errors
- Bot detection triggered
- Increase delays significantly
- Use residential proxies
- Add more user agents

### Memory Issues
- Reduce `browserRestartAfter` value
- Decrease batch size
- Close unused pages promptly

### Missing Data
- Check selectors are up-to-date
- Verify page structure hasn't changed
- Enable debug logging

## Legal Disclaimer

This scraper is for educational purposes only. Always respect website terms of service and robots.txt. The authors are not responsible for any misuse of this tool.

## License

Private - Not for distribution