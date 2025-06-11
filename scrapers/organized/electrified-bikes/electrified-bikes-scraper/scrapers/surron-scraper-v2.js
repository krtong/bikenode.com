const BaseScraper = require('./base-scraper');

class SurRonScraperV2 extends BaseScraper {
  constructor() {
    super('Sur-Ron');
    this.baseUrl = 'https://www.sur-ronusa.com';
  }

  async scrape() {
    await this.initialize();
    
    try {
      console.log(`🔍 Scraping ${this.name}...`);
      
      // Known Sur-Ron models with their likely URLs
      const knownModels = [
        { name: 'Light Bee X', paths: ['/light-bee-x', '/models/light-bee-x', '/products/light-bee-x'] },
        { name: 'Light Bee S', paths: ['/light-bee-s', '/models/light-bee-s', '/products/light-bee-s'] },
        { name: 'Storm Bee', paths: ['/storm-bee', '/models/storm-bee', '/products/storm-bee'] },
        { name: 'Ultra Bee', paths: ['/ultra-bee', '/models/ultra-bee', '/products/ultra-bee'] }
      ];
      
      // Try to find each model
      for (const model of knownModels) {
        console.log(`\n   Looking for ${model.name}...`);
        
        let modelData = null;
        
        // Try each possible path
        for (const path of model.paths) {
          const url = this.baseUrl + path;
          
          try {
            modelData = await this.scrapeUrl(url, async (page) => {
              // Wait for content to load
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const data = await page.evaluate(() => {
                const model = {
                  name: null,
                  specs: {},
                  images: [],
                  url: window.location.href,
                  debug: {
                    foundTables: 0,
                    foundLists: 0,
                    pageText: ''
                  }
                };
                
                // Get model name
                const titleEl = document.querySelector('h1, .page-title, .product-title');
                if (titleEl) {
                  model.name = titleEl.textContent.trim();
                }
                
                // Look for specifications in various structures
                // 1. Check for specification tables
                const tables = document.querySelectorAll('table');
                model.debug.foundTables = tables.length;
                
                tables.forEach(table => {
                  // Check if this is a specs table
                  const rows = table.querySelectorAll('tr');
                  rows.forEach(row => {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length >= 2) {
                      const label = cells[0].textContent.trim();
                      const value = cells[1].textContent.trim();
                      
                      // Map common spec labels
                      const labelLower = label.toLowerCase();
                      if (labelLower.includes('motor') && !labelLower.includes('type')) {
                        model.specs.motor_power = value;
                      } else if (labelLower.includes('battery') && labelLower.includes('capacity')) {
                        model.specs.battery = value;
                      } else if (labelLower.includes('max') && labelLower.includes('speed')) {
                        model.specs.top_speed = value;
                      } else if (labelLower.includes('range')) {
                        model.specs.range = value;
                      } else if (labelLower.includes('weight') && !labelLower.includes('payload')) {
                        model.specs.weight = value;
                      } else if (labelLower.includes('power') && !model.specs.motor_power) {
                        model.specs.motor_power = value;
                      }
                    }
                  });
                });
                
                // 2. Check for specification lists
                const specContainers = document.querySelectorAll(
                  '.specifications, .specs, .tech-specs, .product-specs, [class*="specification"]'
                );
                
                specContainers.forEach(container => {
                  // Look for definition lists
                  const dts = container.querySelectorAll('dt');
                  const dds = container.querySelectorAll('dd');
                  
                  for (let i = 0; i < Math.min(dts.length, dds.length); i++) {
                    const label = dts[i].textContent.trim().toLowerCase();
                    const value = dds[i].textContent.trim();
                    
                    if (label.includes('motor') && !label.includes('type')) {
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
                  
                  // Look for list items with colons
                  const listItems = container.querySelectorAll('li');
                  model.debug.foundLists += listItems.length;
                  
                  listItems.forEach(item => {
                    const text = item.textContent.trim();
                    if (text.includes(':')) {
                      const [label, value] = text.split(':').map(s => s.trim());
                      const labelLower = label.toLowerCase();
                      
                      if (labelLower.includes('motor') && !labelLower.includes('type')) {
                        model.specs.motor_power = value;
                      } else if (labelLower.includes('battery')) {
                        model.specs.battery = value;
                      } else if (labelLower.includes('speed')) {
                        model.specs.top_speed = value;
                      } else if (labelLower.includes('range')) {
                        model.specs.range = value;
                      } else if (labelLower.includes('weight')) {
                        model.specs.weight = value;
                      }
                    }
                  });
                });
                
                // 3. Get page text for manual extraction
                const mainContent = document.querySelector('main, article, .content, .product-content');
                if (mainContent) {
                  model.debug.pageText = mainContent.textContent.substring(0, 2000); // First 2000 chars
                }
                
                // Get images
                const images = document.querySelectorAll(
                  'img[src*="sur-ron"], img[src*="surron"], .product-image img, .gallery img'
                );
                model.images = Array.from(images)
                  .map(img => img.src)
                  .filter(src => src && !src.includes('logo') && !src.includes('icon'))
                  .slice(0, 5);
                
                return model;
              });
              
              // If we didn't find specs in structured format, try extraction from text
              if (Object.keys(data.specs).length === 0 && data.debug.pageText) {
                console.log(`   Attempting text extraction for ${data.name || model.name}...`);
                
                // Sur-Ron specific patterns
                const text = data.debug.pageText;
                
                // Motor power
                const motorMatch = text.match(/(?:motor|power)[:\s]*(\d+(?:\.\d+)?)\s*(?:k)?W/i) ||
                                 text.match(/(\d+(?:\.\d+)?)\s*(?:k)?W\s*(?:motor|power)/i);
                if (motorMatch) {
                  data.specs.motor_power = motorMatch[0].match(/\d+(?:\.\d+)?\s*kW/i) ? 
                    motorMatch[1] + 'kW' : motorMatch[1] + 'W';
                }
                
                // Battery
                const batteryMatch = text.match(/(\d+)\s*V\s*[\s\/]*(\d+(?:\.\d+)?)\s*Ah/i) ||
                                   text.match(/battery[:\s]*(\d+)V\s*(\d+(?:\.\d+)?)Ah/i);
                if (batteryMatch) {
                  data.specs.battery = `${batteryMatch[1]}V ${batteryMatch[2]}Ah`;
                }
                
                // Top speed
                const speedMatch = text.match(/(?:top|max)\s*speed[:\s]*(\d+)\s*(?:mph|km\/h)/i) ||
                                 text.match(/(\d+)\s*(?:mph|km\/h)\s*(?:top|max)/i);
                if (speedMatch) {
                  const unit = speedMatch[0].toLowerCase().includes('km') ? 'km/h' : 'mph';
                  data.specs.top_speed = `${speedMatch[1]} ${unit}`;
                }
                
                // Range
                const rangeMatch = text.match(/range[:\s]*(\d+)(?:-(\d+))?\s*(?:miles|km)/i) ||
                                 text.match(/(\d+)(?:-(\d+))?\s*(?:miles|km)\s*range/i);
                if (rangeMatch) {
                  const unit = rangeMatch[0].toLowerCase().includes('km') ? 'km' : 'miles';
                  if (rangeMatch[2]) {
                    data.specs.range = `${rangeMatch[1]}-${rangeMatch[2]} ${unit}`;
                  } else {
                    data.specs.range = `${rangeMatch[1]} ${unit}`;
                  }
                }
                
                // Weight
                const weightMatch = text.match(/weight[:\s]*(\d+(?:\.\d+)?)\s*(?:lbs?|kg)/i) ||
                                  text.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|kg)\s*weight/i);
                if (weightMatch) {
                  const unit = weightMatch[0].toLowerCase().includes('kg') ? 'kg' : 'lbs';
                  data.specs.weight = `${weightMatch[1]} ${unit}`;
                }
              }
              
              // Remove debug info from final data
              delete data.debug;
              
              return data;
            });
            
            if (modelData && (modelData.name || Object.keys(modelData.specs).length > 0)) {
              console.log(`   ✅ Found data at ${url}`);
              break; // Found data for this model
            }
          } catch (error) {
            console.log(`   Could not access ${url}: ${error.message}`);
          }
        }
        
        // If we found data for this model, add it to results
        if (modelData && (modelData.name || model.name)) {
          const finalName = modelData.name || model.name;
          const cleanName = finalName.replace(/Sur-?Ron\s*/i, '').trim();
          
          this.results.models.push({
            model: cleanName,
            year: new Date().getFullYear(),
            specs: modelData.specs,
            url: modelData.url,
            images: modelData.images || [],
            source: 'Sur-Ron USA Official',
            specCount: Object.keys(modelData.specs).length
          });
          
          console.log(`   Added ${cleanName} with ${Object.keys(modelData.specs).length} specs`);
        } else {
          console.log(`   ❌ Could not find data for ${model.name}`);
          this.results.errors.push({
            model: model.name,
            error: 'Model page not found or no data extracted'
          });
        }
      }
      
      // Add metadata
      this.results.metadata.source = this.baseUrl;
      this.results.metadata.knownModels = knownModels.length;
      
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
  const scraper = new SurRonScraperV2();
  scraper.scrape().then(results => {
    console.log(`\n📊 Summary for ${results.brand}:`);
    console.log(`   Models found: ${results.models.length}`);
    console.log(`   Errors: ${results.errors.length}`);
    
    // Show spec counts
    results.models.forEach(model => {
      console.log(`   ${model.model}: ${model.specCount} specs`);
    });
  }).catch(console.error);
}

module.exports = SurRonScraperV2;