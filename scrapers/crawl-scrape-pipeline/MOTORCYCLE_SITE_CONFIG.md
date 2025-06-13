# Motorcycle Site Configuration for Crawler-Scraper Pipeline

## Example: RevZilla Configuration

RevZilla is a major motorcycle gear retailer with thousands of products. Here's how to configure the pipeline for it:

### Step 1: Map the Site
```bash
python 01_map/run_map.py revzilla.com
```

This will discover all URLs including:
- Product pages (`/motorcycle/arai-corsair-x-helmet`)
- Category pages (`/motorcycle-helmets`)
- Brand pages (`/arai`)
- Content pages (`/common-tread/`)

### Step 2: Configure Filtering
After mapping, you'll want to filter to specific page types. Edit the filter logic to focus on:
- Product pages (contain pricing, specs, images)
- Category pages (for discovering products)

### Step 3: Group by Template
RevZilla URL patterns:
- Products: `/motorcycle/*` or `/atv/*` or `/snow/*`
- Categories: `/motorcycle-*` (e.g., `/motorcycle-helmets`)
- Brands: Single word paths like `/arai`, `/shoei`

### Step 4: Define CSS Selectors
Create `06_plan/css_selectors.yaml`:
```yaml
product_page:
  product_info:
    selector: "div.product-show"
    fields:
      name: "h1.product-title::text"
      price: "span.price::text"
      brand: "a.brand-link::text"
      sku: "span.sku::text"
      rating: "div.rating span.score::text"
      review_count: "div.rating span.count::text"
      
  specs:
    selector: "div.product-specs"
    fields:
      features: "ul.features li::text"
      
  images:
    selector: "div.product-images"
    fields:
      main_image: "img.main-image::attr(src)"
      thumbnails: "img.thumbnail::attr(src)"

category_page:
  products:
    selector: "div.product-tile"
    fields:
      url: "a.product-link::attr(href)"
      name: "h3.product-name::text"
      price: "span.price::text"
      brand: "span.brand::text"
```

### Step 5: Run the Pipeline
```bash
# Test on sample first
python 07_sample/crawl_sample.py --domain revzilla.com

# If looks good, run full crawl
python 08_fetch/crawl_full.py --domain revzilla.com

# Extract data
python 09_scrape/parse_dom.py --domain revzilla.com

# Clean and dedupe
python 10_dedupe/dedupe.py
python 11_clean/clean.py

# Load to database or files
python 12_load/load_files.py --domain revzilla.com
```

## Other Motorcycle Sites to Configure

### 1. Cycle Gear
- Similar to RevZilla
- Products at `/p/*` 
- Categories at `/c/*`

### 2. BikeBandit
- Products: `/product/*`
- Parts lookup by bike model

### 3. Manufacturer Sites
- **Yamaha**: yamaha-motor.com
- **Honda**: powersports.honda.com
- **Kawasaki**: kawasaki.com
- **Suzuki**: suzukicycles.com

Each requires custom selectors based on their HTML structure.

## Integration with Existing Scrapers

The pipeline can complement existing scrapers in `/scrapers/old-scraper-methods/`:
- Use pipeline for discovery and bulk download
- Use specialized scrapers for complex extraction
- Pipeline handles scheduling, retries, and storage