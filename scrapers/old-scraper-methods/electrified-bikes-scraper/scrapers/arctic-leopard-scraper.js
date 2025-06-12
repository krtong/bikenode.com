const BaseScraper = require('./base-scraper');

class ArcticLeopardScraper extends BaseScraper {
  constructor() {
    super('Arctic Leopard');
    this.baseUrl = 'https://www.arcticleopard.com';
  }

  async scrape() {
    await this.initialize();
    
    try {
      console.log(`🔍 Scraping ${this.name}...`);
      
      // Arctic Leopard likely has a products or bikes page
      const possibleUrls = [
        `${this.baseUrl}/products`,
        `${this.baseUrl}/bikes`,
        `${this.baseUrl}/collections/all`,
        `${this.baseUrl}/shop`
      ];
      
      let products = [];
      
      // Try different URLs to find products
      for (const checkUrl of possibleUrls) {
        console.log(`   Checking ${checkUrl}...`);
        
        try {
          const foundProducts = await this.scrapeUrl(checkUrl, async (page) => {
            // Wait for any product elements
            await page.waitForSelector('a[href*="/product"], .product, .bike-item', { timeout: 5000 }).catch(() => {});
            
            // Extract product links and names
            const productData = await page.evaluate(() => {
              const products = [];
              const seen = new Set();
              
              // Try multiple selectors
              const selectors = [
                'a[href*="/product"]',
                'a[href*="/collections/"] .product-link',
                '.product-card a',
                '.bike-item a',
                '.collection-product a'
              ];
              
              selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                  const href = el.getAttribute('href');
                  if (href && !seen.has(href)) {
                    seen.add(href);
                    
                    // Try to get product name
                    const nameEl = el.querySelector('.product-title, .product-name, h3, h4, .title') || el;
                    
                    products.push({
                      url: href,
                      name: nameEl.textContent.trim()
                    });
                  }
                });
              });
              
              return products;
            });
            
            return productData;
          });
          
          if (foundProducts.length > 0) {
            products = foundProducts;
            console.log(`   Found ${products.length} products at ${checkUrl}`);
            break;
          }
        } catch (error) {
          console.log(`   No products found at ${checkUrl}`);
        }
      }
      
      // Scrape each product page
      for (const product of products) {
        const url = product.url.startsWith('http') ? product.url : this.baseUrl + product.url;
        
        // Skip if not a bike product
        if (product.name && !product.name.toLowerCase().includes('bike') && 
            !product.name.toLowerCase().includes('electric') &&
            !product.name.toLowerCase().includes('e-bike')) {
          continue;
        }
        
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
              const titleEl = document.querySelector('h1, .product-title, .product__title, .product-name');
              if (titleEl) {
                model.name = titleEl.textContent.trim();
              }
              
              // Arctic Leopard might use various spec formats
              // Check for description sections
              const descSections = document.querySelectorAll('.product-description, .product-details, .product-info');
              let fullText = '';
              
              descSections.forEach(section => {
                fullText += ' ' + section.textContent;
                
                // Look for bullet points
                const bullets = section.querySelectorAll('li');
                bullets.forEach(bullet => {
                  const text = bullet.textContent.trim();
                  
                  // Try to parse key-value pairs
                  if (text.includes(':')) {
                    const [key, ...valueParts] = text.split(':');
                    const value = valueParts.join(':').trim();
                    const keyLower = key.toLowerCase();
                    
                    if (keyLower.includes('motor') || keyLower.includes('power')) {
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
              
              // Check for tabs or accordions
              const tabContents = document.querySelectorAll('.tab-content, .accordion-content, [class*="spec"]');
              tabContents.forEach(content => {
                fullText += ' ' + content.textContent;
              });
              
              model.fullText = fullText;
              
              // Get images
              const images = document.querySelectorAll(
                '.product-image img, .product-photo img, .gallery-image img, [class*="product"] img'
              );
              model.images = Array.from(images)
                .map(img => img.src)
                .filter(src => src && !src.includes('placeholder'))
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
              .replace(/Arctic Leopard\s*/i, '')
              .replace(/electric\s*bike/gi, '')
              .replace(/e-bike/gi, '')
              .trim();
            
            this.results.models.push({
              model: cleanName || modelData.name,
              year: new Date().getFullYear(),
              specs: modelData.specs,
              url: modelData.url,
              images: modelData.images,
              source: 'Arctic Leopard Official'
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
      
      // If no products found, log it
      if (products.length === 0) {
        console.log(`   ⚠️  No products found. Site may require manual inspection.`);
        this.results.errors.push({
          url: this.baseUrl,
          error: 'No products found - may need different selectors or manual research'
        });
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
  const scraper = new ArcticLeopardScraper();
  scraper.scrape().then(results => {
    console.log(`\n📊 Summary for ${results.brand}:`);
    console.log(`   Models found: ${results.models.length}`);
    console.log(`   Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      results.errors.forEach(err => {
        console.log(`   - ${err.url}: ${err.error}`);
      });
    }
  }).catch(console.error);
}

module.exports = ArcticLeopardScraper;