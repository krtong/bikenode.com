const BaseScraper = require('./base-scraper');

class ErideProScraper extends BaseScraper {
  constructor() {
    super('E-Ride Pro');
    this.baseUrl = 'https://www.eridepro.com';
  }

  async scrape() {
    await this.initialize();
    
    try {
      console.log(`🔍 Scraping ${this.name}...`);
      
      // E-Ride Pro has a products page
      const productsUrl = `${this.baseUrl}/products`;
      console.log(`   Checking ${productsUrl}...`);
      
      const products = await this.scrapeUrl(productsUrl, async (page) => {
        // Wait for products to load
        await page.waitForSelector('.product-card, .product-item, [class*="product"]', { timeout: 10000 }).catch(() => {});
        
        // Extract product links
        const productData = await page.evaluate(() => {
          const products = [];
          const productElements = document.querySelectorAll('a[href*="/products/"], .product-card a, .product-item a');
          
          productElements.forEach(el => {
            const href = el.getAttribute('href');
            const nameEl = el.querySelector('.product-title, .product-name, h3, h4') || el;
            
            if (href && href.includes('/products/')) {
              products.push({
                url: href,
                name: nameEl.textContent.trim()
              });
            }
          });
          
          return products;
        });
        
        return productData;
      });
      
      console.log(`   Found ${products.length} products`);
      
      // Scrape each product page
      for (const product of products) {
        const url = product.url.startsWith('http') ? product.url : this.baseUrl + product.url;
        
        try {
          console.log(`   Scraping: ${product.name}...`);
          
          const modelData = await this.scrapeUrl(url, async (page) => {
            const data = await page.evaluate(() => {
              const model = {
                name: null,
                specs: {},
                images: [],
                url: window.location.href
              };
              
              // Get product name from detail page
              const titleEl = document.querySelector('h1, .product-title, .product-name');
              if (titleEl) {
                model.name = titleEl.textContent.trim();
              }
              
              // Look for specs in various formats
              // Check for spec lists
              const specSections = document.querySelectorAll('.specs, .specifications, .product-specs, .technical-specs');
              specSections.forEach(section => {
                // Check for list items
                const items = section.querySelectorAll('li');
                items.forEach(item => {
                  const text = item.textContent.trim();
                  const colonIndex = text.indexOf(':');
                  
                  if (colonIndex > -1) {
                    const key = text.substring(0, colonIndex).trim().toLowerCase();
                    const value = text.substring(colonIndex + 1).trim();
                    
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
                
                // Check for tables
                const tables = section.querySelectorAll('table');
                tables.forEach(table => {
                  const rows = table.querySelectorAll('tr');
                  rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                      const key = cells[0].textContent.trim().toLowerCase();
                      const value = cells[1].textContent.trim();
                      
                      if (key.includes('motor') || key.includes('power')) {
                        model.specs.motor_power = value;
                      } else if (key.includes('battery')) {
                        model.specs.battery = value;
                      } else if (key.includes('speed')) {
                        model.specs.top_speed = value;
                      } else if (key.includes('range')) {
                        model.specs.range = value;
                      } else if (key.includes('weight')) {
                        model.specs.weight = value;
                      }
                    }
                  });
                });
              });
              
              // Get all text for extraction
              const contentEl = document.querySelector('.product-description, .product-details, .product-content, main');
              if (contentEl) {
                model.fullText = contentEl.textContent;
              }
              
              // Get images
              const images = document.querySelectorAll('.product-image img, .product-gallery img, .product-photo img');
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
          
          if (modelData.name) {
            // Clean model name
            const cleanName = modelData.name
              .replace(/E-Ride Pro\s*/i, '')
              .replace(/electric\s*bike/gi, '')
              .trim();
            
            this.results.models.push({
              model: cleanName || modelData.name,
              year: new Date().getFullYear(),
              specs: modelData.specs,
              url: modelData.url,
              images: modelData.images,
              source: 'E-Ride Pro Official'
            });
            
            console.log(`   ✅ Found: ${cleanName || modelData.name}`);
          }
          
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
          this.results.errors.push({
            url,
            error: error.message
          });
        }
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
}

// Run if called directly
if (require.main === module) {
  const scraper = new ErideProScraper();
  scraper.scrape().then(results => {
    console.log(`\n📊 Summary for ${results.brand}:`);
    console.log(`   Models found: ${results.models.length}`);
    console.log(`   Errors: ${results.errors.length}`);
  }).catch(console.error);
}

module.exports = ErideProScraper;