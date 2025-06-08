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
      
      // Segway has specific product pages for their dirt eBikes
      const productUrls = [
        '/products/segway-dirt-ebike-x160',
        '/products/segway-dirt-ebike-x260',
        '/products/segway-dirt-ebike-xyber'
      ];
      
      for (const productPath of productUrls) {
        const url = this.baseUrl + productPath;
        console.log(`   Checking ${url}...`);
        
        try {
          const modelData = await this.scrapeUrl(url, async (page) => {
            // Extract data from Segway product page
            const data = await page.evaluate(() => {
              const model = {
                name: null,
                specs: {},
                images: [],
                url: window.location.href
              };
              
              // Get product name
              const titleEl = document.querySelector('h1, .product-title, .product__title');
              if (titleEl) {
                model.name = titleEl.textContent.trim();
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