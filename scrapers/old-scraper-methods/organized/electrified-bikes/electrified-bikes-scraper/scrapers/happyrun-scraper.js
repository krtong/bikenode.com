const BaseScraper = require('./base-scraper');

class HappyRunScraper extends BaseScraper {
  constructor() {
    super('HappyRun');
    this.baseUrl = 'https://www.happyrunebike.com';
  }

  async scrape() {
    await this.initialize();
    
    try {
      console.log(`🔍 Scraping ${this.name}...`);
      
      // HappyRun collections page
      const collectionsUrl = `${this.baseUrl}/collections/e-bikes`;
      console.log(`   Checking ${collectionsUrl}...`);
      
      const products = await this.scrapeUrl(collectionsUrl, async (page) => {
        // Wait for products to load
        await page.waitForSelector('.product-item, .grid__item, .collection-product', { timeout: 10000 }).catch(() => {});
        
        // Extract product data
        const productData = await page.evaluate(() => {
          const products = [];
          
          // Try multiple selectors for Shopify-style sites
          const selectors = [
            '.product-item',
            '.grid__item',
            '.collection-product',
            '.product-grid-item'
          ];
          
          selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              const linkEl = el.querySelector('a[href*="/products/"]');
              const titleEl = el.querySelector('.product-item__title, .product__title, h3, h4');
              
              if (linkEl && titleEl) {
                const url = linkEl.getAttribute('href');
                const name = titleEl.textContent.trim();
                
                // Only add if it's likely an e-bike
                if (name.toLowerCase().includes('bike') || 
                    name.toLowerCase().includes('ebike') ||
                    name.toLowerCase().includes('electric')) {
                  products.push({ url, name });
                }
              }
            });
          });
          
          // Remove duplicates
          const seen = new Set();
          return products.filter(p => {
            if (seen.has(p.url)) return false;
            seen.add(p.url);
            return true;
          });
        });
        
        return productData;
      });
      
      console.log(`   Found ${products.length} e-bike products`);
      
      // Scrape each product
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
              
              // Get product name
              const titleEl = document.querySelector('h1, .product__title');
              if (titleEl) {
                model.name = titleEl.textContent.trim();
              }
              
              // HappyRun often uses metafields or description for specs
              const specSections = document.querySelectorAll(
                '.product__description, .product-single__description, .rte'
              );
              
              let fullText = '';
              specSections.forEach(section => {
                fullText += ' ' + section.textContent;
                
                // Look for lists with specs
                const lists = section.querySelectorAll('ul, ol');
                lists.forEach(list => {
                  const items = list.querySelectorAll('li');
                  items.forEach(item => {
                    const text = item.textContent.trim();
                    
                    // Common patterns in HappyRun listings
                    if (text.includes(':')) {
                      const [key, value] = text.split(':').map(s => s.trim());
                      const keyLower = key.toLowerCase();
                      
                      if (keyLower.includes('motor')) {
                        model.specs.motor_power = value;
                      } else if (keyLower.includes('battery')) {
                        model.specs.battery = value;
                      } else if (keyLower.includes('speed')) {
                        model.specs.top_speed = value;
                      } else if (keyLower.includes('range')) {
                        model.specs.range = value;
                      } else if (keyLower.includes('weight')) {
                        model.specs.weight = value;
                      }
                    }
                  });
                });
              });
              
              // Check product metafields (Shopify)
              const metafields = document.querySelectorAll('.product-metafield');
              metafields.forEach(field => {
                const label = field.querySelector('.metafield-label');
                const value = field.querySelector('.metafield-value');
                
                if (label && value) {
                  const key = label.textContent.trim().toLowerCase();
                  const val = value.textContent.trim();
                  
                  if (key.includes('motor')) {
                    model.specs.motor_power = val;
                  } else if (key.includes('battery')) {
                    model.specs.battery = val;
                  } else if (key.includes('speed')) {
                    model.specs.top_speed = val;
                  } else if (key.includes('range')) {
                    model.specs.range = val;
                  } else if (key.includes('weight')) {
                    model.specs.weight = val;
                  }
                }
              });
              
              model.fullText = fullText;
              
              // Get images
              const images = document.querySelectorAll(
                '.product__media img, .product-single__photo img, .product-image img'
              );
              model.images = Array.from(images)
                .map(img => img.src)
                .filter(src => !src.includes('placeholder'))
                .slice(0, 5);
              
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
              .replace(/HappyRun\s*/i, '')
              .replace(/electric\s*bike/gi, '')
              .replace(/e-?bike/gi, '')
              .trim();
            
            this.results.models.push({
              model: cleanName || modelData.name,
              year: new Date().getFullYear(),
              specs: modelData.specs,
              url: modelData.url,
              images: modelData.images,
              source: 'HappyRun Official'
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
  const scraper = new HappyRunScraper();
  scraper.scrape().then(results => {
    console.log(`\n📊 Summary for ${results.brand}:`);
    console.log(`   Models found: ${results.models.length}`);
    console.log(`   Errors: ${results.errors.length}`);
  }).catch(console.error);
}

module.exports = HappyRunScraper;