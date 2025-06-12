#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { Stagehand } from '@browserbasehq/stagehand';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Electrified bike brands to scrape
const ELECTRIFIED_BRANDS = [
  {
    name: 'Sur-Ron',
    urls: [
      'https://sur-ronusa.com/collections/all',
      'https://sur-ron.com/products/'
    ],
    selectors: {
      products: '.product-item, .product-card',
      name: '.product-item__title, .product-card__title, h2.product-title',
      price: '.price, .product-price',
      specs: '.product__description li, .specs-list li',
      link: 'a'
    }
  },
  {
    name: 'Talaria',
    urls: [
      'https://talaria.bike/pages/bikes',
      'https://www.talaria-sting.com/models'
    ],
    selectors: {
      products: '.product-card, .bike-card',
      name: '.product-card__title, .bike-title',
      specs: '.product-card__description, .bike-specs'
    }
  },
  {
    name: 'Segway',
    urls: [
      'https://powersports.segway.com/off-road/',
      'https://store.segway.com/dirt-ebike'
    ],
    selectors: {
      products: '.product-item, .product-card',
      name: '.product-name, .product-title',
      specs: '.product-specs, .features-list'
    }
  },
  {
    name: 'Zero Motorcycles',
    urls: [
      'https://www.zeromotorcycles.com/model',
      'https://www.zeromotorcycles.com/motorcycles'
    ],
    selectors: {
      products: '.model-card, .motorcycle-item',
      name: '.model-name, h3.title',
      specs: '.specs-list, .model-specs'
    }
  },
  {
    name: 'Cake',
    urls: [
      'https://ridecake.com/models',
      'https://ridecake.com/en-US/models'
    ],
    selectors: {
      products: '.model-card, .product-tile',
      name: '.model-name, .product-name',
      specs: '.model-specs, .product-specs'
    }
  },
  {
    name: 'Stealth Electric Bikes',
    urls: [
      'https://www.stealthelectricbikes.com/product-category/electric-bikes/'
    ],
    selectors: {
      products: '.product',
      name: '.woocommerce-loop-product__title',
      price: '.price',
      link: 'a.woocommerce-LoopProduct-link'
    }
  },
  {
    name: 'Onyx Motorbikes',
    urls: [
      'https://onyxmotorbikes.com/collections/bikes'
    ],
    selectors: {
      products: '.product-item',
      name: '.product-item__title',
      price: '.product-item__price'
    }
  },
  {
    name: 'Monday Motorbikes',
    urls: [
      'https://mondaymotorbikes.com/collections/bikes'
    ],
    selectors: {
      products: '.product-item',
      name: '.product-item__title',
      price: '.price'
    }
  },
  {
    name: 'Super73',
    urls: [
      'https://super73.com/collections/bikes'
    ],
    selectors: {
      products: '.product-item',
      name: '.product-item__title',
      price: '.product-price'
    }
  },
  {
    name: 'Ariel Rider',
    urls: [
      'https://arielrider.com/collections/electric-bikes'
    ],
    selectors: {
      products: '.product-item',
      name: '.product-item__title',
      price: '.product-item__price'
    }
  }
];

// Year range for models
const YEAR_RANGE = {
  start: 2018,
  end: 2025
};

// Spec extraction patterns
const SPEC_PATTERNS = {
  motor: [
    /(\d+(?:\.\d+)?)\s*(?:k)?W(?:att)?/i,
    /Motor:\s*(\d+(?:\.\d+)?)\s*(?:k)?W/i,
    /Peak Power:\s*(\d+(?:\.\d+)?)\s*(?:k)?W/i
  ],
  battery: [
    /(\d+(?:\.\d+)?)\s*V\s*(\d+(?:\.\d+)?)\s*Ah/i,
    /Battery:\s*(\d+(?:\.\d+)?V\s*\d+(?:\.\d+)?Ah)/i,
    /(\d+(?:\.\d+)?)\s*kWh/i
  ],
  topSpeed: [
    /Top Speed:\s*(\d+)\s*mph/i,
    /Max Speed:\s*(\d+)\s*mph/i,
    /(\d+)\s*mph\s*top speed/i
  ],
  range: [
    /Range:\s*(\d+)\s*miles/i,
    /(\d+)\s*mile\s*range/i,
    /Up to\s*(\d+)\s*miles/i
  ],
  weight: [
    /Weight:\s*(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/i,
    /(\d+(?:\.\d+)?)\s*kg/i,
    /Weighs?\s*(\d+(?:\.\d+)?)\s*(?:lbs?|kg)/i
  ],
  price: [
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
    /USD\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i
  ]
};

class ElectrifiedBikeScraper {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      brands: {},
      stats: {
        totalBrands: 0,
        totalModels: 0,
        totalVariants: 0,
        errors: []
      }
    };
    this.browser = null;
    this.stagehand = null;
  }

  async initialize() {
    try {
      // Try Stagehand first
      this.stagehand = new Stagehand({
        env: "LOCAL",
        enableCaching: false,
        debugDom: true
      });
      await this.stagehand.init();
      console.log('🚀 Electrified bike scraper initialized with Stagehand');
    } catch (error) {
      console.log('⚠️ Stagehand initialization failed, falling back to Puppeteer');
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async close() {
    if (this.stagehand) {
      await this.stagehand.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }

  // Extract specs from text
  extractSpecs(text) {
    const specs = {};
    
    // Motor power
    for (const pattern of SPEC_PATTERNS.motor) {
      const match = text.match(pattern);
      if (match) {
        const power = parseFloat(match[1]);
        specs.motor = match[0].toLowerCase().includes('kw') ? `${power * 1000}W` : `${power}W`;
        break;
      }
    }
    
    // Battery
    for (const pattern of SPEC_PATTERNS.battery) {
      const match = text.match(pattern);
      if (match) {
        specs.battery = match[0];
        break;
      }
    }
    
    // Top speed
    for (const pattern of SPEC_PATTERNS.topSpeed) {
      const match = text.match(pattern);
      if (match) {
        specs.topSpeed = `${match[1]}mph`;
        break;
      }
    }
    
    // Range
    for (const pattern of SPEC_PATTERNS.range) {
      const match = text.match(pattern);
      if (match) {
        specs.range = `${match[1]} miles`;
        break;
      }
    }
    
    // Weight
    for (const pattern of SPEC_PATTERNS.weight) {
      const match = text.match(pattern);
      if (match) {
        specs.weight = match[0];
        break;
      }
    }
    
    // Price
    for (const pattern of SPEC_PATTERNS.price) {
      const match = text.match(pattern);
      if (match) {
        specs.price = `$${match[1]}`;
        break;
      }
    }
    
    return specs;
  }

  // Scrape a brand's website
  async scrapeBrand(brand) {
    console.log(`\n🏍️ Scraping ${brand.name}...`);
    const brandData = {
      name: brand.name,
      models: [],
      scrapedAt: new Date().toISOString()
    };

    for (const url of brand.urls) {
      try {
        console.log(`  📍 Trying URL: ${url}`);
        const models = await this.scrapeUrl(url, brand);
        if (models && models.length > 0) {
          brandData.models.push(...models);
          console.log(`  ✅ Found ${models.length} models`);
        }
      } catch (error) {
        console.error(`  ❌ Error scraping ${url}:`, error.message);
        this.results.stats.errors.push({
          brand: brand.name,
          url,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Deduplicate models by name
    const uniqueModels = {};
    brandData.models.forEach(model => {
      const key = model.name.toLowerCase().replace(/\s+/g, '-');
      if (!uniqueModels[key] || (model.specs && Object.keys(model.specs).length > Object.keys(uniqueModels[key].specs || {}).length)) {
        uniqueModels[key] = model;
      }
    });
    brandData.models = Object.values(uniqueModels);

    return brandData;
  }

  // Scrape a specific URL
  async scrapeUrl(url, brand) {
    if (this.stagehand) {
      return await this.scrapeWithStagehand(url, brand);
    } else {
      return await this.scrapeWithPuppeteer(url, brand);
    }
  }

  // Scrape using Stagehand
  async scrapeWithStagehand(url, brand) {
    await this.stagehand.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.stagehand.page.waitForTimeout(3000);

    // Try multiple selector combinations
    const models = [];
    const selectors = brand.selectors;

    try {
      const products = await this.stagehand.page.$$(selectors.products);
      
      for (const product of products) {
        const model = {};
        
        // Extract name
        const nameElement = await product.$(selectors.name);
        if (nameElement) {
          model.name = await nameElement.evaluate(el => el.textContent.trim());
        }

        // Extract price
        if (selectors.price) {
          const priceElement = await product.$(selectors.price);
          if (priceElement) {
            const priceText = await priceElement.evaluate(el => el.textContent.trim());
            model.price = priceText;
          }
        }

        // Extract link for detailed specs
        if (selectors.link) {
          const linkElement = await product.$(selectors.link);
          if (linkElement) {
            model.url = await linkElement.evaluate(el => el.href);
          }
        }

        // Extract specs from current page
        if (selectors.specs) {
          const specsElement = await product.$(selectors.specs);
          if (specsElement) {
            const specsText = await specsElement.evaluate(el => el.textContent);
            model.specs = this.extractSpecs(specsText);
          }
        }

        // Get full page text for spec extraction
        const fullText = await product.evaluate(el => el.textContent);
        const extractedSpecs = this.extractSpecs(fullText);
        model.specs = { ...extractedSpecs, ...(model.specs || {}) };

        // Generate year variants
        if (model.name) {
          for (let year = YEAR_RANGE.start; year <= YEAR_RANGE.end; year++) {
            models.push({
              ...model,
              year,
              fullName: `${year} ${brand.name} ${model.name}`
            });
          }
        }
      }
    } catch (error) {
      console.error(`  ⚠️ Selector error:`, error.message);
    }

    return models;
  }

  // Scrape using Puppeteer
  async scrapeWithPuppeteer(url, brand) {
    const page = await this.browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);

    const models = await page.evaluate((selectors) => {
      const results = [];
      const products = document.querySelectorAll(selectors.products);

      products.forEach(product => {
        const model = {};

        // Extract name
        const nameEl = product.querySelector(selectors.name);
        if (nameEl) {
          model.name = nameEl.textContent.trim();
        }

        // Extract price
        if (selectors.price) {
          const priceEl = product.querySelector(selectors.price);
          if (priceEl) {
            model.price = priceEl.textContent.trim();
          }
        }

        // Extract link
        if (selectors.link) {
          const linkEl = product.querySelector(selectors.link);
          if (linkEl) {
            model.url = linkEl.href;
          }
        }

        // Extract specs
        if (selectors.specs) {
          const specsEl = product.querySelector(selectors.specs);
          if (specsEl) {
            model.specsText = specsEl.textContent;
          }
        }

        // Get full text for spec extraction
        model.fullText = product.textContent;

        if (model.name) {
          results.push(model);
        }
      });

      return results;
    }, brand.selectors);

    // Process models and extract specs
    const processedModels = [];
    for (const model of models) {
      const specs = this.extractSpecs(model.fullText || model.specsText || '');
      
      // Generate year variants
      for (let year = YEAR_RANGE.start; year <= YEAR_RANGE.end; year++) {
        processedModels.push({
          name: model.name,
          year,
          fullName: `${year} ${brand.name} ${model.name}`,
          price: model.price,
          url: model.url,
          specs
        });
      }
    }

    await page.close();
    return processedModels;
  }

  // Main scraping function
  async scrapeAll() {
    console.log('🚀 Starting electrified bike scraping...');
    console.log(`📊 Target: ${ELECTRIFIED_BRANDS.length} brands`);
    console.log(`📅 Years: ${YEAR_RANGE.start} - ${YEAR_RANGE.end}`);

    for (const brand of ELECTRIFIED_BRANDS) {
      try {
        const brandData = await this.scrapeBrand(brand);
        this.results.brands[brand.name] = brandData;
        this.results.stats.totalBrands++;
        this.results.stats.totalModels += brandData.models.length;
      } catch (error) {
        console.error(`❌ Failed to scrape ${brand.name}:`, error);
        this.results.stats.errors.push({
          brand: brand.name,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Calculate total variants
    for (const brand in this.results.brands) {
      const brandData = this.results.brands[brand];
      this.results.stats.totalVariants += brandData.models.length;
    }

    return this.results;
  }

  // Save results to file
  async saveResults() {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `electrified_bikes_${timestamp}.json`;
    const filepath = path.join(__dirname, 'downloads', filename);

    // Ensure downloads directory exists
    await fs.mkdir(path.join(__dirname, 'downloads'), { recursive: true });

    await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Results saved to: ${filepath}`);

    // Also save a summary
    const summary = {
      timestamp: this.results.timestamp,
      stats: this.results.stats,
      brands: Object.keys(this.results.brands).map(brand => ({
        name: brand,
        modelCount: this.results.brands[brand].models.length,
        models: this.results.brands[brand].models.map(m => m.name).filter((v, i, a) => a.indexOf(v) === i)
      }))
    };

    const summaryFile = `electrified_bikes_summary_${timestamp}.json`;
    const summaryPath = path.join(__dirname, 'downloads', summaryFile);
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📋 Summary saved to: ${summaryPath}`);
  }

  // Print summary
  printSummary() {
    console.log('\n📊 Scraping Summary:');
    console.log(`  Total Brands: ${this.results.stats.totalBrands}`);
    console.log(`  Total Models: ${this.results.stats.totalModels}`);
    console.log(`  Total Variants: ${this.results.stats.totalVariants}`);
    console.log(`  Errors: ${this.results.stats.errors.length}`);

    console.log('\n📋 Brand Details:');
    for (const brand in this.results.brands) {
      const brandData = this.results.brands[brand];
      const uniqueModels = [...new Set(brandData.models.map(m => m.name))];
      console.log(`  ${brand}: ${uniqueModels.length} models, ${brandData.models.length} variants`);
      uniqueModels.forEach(model => {
        console.log(`    - ${model}`);
      });
    }

    if (this.results.stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.stats.errors.forEach(error => {
        console.log(`  ${error.brand}: ${error.error}`);
      });
    }
  }
}

// Main execution
async function main() {
  const scraper = new ElectrifiedBikeScraper();

  try {
    await scraper.initialize();
    await scraper.scrapeAll();
    await scraper.saveResults();
    scraper.printSummary();
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await scraper.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ElectrifiedBikeScraper;