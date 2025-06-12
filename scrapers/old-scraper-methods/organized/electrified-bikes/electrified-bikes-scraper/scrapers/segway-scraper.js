const BaseScraper = require('./base-scraper');

class SegwayScraper extends BaseScraper {
  constructor() {
    super('Segway');
    this.baseUrl = 'https://store.segway.com';
  }

  async scrape() {
    await this.initialize();
    
    try {
      console.log(`🔍 Scraping ${this.name}...`);
      
      // First, let's check the main page to find actual product URLs
      console.log(`   Checking main site: ${this.baseUrl}`);
      
      const mainPageProducts = await this.scrapeUrl(this.baseUrl, async (page) => {
        // Look for product links on the main page
        await page.waitForSelector('a', { timeout: 5000 }).catch(() => {});
        
        const links = await page.evaluate(() => {
          const productLinks = [];
          const allLinks = document.querySelectorAll('a[href*="dirt"], a[href*="ebike"], a[href*="electric"]');
          
          allLinks.forEach(link => {
            const href = link.getAttribute('href');
            const text = link.textContent.trim();
            if (href && (text.toLowerCase().includes('bike') || href.includes('bike'))) {
              productLinks.push({
                url: href,
                text: text
              });
            }
          });
          
          return productLinks;
        });
        
        return links;
      }).catch(err => {
        console.log(`   Note: Could not load main page - ${err.message}`);
        return [];
      });
      
      // If we found products on main page, use those
      let productUrls = [];
      if (mainPageProducts.length > 0) {
        console.log(`   Found ${mainPageProducts.length} potential products on main page`);
        productUrls = mainPageProducts.map(p => p.url);
      } else {
        // Fall back to known product paths
        console.log(`   Using known product URLs...`);
        productUrls = [
          '/products/segway-dirt-ebike-x160',
          '/products/segway-dirt-ebike-x260',
          '/products/segway-dirt-ebike-xyber'
        ];
      }
      
      for (const productPath of productUrls) {
        const url = productPath.startsWith('http') ? productPath : this.baseUrl + productPath;
        console.log(`   Checking ${url}...`);
        
        try {
          const modelData = await this.scrapeUrl(url, async (page) => {
            // Wait a bit and close any popups
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Try to close common popup selectors
            const popupSelectors = [
              '.popup-close',
              '.modal-close',
              '[aria-label="Close"]',
              '.close-button',
              '.newsletter-close',
              '.popup .close',
              '.modal .close'
            ];
            
            for (const selector of popupSelectors) {
              try {
                await page.click(selector, { timeout: 1000 });
                console.log(`   Closed popup with selector: ${selector}`);
                await new Promise(resolve => setTimeout(resolve, 500));
              } catch (e) {
                // Popup not found or not clickable
              }
            }
            // Extract data from Segway product page
            const data = await page.evaluate(() => {
              const model = {
                name: null,
                specs: {},
                images: [],
                url: window.location.href
              };
              
              // Get product name - avoid popup text
              const titleSelectors = [
                'h1.product__title',
                'h1.product-title',
                '.product-single__title',
                '.product__info h1',
                'h1[itemprop="name"]',
                '.product-main h1'
              ];
              
              for (const selector of titleSelectors) {
                const titleEl = document.querySelector(selector);
                if (titleEl) {
                  const text = titleEl.textContent.trim();
                  // Check if it's a valid product name (not popup text)
                  if (text && 
                      !text.toLowerCase().includes('subscribe') &&
                      !text.toLowerCase().includes('unlock') &&
                      !text.toLowerCase().includes('off your') &&
                      text.length > 3 &&
                      text.length < 100) {
                    model.name = text;
                    break;
                  }
                }
              }
              
              // Fallback: look for product name in meta tags
              if (!model.name) {
                const ogTitle = document.querySelector('meta[property="og:title"]');
                if (ogTitle) {
                  const content = ogTitle.getAttribute('content');
                  if (content && !content.toLowerCase().includes('subscribe')) {
                    model.name = content;
                  }
                }
              }
              
              // Look for spec sections
              const specSections = document.querySelectorAll('.product-specs, .specs-section, .product-info__item');
              const specText = Array.from(specSections).map(el => el.textContent).join(' ');
              
              // Also check for tables
              const tables = document.querySelectorAll('table');
              tables.forEach(table => {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                  const cells = row.querySelectorAll('td, th');
                  if (cells.length >= 2) {
                    const label = cells[0].textContent.trim().toLowerCase();
                    const value = cells[1].textContent.trim();
                    
                    if (label.includes('motor') || label.includes('power')) {
                      model.specs.motor_power = value;
                    } else if (label.includes('battery')) {
                      model.specs.battery = value;
                    } else if (label.includes('speed')) {
                      model.specs.top_speed = value;
                    } else if (label.includes('range')) {
                      model.specs.range = value;
                    } else if (label.includes('weight')) {
                      model.specs.weight = value;
                    }
                  }
                });
              });
              
              // Get images
              const images = document.querySelectorAll('.product-photo img, .product__media img');
              model.images = Array.from(images).map(img => img.src).slice(0, 5);
              
              return model;
            });
            
            // If we didn't get specs from structured data, try extracting from text
            const pageText = await page.evaluate(() => document.body.innerText);
            const extractedSpecs = this.extractSpecs(pageText);
            
            // Merge extracted specs with found specs
            data.specs = { ...extractedSpecs, ...data.specs };
            
            return data;
          });
          
          if (modelData.name) {
            // Extract year from name or default to current
            const yearMatch = modelData.name.match(/20\d{2}/);
            const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
            
            this.results.models.push({
              model: modelData.name.replace(/Segway\s*/i, '').trim(),
              year,
              specs: modelData.specs,
              url: modelData.url,
              images: modelData.images
            });
            
            console.log(`   ✅ Found: ${modelData.name}`);
          }
          
        } catch (error) {
          console.log(`   ❌ Error scraping ${productPath}: ${error.message}`);
          this.results.errors.push({
            url: this.baseUrl + productPath,
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
  const scraper = new SegwayScraper();
  scraper.scrape().then(results => {
    console.log(`\n📊 Summary for ${results.brand}:`);
    console.log(`   Models found: ${results.models.length}`);
    console.log(`   Errors: ${results.errors.length}`);
  }).catch(console.error);
}

module.exports = SegwayScraper;