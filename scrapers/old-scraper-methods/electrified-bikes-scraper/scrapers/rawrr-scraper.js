const BaseScraper = require('./base-scraper');

class RawrrScraper extends BaseScraper {
  constructor() {
    super('Rawrr');
    this.baseUrl = 'https://www.riderawrr.com';
  }

  async scrape() {
    await this.initialize();
    
    try {
      console.log(`🔍 Scraping ${this.name}...`);
      
      // First, get the bikes/products page
      const productsUrl = `${this.baseUrl}/bikes`;
      console.log(`   Checking ${productsUrl}...`);
      
      const products = await this.scrapeUrl(productsUrl, async (page) => {
        // Extract product links
        const productLinks = await page.evaluate(() => {
          const links = [];
          const productElements = document.querySelectorAll('a[href*="/product"], a[href*="/bikes/"], .product-link');
          
          productElements.forEach(el => {
            const href = el.getAttribute('href');
            if (href && !links.includes(href)) {
              links.push(href);
            }
          });
          
          return links;
        });
        
        return productLinks;
      });
      
      console.log(`   Found ${products.length} product links`);
      
      // Scrape each product page
      for (const productPath of products) {
        const url = productPath.startsWith('http') ? productPath : this.baseUrl + productPath;
        
        try {
          const modelData = await this.scrapeUrl(url, async (page) => {
            const data = await page.evaluate(() => {
              const model = {
                name: null,
                specs: {},
                images: [],
                url: window.location.href
              };
              
              // Get product name
              const titleEl = document.querySelector('h1, .product-title, [class*="title"]');
              if (titleEl) {
                model.name = titleEl.textContent.trim();
              }
              
              // Look for specs in various formats
              // Check for spec lists
              const specElements = document.querySelectorAll('.specs li, .product-specs li, [class*="spec"] li');
              specElements.forEach(el => {
                const text = el.textContent.trim();
                model.specs[`raw_${specElements.length}`] = text;
              });
              
              // Check for definition lists
              const dlElements = document.querySelectorAll('dl');
              dlElements.forEach(dl => {
                const dts = dl.querySelectorAll('dt');
                const dds = dl.querySelectorAll('dd');
                
                for (let i = 0; i < Math.min(dts.length, dds.length); i++) {
                  const key = dts[i].textContent.trim().toLowerCase();
                  const value = dds[i].textContent.trim();
                  
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
              
              // Get all text content for extraction
              const contentEl = document.querySelector('.product-description, .product-content, main');
              if (contentEl) {
                model.fullText = contentEl.textContent;
              }
              
              // Get images
              const images = document.querySelectorAll('.product-image img, .gallery img, img[src*="product"]');
              model.images = Array.from(images).map(img => img.src).slice(0, 5);
              
              return model;
            });
            
            // Extract specs from full text if needed
            if (data.fullText) {
              const extractedSpecs = this.extractSpecs(data.fullText);
              data.specs = { ...extractedSpecs, ...data.specs };
              delete data.fullText; // Remove full text from results
            }
            
            return data;
          });
          
          if (modelData.name) {
            // Clean up model name
            const cleanName = modelData.name.replace(/Rawrr\s*/i, '').trim();
            
            this.results.models.push({
              model: cleanName,
              year: new Date().getFullYear(), // Default to current year
              specs: modelData.specs,
              url: modelData.url,
              images: modelData.images
            });
            
            console.log(`   ✅ Found: ${cleanName}`);
          }
          
        } catch (error) {
          console.log(`   ❌ Error scraping ${url}: ${error.message}`);
          this.results.errors.push({ url, error: error.message });
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
  const scraper = new RawrrScraper();
  scraper.scrape().then(results => {
    console.log(`\n📊 Summary for ${results.brand}:`);
    console.log(`   Models found: ${results.models.length}`);
    console.log(`   Errors: ${results.errors.length}`);
  }).catch(console.error);
}

module.exports = RawrrScraper;