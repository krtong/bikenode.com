const BaseScraper = require('./base-scraper');
const fs = require('fs').promises;
const path = require('path');

class SmartScraper extends BaseScraper {
  constructor(brandConfig) {
    super(brandConfig.name);
    this.brandConfig = brandConfig;
    this.baseUrl = brandConfig.url;
  }

  async scrape() {
    await this.initialize();
    
    try {
      console.log(`\n🔍 Smart Scraping ${this.name}...`);
      console.log(`   URL: ${this.baseUrl}`);
      
      // Strategy 1: Direct product URLs if known
      if (this.brandConfig.knownProducts) {
        console.log(`   Using ${this.brandConfig.knownProducts.length} known products`);
        
        for (const product of this.brandConfig.knownProducts) {
          await this.scrapeProduct(product);
        }
      }
      
      // Strategy 2: Search for products on main page
      if (!this.brandConfig.skipMainPage) {
        await this.findProductsOnMainPage();
      }
      
      // Strategy 3: Try common e-commerce patterns
      if (this.results.models.length === 0) {
        await this.tryCommonPatterns();
      }
      
      this.results.metadata.source = this.baseUrl;
      await this.saveResults();
      
    } catch (error) {
      console.error(`❌ Fatal error scraping ${this.name}:`, error);
    } finally {
      await this.close();
    }
    
    return this.results;
  }

  async scrapeProduct(productInfo) {
    const url = productInfo.url.startsWith('http') ? productInfo.url : this.baseUrl + productInfo.url;
    
    try {
      console.log(`   📄 Scraping: ${productInfo.name || url}`);
      
      const modelData = await this.scrapeUrl(url, async (page) => {
        // Wait for content to load
        await new Promise(r => setTimeout(r, 3000));
        
        // Try to click any "Show Specs" buttons
        await page.evaluate(() => {
          const buttons = document.querySelectorAll('button, a');
          buttons.forEach(btn => {
            const text = btn.textContent.toLowerCase();
            if (text.includes('spec') || text.includes('detail') || text.includes('more')) {
              btn.click();
            }
          });
        }).catch(() => {});
        
        await new Promise(r => setTimeout(r, 1000));
        
        // Extract all data
        const data = await page.evaluate(() => {
          const model = {
            name: null,
            specs: {},
            images: [],
            url: window.location.href,
            rawSpecs: []
          };
          
          // Get product name
          const nameSelectors = ['h1', '.product-title', '.product-name', '[class*="title"]'];
          for (const selector of nameSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent.trim()) {
              model.name = el.textContent.trim();
              break;
            }
          }
          
          // Collect all text that might contain specs
          const specContainers = document.querySelectorAll(
            '.specs, .specifications, .product-specs, .technical-specs, ' +
            '.product-details, .product-info, .features, ' +
            '[class*="spec"], [class*="detail"], [class*="feature"]'
          );
          
          specContainers.forEach(container => {
            // Look for key-value pairs in lists
            const items = container.querySelectorAll('li, dt, dd, tr');
            items.forEach(item => {
              const text = item.textContent.trim();
              if (text) {
                model.rawSpecs.push(text);
              }
            });
            
            // Also get full text
            model.rawSpecs.push(container.textContent);
          });
          
          // Get images
          const imgSelectors = [
            '.product-image img',
            '.product-photo img',
            '.gallery img',
            '[class*="product"] img',
            'img[src*="product"]',
            'img[alt*="' + (model.name || 'bike') + '"]'
          ];
          
          const seenImages = new Set();
          imgSelectors.forEach(selector => {
            const images = document.querySelectorAll(selector);
            images.forEach(img => {
              const src = img.src;
              if (src && !seenImages.has(src) && 
                  !src.includes('placeholder') && 
                  !src.includes('logo')) {
                seenImages.add(src);
                model.images.push(src);
              }
            });
          });
          
          model.images = model.images.slice(0, 5);
          
          // Get structured data if available
          const ldJson = document.querySelector('script[type="application/ld+json"]');
          if (ldJson) {
            try {
              const data = JSON.parse(ldJson.textContent);
              model.structuredData = data;
            } catch (e) {}
          }
          
          return model;
        });
        
        // Process raw specs
        if (data.rawSpecs.length > 0) {
          const allSpecText = data.rawSpecs.join(' ');
          const extractedSpecs = this.extractSpecs(allSpecText);
          
          // Also try to extract from structured patterns
          data.rawSpecs.forEach(specLine => {
            if (specLine.includes(':')) {
              const parts = specLine.split(':');
              if (parts.length === 2) {
                const key = parts[0].trim().toLowerCase();
                const value = parts[1].trim();
                
                if (key.includes('motor') && !data.specs.motor_power) {
                  data.specs.motor_power = value;
                } else if (key.includes('battery') && !data.specs.battery) {
                  data.specs.battery = value;
                } else if ((key.includes('speed') || key.includes('mph')) && !data.specs.top_speed) {
                  data.specs.top_speed = value;
                } else if (key.includes('range') && !data.specs.range) {
                  data.specs.range = value;
                } else if (key.includes('weight') && !data.specs.weight) {
                  data.specs.weight = value;
                }
              }
            }
          });
          
          data.specs = { ...extractedSpecs, ...data.specs };
        }
        
        delete data.rawSpecs;
        return data;
      });
      
      if (modelData.name || productInfo.name) {
        const finalName = modelData.name || productInfo.name;
        const cleanName = finalName
          .replace(new RegExp(this.name, 'gi'), '')
          .replace(/electric\s*bike/gi, '')
          .replace(/e-?bike/gi, '')
          .trim();
        
        this.results.models.push({
          model: cleanName || finalName,
          year: productInfo.year || new Date().getFullYear(),
          specs: modelData.specs,
          url: modelData.url,
          images: modelData.images,
          source: this.name + ' Official'
        });
        
        const specCount = Object.keys(modelData.specs).length;
        console.log(`   ✅ Found: ${cleanName} (${specCount} specs)`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.results.errors.push({
        url,
        error: error.message
      });
    }
  }

  async findProductsOnMainPage() {
    console.log(`   🔎 Searching for products on main page...`);
    
    try {
      const products = await this.scrapeUrl(this.baseUrl, async (page) => {
        await new Promise(r => setTimeout(r, 3000));
        
        const foundProducts = await page.evaluate((brandName) => {
          const products = [];
          const seen = new Set();
          
          // Look for product links
          const links = document.querySelectorAll('a');
          links.forEach(link => {
            const href = link.getAttribute('href');
            const text = link.textContent.trim();
            
            if (href && !seen.has(href)) {
              // Check if this looks like a product
              const lowerText = text.toLowerCase();
              const lowerHref = href.toLowerCase();
              
              if ((lowerText.includes('bike') || 
                   lowerText.includes('model') ||
                   lowerText.includes(brandName.toLowerCase()) ||
                   lowerHref.includes('product') ||
                   lowerHref.includes('model') ||
                   lowerHref.includes('bike')) &&
                  !lowerHref.includes('blog') &&
                  !lowerHref.includes('news') &&
                  !lowerHref.includes('about')) {
                
                seen.add(href);
                products.push({
                  url: href,
                  name: text
                });
              }
            }
          });
          
          return products.slice(0, 10); // Limit to 10 products
        }, this.name);
        
        return foundProducts;
      });
      
      console.log(`   Found ${products.length} potential products`);
      
      for (const product of products) {
        await this.scrapeProduct(product);
      }
      
    } catch (error) {
      console.log(`   Could not search main page: ${error.message}`);
    }
  }

  async tryCommonPatterns() {
    console.log(`   🔄 Trying common e-commerce patterns...`);
    
    const patterns = [
      '/products', '/shop', '/bikes', '/models', 
      '/collections/all', '/catalog', '/store'
    ];
    
    for (const pattern of patterns) {
      const url = this.baseUrl + pattern;
      
      try {
        console.log(`   Checking ${url}...`);
        
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          console.log(`   ✓ Found valid path: ${pattern}`);
          // Could implement scraping logic here
        }
      } catch (error) {
        // Path doesn't exist
      }
    }
  }
}

// Configuration for different brands
const brandConfigs = {
  'segway': {
    name: 'Segway',
    url: 'https://store.segway.com',
    knownProducts: [
      { url: '/segway-ebike-xyber', name: 'Segway eBike Xyber' },
      { url: '/segway-ebike-xafari', name: 'Segway eBike Xafari' }
    ]
  },
  'surron': {
    name: 'Sur-Ron',
    url: 'https://www.sur-ronusa.com',
    knownProducts: [
      { url: '/light-bee/', name: 'Light Bee X' },
      { url: '/storm-bee/', name: 'Storm Bee' }
    ]
  },
  'rawrr': {
    name: 'Rawrr',
    url: 'https://www.riderawrr.com',
    skipMainPage: false
  },
  'zeromotorcycles': {
    name: 'Zero Motorcycles',
    url: 'https://www.zeromotorcycles.com',
    knownProducts: [
      { url: '/zero-s', name: 'Zero S' },
      { url: '/zero-sr', name: 'Zero SR' },
      { url: '/zero-ds', name: 'Zero DS' },
      { url: '/zero-dsr', name: 'Zero DSR' },
      { url: '/zero-fx', name: 'Zero FX' }
    ]
  }
};

// Run specific brand or all
async function runSmartScraper(brandKey) {
  if (brandKey && brandConfigs[brandKey]) {
    const scraper = new SmartScraper(brandConfigs[brandKey]);
    return await scraper.scrape();
  } else {
    console.log('Running all configured brands...');
    const results = [];
    
    for (const [key, config] of Object.entries(brandConfigs)) {
      const scraper = new SmartScraper(config);
      const result = await scraper.scrape();
      results.push(result);
      
      // Wait between brands
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    return results;
  }
}

// CLI interface
if (require.main === module) {
  const brand = process.argv[2];
  
  runSmartScraper(brand).then(results => {
    console.log('\n✅ Smart scraping complete');
  }).catch(console.error);
}

module.exports = { SmartScraper, runSmartScraper, brandConfigs };