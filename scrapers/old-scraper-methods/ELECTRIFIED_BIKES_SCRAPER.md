# Electrified Bikes Scraper

A comprehensive web scraper for electrified bike brands including Sur-Ron, Talaria, Segway, Zero Motorcycles, and many others. This scraper is designed to collect year/make/model data for bikes that fall into the "gray area" between traditional bicycles and motorcycles.

## Features

- **Multi-brand Support**: Scrapes data from 20+ electrified bike manufacturers
- **Automatic Year Generation**: Creates year variants for models (2018-2025)
- **Spec Extraction**: Automatically extracts motor power, battery, speed, range, weight, and price
- **Flexible Architecture**: Supports both Stagehand and Puppeteer for scraping
- **Data Management**: Includes tools for importing, searching, and exporting data
- **Error Handling**: Comprehensive error tracking and retry logic

## Target Brands

### Primary Manufacturers
- **Sur-Ron**: Light Bee, Storm Bee, Ultra Bee
- **Talaria**: Sting, Sting R, XXX, Dragon
- **Segway**: X160, X260, Villain SX10
- **Zero Motorcycles**: SR/F, SR/S, DS, FX series
- **Cake**: Kalk OR, Kalk INK, Osa+
- **Stealth Electric Bikes**: B-52, H-52, F-37
- **Onyx Motorbikes**: RCR, CTY2
- **Super73**: S2, RX, ZX series
- **Ariel Rider**: Grizzly, X-Class, Kepler
- **And many more...**

## Installation

```bash
# Install dependencies
cd scrapers
npm install puppeteer @browserbasehq/stagehand

# Make scripts executable
chmod +x electrified_bike_scraper.js
chmod +x manage_electrified_bikes.js
chmod +x test_electrified_scraper.js
```

## Usage

### Running the Scraper

```bash
# Run the full scraper
node electrified_bike_scraper.js

# Or use the management tool
node manage_electrified_bikes.js scrape
```

### Managing Data

```bash
# View statistics
node manage_electrified_bikes.js stats

# Export to CSV
node manage_electrified_bikes.js export

# Search for specific bikes
node manage_electrified_bikes.js search "sur-ron light bee"
node manage_electrified_bikes.js search "talaria sting"
```

### Testing

```bash
# Run the test suite
node test_electrified_scraper.js
```

## Data Structure

### Scraped Data Format

```json
{
  "timestamp": "2025-01-07T10:00:00.000Z",
  "brands": {
    "Sur-Ron": {
      "name": "Sur-Ron",
      "models": [
        {
          "name": "Light Bee",
          "year": 2023,
          "fullName": "2023 Sur-Ron Light Bee",
          "price": "$4,299",
          "url": "https://sur-ronusa.com/products/light-bee",
          "specs": {
            "motor": "6000W",
            "battery": "60V 32Ah",
            "topSpeed": "45mph",
            "range": "40 miles",
            "weight": "110 lbs"
          }
        }
      ]
    }
  },
  "stats": {
    "totalBrands": 20,
    "totalModels": 150,
    "totalVariants": 1200,
    "errors": []
  }
}
```

### Database Structure

```json
{
  "brands": [
    {
      "id": 1,
      "name": "Sur-Ron",
      "category": "electrified",
      "website": "https://sur-ronusa.com",
      "founded": 2014,
      "headquarters": "China"
    }
  ],
  "models": [
    {
      "id": 1,
      "brand": "Sur-Ron",
      "brandId": 1,
      "name": "Light Bee",
      "year": 2023,
      "fullName": "2023 Sur-Ron Light Bee",
      "category": "performance",
      "specs": {},
      "price": "$4,299",
      "url": "https://...",
      "importedAt": "2025-01-07T10:00:00.000Z"
    }
  ]
}
```

## Spec Extraction

The scraper automatically extracts specifications using regex patterns:

- **Motor Power**: Extracts wattage (W or kW)
- **Battery**: Voltage (V) and amp-hours (Ah) or kilowatt-hours (kWh)
- **Top Speed**: Maximum speed in mph
- **Range**: Distance per charge in miles
- **Weight**: In pounds (lbs) or kilograms (kg)
- **Price**: USD pricing with proper formatting

## Categories

Models are automatically categorized based on specs:

- **high-performance**: ≥5000W motor power
- **performance**: ≥3000W motor power
- **mid-power**: ≥1500W motor power
- **legal-ebike**: ≥750W motor power
- **entry-level**: Lower power models
- **youth**: Models like X160/X260

## Error Handling

The scraper includes comprehensive error handling:

- Network timeouts with retry logic
- Failed selector fallbacks
- Missing data graceful handling
- Error logging with timestamps
- Partial success tracking

## Output Files

- `electrified_bikes_[timestamp].json` - Full scraped data
- `electrified_bikes_summary_[timestamp].json` - Summary report
- `electrified_bikes_database.json` - Persistent database
- `electrified_bikes_export.csv` - CSV export for analysis

## Development

### Adding New Brands

Edit `electrified_bike_scraper.js` and add to the `ELECTRIFIED_BRANDS` array:

```javascript
{
  name: 'New Brand',
  urls: [
    'https://newbrand.com/products',
    'https://newbrand.com/bikes'
  ],
  selectors: {
    products: '.product-card',
    name: '.product-title',
    price: '.price',
    specs: '.specs-list'
  }
}
```

### Extending Spec Patterns

Add new patterns to `SPEC_PATTERNS` in the scraper:

```javascript
SPEC_PATTERNS.newSpec = [
  /pattern1/i,
  /pattern2/i
];
```

## Troubleshooting

### Common Issues

1. **Timeout Errors**: Increase timeout in scraper initialization
2. **Selector Failures**: Check if website structure changed
3. **Rate Limiting**: Add delays between requests
4. **Missing Specs**: Update regex patterns for new formats

### Debug Mode

Enable debug output by modifying the scraper:

```javascript
// In initialize()
this.stagehand = new Stagehand({
  env: "LOCAL",
  enableCaching: false,
  debugDom: true,
  verbose: true  // Add this
});
```

## Future Enhancements

- [ ] Add more Chinese manufacturers
- [ ] Include European brands (NIU, Gogoro)
- [ ] Scrape dealer inventory
- [ ] Track price history
- [ ] Image scraping support
- [ ] Specification comparison tool
- [ ] API endpoint for data access
- [ ] Real-time price monitoring

## License

This scraper is part of the bikenode.com project.