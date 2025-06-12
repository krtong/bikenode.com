/**
 * BMW C1 Motorcycle Database Scraper
 * Scrapes BMW C1 data from various motorcycle specification databases
 */

const { fetchPage, parseHTML, cleanText } = require('../shared/utils');
const AdaptiveScraper = require('../shared/adaptive-scraper');

class BMWMotorcycleDBScraper {
  constructor(options = {}) {
    this.adaptiveScraper = new AdaptiveScraper(options);
    this.databases = {
      motorcyclespecs: {
        name: 'MotorcycleSpecs.co.za',
        urls: [
          'https://www.motorcyclespecs.co.za/model/bmw/bmw_c1_125_00.htm',
          'https://www.motorcyclespecs.co.za/model/bmw/bmw_c1_200_01.htm',
          'https://www.motorcyclespecs.co.za/model/bmw/bmw_c1_200_executive_02.htm'
        ]
      },
      bikez: {
        name: 'Bikez.com',
        urls: [
          'https://www.bikez.com/motorcycles/bmw_c1_125_2000.php',
          'https://www.bikez.com/motorcycles/bmw_c1_125_2001.php',
          'https://www.bikez.com/motorcycles/bmw_c1_125_2002.php',
          'https://www.bikez.com/motorcycles/bmw_c1_200_2001.php',
          'https://www.bikez.com/motorcycles/bmw_c1_200_2002.php'
        ]
      },
      cyclechaos: {
        name: 'CycleChaos',
        urls: [
          'https://www.cyclechaos.com/wiki/BMW_C1',
          'https://www.cyclechaos.com/wiki/BMW_C1_125',
          'https://www.cyclechaos.com/wiki/BMW_C1_200'
        ]
      },
      motorcyclenews: {
        name: 'MCN',
        searchUrl: 'https://www.motorcyclenews.com/bike-reviews/bmw/c1/'
      }
    };
  }

  /**
   * Scrape all motorcycle databases
   */
  async scrapeAll() {
    console.log('\n🏍️  Scraping BMW C1 from Motorcycle Databases');
    console.log('=' .repeat(50));
    
    const results = {
      models: [],
      sources: [],
      errors: [],
      metadata: {
        start_time: new Date().toISOString()
      }
    };

    // Scrape each database
    for (const [dbKey, database] of Object.entries(this.databases)) {
      console.log(`\n📊 Scraping ${database.name}...`);
      
      try {
        const dbResults = await this.scrapeDatabase(dbKey, database);
        
        if (dbResults.models.length > 0) {
          results.models.push(...dbResults.models);
          results.sources.push({
            name: database.name,
            count: dbResults.models.length,
            urls_scraped: dbResults.urls_scraped
          });
          console.log(`✅ Found ${dbResults.models.length} models`);
        } else {
          console.log(`⚠️  No models found`);
        }
        
      } catch (error) {
        console.error(`❌ Error scraping ${database.name}:`, error.message);
        results.errors.push({
          database: database.name,
          error: error.message
        });
      }
      
      // Rate limit between databases
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Deduplicate and enhance results
    results.models = this.deduplicateModels(results.models);
    results.metadata.total_models = results.models.length;
    results.metadata.end_time = new Date().toISOString();

    console.log(`\n✅ Total unique models found: ${results.models.length}`);
    
    return results;
  }

  /**
   * Scrape a specific database
   */
  async scrapeDatabase(dbKey, database) {
    const results = {
      models: [],
      urls_scraped: 0
    };

    switch (dbKey) {
      case 'motorcyclespecs':
        results.models = await this.scrapeMotorcycleSpecs(database.urls);
        results.urls_scraped = database.urls.length;
        break;
        
      case 'bikez':
        results.models = await this.scrapeBikez(database.urls);
        results.urls_scraped = database.urls.length;
        break;
        
      case 'cyclechaos':
        results.models = await this.scrapeCycleChaos(database.urls);
        results.urls_scraped = database.urls.length;
        break;
        
      case 'motorcyclenews':
        results.models = await this.scrapeMCN(database.searchUrl);
        results.urls_scraped = 1;
        break;
    }

    return results;
  }

  /**
   * Scrape MotorcycleSpecs.co.za
   */
  async scrapeMotorcycleSpecs(urls) {
    const models = [];
    
    for (const url of urls) {
      try {
        console.log(`  Scraping: ${url.split('/').pop()}`);
        const html = await fetchPage(url);
        const $ = parseHTML(html);
        
        const model = {
          make: 'BMW',
          model: 'C1',
          category: 'cabin',
          specifications: {
            source: 'motorcyclespecs.co.za',
            url: url
          }
        };
        
        // Extract model variant from URL
        const urlMatch = url.match(/bmw_c1_(\d+)(?:_(\w+))?_(\d{2})/);
        if (urlMatch) {
          model.variant = urlMatch[1];
          if (urlMatch[2]) {
            model.package = urlMatch[2];
          }
          model.year = 2000 + parseInt(urlMatch[3]);
        }
        
        // Extract specifications from table
        $('table.Grid tr').each((i, row) => {
          const $row = $(row);
          const label = cleanText($row.find('td.GridHeader').text());
          const value = cleanText($row.find('td.GridItem').text());
          
          if (label && value && value !== '-') {
            const key = this.normalizeSpecKey(label);
            model.specifications[key] = value;
            
            // Extract specific values
            if (label.includes('Engine type')) {
              model.specifications.engine_type = value;
            } else if (label.includes('Displacement')) {
              const match = value.match(/(\d+)/);
              if (match) model.specifications.displacement_cc = parseInt(match[1]);
            } else if (label.includes('Power')) {
              model.specifications.power = value;
            } else if (label.includes('Top speed')) {
              model.specifications.top_speed = value;
            }
          }
        });
        
        if (Object.keys(model.specifications).length > 2) {
          models.push(model);
        }
        
      } catch (error) {
        console.error(`    Error: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return models;
  }

  /**
   * Scrape Bikez.com
   */
  async scrapeBikez(urls) {
    const models = [];
    
    for (const url of urls) {
      try {
        console.log(`  Scraping: ${url.split('/').pop()}`);
        
        // Use adaptive scraper for better extraction
        const scraped = await this.adaptiveScraper.scrape(url, {
          enhance: true
        });
        
        if (scraped.data && scraped.data.length > 0) {
          scraped.data.forEach(item => {
            const model = this.normalizeBikezData(item, url);
            if (model) {
              models.push(model);
            }
          });
        }
        
        // Also try specific extraction
        const html = await fetchPage(url);
        const $ = parseHTML(html);
        
        const model = {
          make: 'BMW',
          model: 'C1',
          category: 'cabin',
          specifications: {
            source: 'bikez.com',
            url: url
          }
        };
        
        // Extract from URL
        const urlMatch = url.match(/bmw_c1_(\d+)_(\d{4})/);
        if (urlMatch) {
          model.variant = urlMatch[1];
          model.year = parseInt(urlMatch[2]);
        }
        
        // Extract specifications
        $('.specTable tr').each((i, row) => {
          const $row = $(row);
          const cells = $row.find('td');
          
          if (cells.length >= 2) {
            const label = cleanText($(cells[0]).text());
            const value = cleanText($(cells[1]).text());
            
            if (label && value) {
              const key = this.normalizeSpecKey(label);
              model.specifications[key] = value;
            }
          }
        });
        
        // Extract from main content
        const mainContent = $('#mainContent').text();
        const powerMatch = mainContent.match(/Power:\s*([\d.]+)\s*hp/i);
        if (powerMatch) {
          model.specifications.horsepower = powerMatch[1];
        }
        
        if (Object.keys(model.specifications).length > 2) {
          models.push(model);
        }
        
      } catch (error) {
        console.error(`    Error: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return models;
  }

  /**
   * Scrape CycleChaos
   */
  async scrapeCycleChaos(urls) {
    const models = [];
    
    for (const url of urls) {
      try {
        console.log(`  Scraping: ${url.split('/').pop()}`);
        const html = await fetchPage(url);
        const $ = parseHTML(html);
        
        // Extract from infobox
        const infobox = $('.infobox');
        if (infobox.length > 0) {
          const model = {
            make: 'BMW',
            model: 'C1',
            category: 'cabin',
            specifications: {
              source: 'cyclechaos.com',
              url: url
            }
          };
          
          // Determine variant from page title
          const pageTitle = $('h1').text();
          if (pageTitle.includes('125')) {
            model.variant = '125';
          } else if (pageTitle.includes('200')) {
            model.variant = '200';
          }
          
          // Extract from infobox rows
          infobox.find('tr').each((i, row) => {
            const $row = $(row);
            const label = cleanText($row.find('th').text());
            const value = cleanText($row.find('td').text());
            
            if (label && value) {
              const key = this.normalizeSpecKey(label);
              model.specifications[key] = value;
              
              // Extract year
              if (label.toLowerCase().includes('year') || label.toLowerCase().includes('production')) {
                const yearMatch = value.match(/\d{4}/);
                if (yearMatch) {
                  model.year = parseInt(yearMatch[0]);
                }
              }
            }
          });
          
          // Extract from article content
          const content = $('#mw-content-text').text();
          
          // Look for production years
          const productionMatch = content.match(/produced?\s+(?:from\s+)?(\d{4})(?:\s*[-–to]+\s*(\d{4}))?/i);
          if (productionMatch) {
            if (!model.year && productionMatch[1]) {
              model.year = parseInt(productionMatch[1]);
            }
            if (productionMatch[2]) {
              model.specifications.production_end = productionMatch[2];
            }
          }
          
          if (Object.keys(model.specifications).length > 2) {
            models.push(model);
          }
        }
        
      } catch (error) {
        console.error(`    Error: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return models;
  }

  /**
   * Scrape MCN (Motorcycle News)
   */
  async scrapeMCN(searchUrl) {
    const models = [];
    
    try {
      console.log(`  Searching MCN...`);
      
      // Note: MCN might require more complex scraping
      // This is a simplified version
      const scraped = await this.adaptiveScraper.scrape(searchUrl, {
        enhance: true
      });
      
      if (scraped.data && scraped.data.length > 0) {
        scraped.data.forEach(item => {
          if (item.title && item.title.includes('C1')) {
            const model = {
              make: 'BMW',
              model: 'C1',
              category: 'cabin',
              specifications: {
                source: 'motorcyclenews.com',
                ...item
              }
            };
            models.push(model);
          }
        });
      }
      
    } catch (error) {
      console.error(`    Error: ${error.message}`);
    }
    
    return models;
  }

  /**
   * Normalize specification keys
   */
  normalizeSpecKey(label) {
    return label
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_')
      .trim();
  }

  /**
   * Normalize Bikez data
   */
  normalizeBikezData(item, url) {
    if (!item.title || !item.title.includes('C1')) {
      return null;
    }
    
    const model = {
      make: 'BMW',
      model: 'C1',
      category: 'cabin',
      specifications: {
        source: 'bikez.com',
        url: url
      }
    };
    
    // Extract variant and year from title
    const titleMatch = item.title.match(/C1\s*(\d+).*?(\d{4})/);
    if (titleMatch) {
      model.variant = titleMatch[1];
      model.year = parseInt(titleMatch[2]);
    }
    
    // Merge specifications
    if (item.specifications) {
      Object.assign(model.specifications, item.specifications);
    }
    
    return model;
  }

  /**
   * Deduplicate models
   */
  deduplicateModels(models) {
    const seen = new Map();
    
    models.forEach(model => {
      const key = `${model.variant || 'base'}-${model.year || 'unknown'}`;
      
      if (!seen.has(key)) {
        seen.set(key, model);
      } else {
        // Merge specifications from duplicate
        const existing = seen.get(key);
        Object.assign(existing.specifications, model.specifications);
        
        // Add source if different
        if (model.specifications.source !== existing.specifications.source) {
          if (!existing.specifications.additional_sources) {
            existing.specifications.additional_sources = [];
          }
          existing.specifications.additional_sources.push(model.specifications.source);
        }
      }
    });
    
    return Array.from(seen.values());
  }
}

// Export functions
async function scrapeBMWDatabases(options = {}) {
  const scraper = new BMWMotorcycleDBScraper(options);
  return await scraper.scrapeAll();
}

module.exports = {
  BMWMotorcycleDBScraper,
  scrapeBMWDatabases
};