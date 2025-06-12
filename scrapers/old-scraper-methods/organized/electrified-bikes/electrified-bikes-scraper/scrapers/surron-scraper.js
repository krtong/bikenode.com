const BaseScraper = require('./base-scraper');

class SurRonScraper extends BaseScraper {
  constructor() {
    super('Sur-Ron');
    this.baseUrl = 'https://www.sur-ronusa.com';
  }

  async scrape() {
    await this.initialize();
    
    try {
      console.log(`🔍 Scraping ${this.name}...`);
      
      // Sur-Ron USA likely has a products or models page
      const possibleUrls = [
        `${this.baseUrl}/models`,
        `${this.baseUrl}/products`,
        `${this.baseUrl}/bikes`,
        `${this.baseUrl}/`
      ];
      
      let products = [];
      
      for (const checkUrl of possibleUrls) {
        console.log(`   Checking ${checkUrl}...`);
        
        try {
          const foundProducts = await this.scrapeUrl(checkUrl, async (page) => {
            // Wait for any product elements
            await page.waitForSelector('a, .model, .product', { timeout: 5000 }).catch(() => {});
            
            // Extract product links
            const productData = await page.evaluate(() => {
              const products = [];
              const seen = new Set();
              
              // Look for Sur-Ron model links
              const selectors = [
                'a[href*="light-bee"]',
                'a[href*="storm"]',
                'a[href*="ultra-bee"]',
                'a[href*="/models/"]',
                'a[href*="/products/"]',
                '.model-link a',
                '.product-item a'
              ];
              
              selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                  const href = el.getAttribute('href');
                  const text = el.textContent.trim();
                  
                  if (href && !seen.has(href) && 
                      (text.toLowerCase().includes('bee') || 
                       text.toLowerCase().includes('storm') ||
                       href.includes('models'))) {
                    seen.add(href);
                    products.push({
                      url: href,
                      name: text
                    });
                  }
                });
              });
              
              // Also check for model names in headings
              const headings = document.querySelectorAll('h2, h3, h4');
              headings.forEach(h => {
                const text = h.textContent.trim();
                if (text.toLowerCase().includes('light bee') ||
                    text.toLowerCase().includes('storm') ||
                    text.toLowerCase().includes('ultra bee')) {
                  const link = h.querySelector('a') || h.closest('a');
                  if (link) {
                    const href = link.getAttribute('href');
                    if (href && !seen.has(href)) {
                      seen.add(href);
                      products.push({
                        url: href,
                        name: text
                      });
                    }
                  }
                }
              });
              
              return products;
            });
            
            return productData;
          });
          
          if (foundProducts.length > 0) {
            products = foundProducts;
            console.log(`   Found ${products.length} potential models`);
            break;
          }
        } catch (error) {
          console.log(`   Could not load ${checkUrl}`);
        }
      }
      
      // Known Sur-Ron models if we couldn't find them dynamically
      if (products.length === 0) {
        console.log(`   Using known Sur-Ron models...`);
        products = [
          { url: '/models/light-bee-x', name: 'Light Bee X' },
          { url: '/models/light-bee-s', name: 'Light Bee S' },
          { url: '/models/storm-bee', name: 'Storm Bee' },
          { url: '/models/ultra-bee', name: 'Ultra Bee' }
        ];
      }
      
      // Scrape each model page
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
              
              // Get model name
              const titleEl = document.querySelector('h1, .model-title, .product-title');
              if (titleEl) {
                model.name = titleEl.textContent.trim();
              }
              
              // Look for specifications
              // Sur-Ron often uses tables or definition lists
              const specTables = document.querySelectorAll('table');
              specTables.forEach(table => {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                  const cells = row.querySelectorAll('td');
                  if (cells.length >= 2) {
                    const key = cells[0].textContent.trim().toLowerCase();
                    const value = cells[1].textContent.trim();
                    
                    if (key.includes('motor')) {
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
              });
              
              // Check for spec lists
              const specLists = document.querySelectorAll('.specs ul li, .specifications li');
              specLists.forEach(item => {
                const text = item.textContent.trim();
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
              
              // Get full text for extraction
              const contentEl = document.querySelector('.model-content, .product-content, main, article');
              if (contentEl) {
                model.fullText = contentEl.textContent;
              }
              
              // Get images
              const images = document.querySelectorAll(
                '.model-image img, .product-image img, .gallery img, img[src*="surron"], img[src*="light-bee"], img[src*="storm"]'
              );
              model.images = Array.from(images)
                .map(img => img.src)
                .filter(src => !src.includes('logo') && !src.includes('icon'))
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
              .replace(/Sur-?Ron\s*/i, '')
              .trim();
            
            this.results.models.push({
              model: cleanName || modelData.name,
              year: new Date().getFullYear(),
              specs: modelData.specs,
              url: modelData.url,
              images: modelData.images,
              source: 'Sur-Ron USA Official'
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
  const scraper = new SurRonScraper();
  scraper.scrape().then(results => {
    console.log(`\n📊 Summary for ${results.brand}:`);
    console.log(`   Models found: ${results.models.length}`);
    console.log(`   Errors: ${results.errors.length}`);
  }).catch(console.error);
}

module.exports = SurRonScraper;