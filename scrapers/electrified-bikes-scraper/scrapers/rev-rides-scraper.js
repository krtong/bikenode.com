const BaseScraper = require('./base-scraper');
const fs = require('fs').promises;
const path = require('path');

class RevRidesScraper extends BaseScraper {
  constructor() {
    super('REV Rides');
    this.baseUrl = 'https://revrides.com';
    this.targetBrands = ['Segway', 'Rawrr', 'E-Ride Pro', 'Altis', 'Arctic Leopard'];
  }

  async scrape() {
    await this.initialize();
    
    try {
      console.log(`🔍 Scraping ${this.name} (Retailer)...`);
      console.log(`   Target brands: ${this.targetBrands.join(', ')}`);
      
      // REV Rides has a collections page
      const collectionsUrl = `${this.baseUrl}/collections/all-bikes`;
      console.log(`   Checking ${collectionsUrl}...`);
      
      const products = await this.scrapeUrl(collectionsUrl, async (page) => {
        // Wait for products to load
        await page.waitForSelector('.product-item, .grid__item', { timeout: 10000 }).catch(() => {});
        
        // Extract product data
        const productData = await page.evaluate((targetBrands) => {
          const products = [];
          const productElements = document.querySelectorAll('.product-item, .grid__item');
          
          productElements.forEach(el => {
            const data = {
              name: null,
              url: null,
              price: null,
              brand: null
            };
            
            // Get product name
            const titleEl = el.querySelector('.product__title, .product-item__title, h3, h4');
            if (titleEl) {
              data.name = titleEl.textContent.trim();
              
              // Check if it's one of our target brands
              for (const brand of targetBrands) {
                if (data.name.toLowerCase().includes(brand.toLowerCase())) {
                  data.brand = brand;
                  break;
                }
              }
            }
            
            // Get product URL
            const linkEl = el.querySelector('a[href*="/products/"]');
            if (linkEl) {
              data.url = linkEl.getAttribute('href');
            }
            
            // Get price (optional)
            const priceEl = el.querySelector('.price, .product__price');
            if (priceEl) {
              data.price = priceEl.textContent.trim();
            }
            
            if (data.brand && data.url) {
              products.push(data);
            }
          });
          
          return products;
        }, this.targetBrands);
        
        return productData;
      });
      
      console.log(`   Found ${products.length} products from target brands`);
      
      // Group results by brand
      const brandResults = {};
      this.targetBrands.forEach(brand => {
        brandResults[brand] = {
          brand,
          models: [],
          errors: []
        };
      });
      
      // Scrape each product page
      for (const product of products) {
        const url = product.url.startsWith('http') ? product.url : this.baseUrl + product.url;
        
        try {
          console.log(`   Scraping ${product.brand}: ${product.name}...`);
          
          const modelData = await this.scrapeUrl(url, async (page) => {
            const data = await page.evaluate(() => {
              const model = {
                name: null,
                specs: {},
                images: [],
                url: window.location.href
              };
              
              // Get product name from detail page
              const titleEl = document.querySelector('h1, .product__title');
              if (titleEl) {
                model.name = titleEl.textContent.trim();
              }
              
              // REV Rides often has specs in a table or list
              const specRows = document.querySelectorAll('.product__description tr, .specs tr');
              specRows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                  const key = cells[0].textContent.trim().toLowerCase();
                  const value = cells[1].textContent.trim();
                  
                  if (key.includes('motor') || key.includes('power')) {
                    model.specs.motor_power = value;
                  } else if (key.includes('battery')) {
                    model.specs.battery = value;
                  } else if (key.includes('top speed') || key.includes('max speed')) {
                    model.specs.top_speed = value;
                  } else if (key.includes('range')) {
                    model.specs.range = value;
                  } else if (key.includes('weight')) {
                    model.specs.weight = value;
                  }
                }
              });
              
              // Also check accordion/tabs for specs
              const accordionContent = document.querySelectorAll('.accordion__content, .tab__content');
              let fullText = '';
              accordionContent.forEach(content => {
                fullText += ' ' + content.textContent;
              });
              model.fullText = fullText;
              
              // Get images
              const images = document.querySelectorAll('.product__media img, .product-photo img');
              model.images = Array.from(images).map(img => img.src).slice(0, 5);
              
              return model;
            });
            
            // Extract specs from full text
            if (data.fullText) {
              const extractedSpecs = this.extractSpecs(data.fullText);
              data.specs = { ...extractedSpecs, ...data.specs };
              delete data.fullText;
            }
            
            return data;
          });
          
          if (modelData.name && product.brand) {
            // Clean model name
            const cleanName = modelData.name
              .replace(new RegExp(product.brand, 'gi'), '')
              .replace(/electric\s*bike/gi, '')
              .trim();
            
            brandResults[product.brand].models.push({
              model: cleanName,
              year: new Date().getFullYear(),
              specs: modelData.specs,
              url: modelData.url,
              images: modelData.images,
              price: product.price,
              source: 'REV Rides'
            });
            
            console.log(`   ✅ ${product.brand} - ${cleanName}`);
          }
          
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
          brandResults[product.brand].errors.push({
            url,
            error: error.message
          });
        }
      }
      
      // Save results for each brand
      for (const [brand, results] of Object.entries(brandResults)) {
        if (results.models.length > 0) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const outputDir = path.join(__dirname, '../data/raw', brand.toLowerCase().replace(/\s+/g, '-'));
          await fs.mkdir(outputDir, { recursive: true });
          
          const outputPath = path.join(outputDir, `rev-rides-${timestamp}.json`);
          await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
          
          console.log(`💾 Saved ${brand} results to: ${outputPath}`);
        }
      }
      
      this.results.metadata.source = this.baseUrl;
      this.results.metadata.type = 'retailer';
      this.results.metadata.brands = Object.keys(brandResults);
      
    } catch (error) {
      console.error(`❌ Fatal error scraping ${this.name}:`, error);
    } finally {
      await this.close();
    }
    
    return this.results;
  }
}

// Run if called directly
if (require.main === module) {
  const scraper = new RevRidesScraper();
  scraper.scrape().then(results => {
    console.log(`\n📊 Summary for ${results.brand}:`);
    console.log(`   Type: ${results.metadata.type}`);
    console.log(`   Brands covered: ${results.metadata.brands?.join(', ') || 'None'}`);
  }).catch(console.error);
}

module.exports = RevRidesScraper;