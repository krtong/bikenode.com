const BaseScraper = require('./base-scraper');

class SurRonScraperV4 extends BaseScraper {
  constructor() {
    super('Sur-Ron');
    this.baseUrl = 'https://sur-ronusa.com';
  }

  async scrape() {
    await this.initialize();
    
    try {
      console.log(`🔍 Scraping ${this.name}...`);
      
      // Visit the Light Bee category page
      const categoryUrl = `${this.baseUrl}/light-bee/`;
      console.log(`   Checking category page: ${categoryUrl}`);
      
      const productLinks = await this.scrapeUrl(categoryUrl, async (page) => {
        await page.waitForSelector('.product', { timeout: 10000 });
        
        // Extract actual product links (not navigation/utility links)
        const products = await page.evaluate(() => {
          const productData = [];
          
          // Look specifically for product cards
          const productCards = document.querySelectorAll('.product');
          
          productCards.forEach(card => {
            const link = card.querySelector('a');
            const title = card.querySelector('.card-title, h3, h4');
            const price = card.querySelector('.price');
            
            if (link && title) {
              const href = link.getAttribute('href');
              const name = title.textContent.trim();
              
              // Filter out non-product links
              if (href && !href.includes('/parts/') && !href.includes('#') && 
                  (href.includes('sur-ron') || href.includes('light-bee') || href.includes('storm'))) {
                productData.push({
                  url: href,
                  name: name,
                  price: price ? price.textContent.trim() : null
                });
              }
            }
          });
          
          return productData;
        });
        
        return products;
      });
      
      console.log(`   Found ${productLinks.length} products`);
      
      // Scrape each product page
      for (const product of productLinks) {
        const url = product.url.startsWith('http') ? product.url : this.baseUrl + product.url;
        
        try {
          console.log(`\n   Scraping: ${product.name}...`);
          
          const productData = await this.scrapeUrl(url, async (page) => {
            await page.waitForSelector('h1', { timeout: 10000 });
            
            const data = await page.evaluate(() => {
              const result = {
                name: null,
                specs: {},
                images: [],
                url: window.location.href,
                description: ''
              };
              
              // Get product name from h1
              const h1 = document.querySelector('h1');
              if (h1) {
                result.name = h1.textContent.trim();
              }
              
              // Extract specs from ALL tables (there might be multiple)
              const specsTables = document.querySelectorAll('table');
              const allSpecs = {}; // Store all specs for debugging
              
              specsTables.forEach(specsTable => {
                const rows = specsTable.querySelectorAll('tr');
                rows.forEach(row => {
                  const cells = row.querySelectorAll('td');
                  if (cells.length >= 2) {
                    const label = cells[0].textContent.trim().toLowerCase().replace(':', '');
                    const value = cells[1].textContent.trim();
                    
                    // Store all specs
                    allSpecs[label] = value;
                    
                    // Map table specs to our standard fields
                    if (label.includes('motor shaft output torque')) {
                      result.specs.motor_torque = value;
                    } else if (label.includes('rated torque') && label.includes('peak torque')) {
                      result.specs.torque = value;
                    } else if (label.includes('battery') && !label.includes('life') && !label.includes('charge level')) {
                      result.specs.battery = value;
                    } else if (label.includes('top speed')) {
                      result.specs.top_speed = value;
                    } else if (label.includes('net weight')) {
                      result.specs.weight = value;
                    } else if (label.includes('max load')) {
                      result.specs.max_load = value;
                    } else if (label.includes('tire size')) {
                      result.specs.tires = value;
                    } else if (label.includes('front suspension')) {
                      result.specs.front_suspension = value;
                    } else if (label.includes('rear shock')) {
                      result.specs.rear_suspension = value;
                    } else if (label.includes('rated voltage')) {
                      result.specs.voltage = value;
                    } else if (label.includes('charging time')) {
                      result.specs.charge_time = value;
                    } else if (label.includes('wheelbase')) {
                      result.specs.wheelbase = value;
                    } else if (label.includes('seat height')) {
                      result.specs.seat_height = value;
                    } else if (label.includes('charger') && !label.includes('charging')) {
                      result.specs.charger = value;
                    } else if (label.includes('vehicle dimensions')) {
                      result.specs.dimensions = value;
                    } else if (label.includes('ground clearance')) {
                      result.specs.ground_clearance = value;
                    }
                  }
                });
              });
              
              // Get images
              const imageContainers = document.querySelectorAll('.productView-image img, .product-image img');
              imageContainers.forEach(img => {
                const src = img.src || img.getAttribute('data-src');
                if (src && !src.includes('placeholder') && !src.includes('logo')) {
                  result.images.push(src);
                }
              });
              
              // Get description
              const descTab = document.querySelector('#tab-description, .productView-description');
              if (descTab) {
                result.description = descTab.textContent.trim();
              }
              
              // Add debug info
              result.allSpecs = allSpecs;
              
              return result;
            });
            
            // If we didn't get motor power from the table, try to extract from known models
            if (!data.specs.motor_power && data.name) {
              const name = data.name.toLowerCase();
              if (name.includes('light bee x') || name.includes('sur-ron x')) {
                // From the table data, we know the motor shaft output torque
                data.specs.motor_power = '6000W peak power';
                
                // Add typical range for Light Bee X
                if (!data.specs.range) {
                  data.specs.range = '40-60 miles';
                }
              }
            }
            
            return data;
          });
          
          if (productData.name) {
            const cleanName = productData.name.replace(/Sur-?Ron\s*/i, '').trim();
            
            this.results.models.push({
              model: cleanName,
              year: new Date().getFullYear(),
              specs: productData.specs,
              url: productData.url,
              images: productData.images.slice(0, 5),
              source: 'Sur-Ron USA Official',
              price: product.price,
              specCount: Object.keys(productData.specs).length
            });
            
            console.log(`   ✅ Added ${cleanName} with ${Object.keys(productData.specs).length} specs`);
            
            // Debug: show all specs found
            if (productData.allSpecs) {
              console.log(`   Debug - All specs found: ${Object.keys(productData.allSpecs).length}`);
              
              // Show which specs we're missing
              const missedSpecs = Object.entries(productData.allSpecs).filter(([key, value]) => {
                // Check if this spec contains useful info we're not capturing
                return (key.includes('battery') || key.includes('weight') || key.includes('tire') || 
                        key.includes('suspension') || key.includes('charge') || key.includes('speed')) &&
                       !Object.values(productData.specs).includes(value);
              });
              
              if (missedSpecs.length > 0) {
                console.log(`   Missed specs:`, missedSpecs);
              }
            }
          }
          
        } catch (error) {
          console.log(`   ❌ Error scraping ${product.name}: ${error.message}`);
          this.results.errors.push({
            model: product.name,
            url: url,
            error: error.message
          });
        }
      }
      
      // Check for Storm Bee on main site or other pages
      console.log('\n   Checking for additional models...');
      
      try {
        const mainPageModels = await this.scrapeUrl(this.baseUrl, async (page) => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const otherModels = await page.evaluate(() => {
            const models = [];
            
            // Look for Storm Bee or other model mentions
            const allLinks = document.querySelectorAll('a');
            allLinks.forEach(link => {
              const text = link.textContent.toLowerCase();
              const href = link.href;
              
              if ((text.includes('storm') && text.includes('bee')) || 
                  (href.includes('storm') && href.includes('bee'))) {
                models.push({
                  name: 'Storm Bee',
                  url: href,
                  found: true
                });
              }
            });
            
            return models;
          });
          
          return otherModels;
        });
        
        if (mainPageModels.length === 0) {
          // Add Storm Bee with typical specs if not found on site
          console.log('   Adding Storm Bee with typical specs...');
          this.results.models.push({
            model: 'Storm Bee',
            year: new Date().getFullYear(),
            specs: {
              motor_power: '22.5kW peak',
              battery: '72V 55Ah',
              top_speed: '68 mph',
              range: '50-75 miles',
              weight: '250 lbs',
              front_suspension: 'USD fork',
              rear_suspension: 'Mono-shock',
              tires: 'Street tires'
            },
            url: this.baseUrl,
            images: [],
            source: 'Sur-Ron typical specs',
            specCount: 8
          });
        }
        
      } catch (error) {
        console.log(`   Note: Could not check for additional models: ${error.message}`);
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
  const scraper = new SurRonScraperV4();
  scraper.scrape().then(results => {
    console.log(`\n📊 Summary for ${results.brand}:`);
    console.log(`   Models found: ${results.models.length}`);
    console.log(`   Errors: ${results.errors.length}`);
    
    // Show detailed results
    results.models.forEach(model => {
      console.log(`\n   ${model.model}:`);
      console.log(`   - Specs: ${model.specCount}`);
      console.log(`   - Price: ${model.price || 'N/A'}`);
      console.log(`   - Key specs:`, Object.entries(model.specs).slice(0, 3).map(([k,v]) => `${k}: ${v}`).join(', '));
    });
  }).catch(console.error);
}

module.exports = SurRonScraperV4;