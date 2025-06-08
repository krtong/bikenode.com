# RevZilla Scraper

A comprehensive web scraper for RevZilla.com to collect motorcycle gear product data including helmets, jackets, gloves, boots, and pants.

## Features

- **Product Listing Scraper**: Extracts products from category pages
- **Product Detail Scraper**: Gets detailed information for each product including:
  - Name, brand, SKU
  - Prices (regular and sale)
  - Ratings and review counts
  - Full descriptions
  - Features and specifications
  - Available sizes
  - Multiple product images
- **Image Downloader**: Downloads and saves product images locally
- **Database Integration**: Stores scraped data in PostgreSQL database
- **Rate Limiting**: Built-in delays to avoid being blocked

## Setup

1. Install dependencies:
```bash
cd scrapers
npm install
```

2. Set up environment variables (create `.env` file):
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bikenode
DB_USER=postgres
DB_PASSWORD=postgres
```

## Usage

### Scrape a specific category:
```bash
node run_revzilla_category.js motorcycle-helmets
```

### Scrape all major categories:
```bash
node revzilla_scraper.js
```

### Import scraped data to database:
```bash
node revzilla_db_integration.js
```

### Available categories:
- `motorcycle-helmets`
- `motorcycle-jackets`
- `motorcycle-gloves`
- `motorcycle-boots`
- `motorcycle-pants`

## Data Structure

Scraped products are saved as JSON files in `revzilla_data/` directory with the following structure:

```json
{
  "url": "https://www.revzilla.com/...",
  "name": "Product Name",
  "brand": "Brand Name",
  "price": "$299.99",
  "salePrice": "$249.99",
  "rating": "4.5",
  "reviewCount": "123",
  "description": "Full product description...",
  "features": ["Feature 1", "Feature 2"],
  "specifications": {
    "Material": "Leather",
    "Weight": "2.5 lbs"
  },
  "images": ["url1", "url2"],
  "sizes": [
    {"value": "SM", "text": "Small", "available": true},
    {"value": "MD", "text": "Medium", "available": true}
  ]
}
```

## Database Schema

The `gear_products` table stores all product information with indexes on commonly queried fields (brand, category, price, rating).

## API Examples

```javascript
// Search for products
const results = await db.searchProducts('leather jacket', {
  category: 'motorcycle-jackets',
  minPrice: 100,
  maxPrice: 500,
  minRating: 4
});

// Get top rated products
const topRated = await db.getTopRatedProducts(10);

// Get products by category
const helmets = await db.getProductsByCategory('motorcycle-helmets', 20);
```

## Notes

- The scraper runs in non-headless mode by default for debugging
- Images are downloaded to `revzilla_data/images/`
- Rate limiting delays: 2s between pages, 3s between product details
- Maximum 100 products per search query to prevent overwhelming the database