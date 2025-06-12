/**
 * Honda Gyro Motorcycle Database Scraper
 * Scrapes Honda Gyro data from various motorcycle databases
 */

const { fetchPage, parseHTML, cleanText } = require('../shared/utils');
const AdaptiveScraper = require('../shared/adaptive-scraper');

class HondaMotorcycleDBScraper {
  constructor(options = {}) {
    this.adaptiveScraper = new AdaptiveScraper(options);
    this.databases = {
      webike: {
        name: 'Webike Japan',
        urls: [
          'https://japan.webike.net/HONDA/GYRO+CANOPY/6274/m-spec/',
          'https://www.webike.net/bike/make-1/scid-999/cid-150/' // Gyro Canopy e:
        ]
      },
      wikipedia: {
        name: 'Wikipedia',
        urls: [
          'https://en.wikipedia.org/wiki/Honda_Gyro',
          'https://ja.wikipedia.org/wiki/ホンダ・ジャイロ'
        ]
      },
      bikebros: {
        name: 'BikeBros',
        urls: [
          'https://www.bikebros.co.jp/catalog/1/150_4/',
          'https://www.bikebros.co.jp/catalog/1/999_150/' // Electric
        ]
      }
    };
  }

  /**
   * Scrape all databases
   */
  async scrapeAll() {
    console.log('\n🏍️  Scraping Honda Gyro from Motorcycle Databases');
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
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Deduplicate
    results.models = this.deduplicateModels(results.models);
    results.metadata.total_models = results.models.length;
    results.metadata.end_time = new Date().toISOString();

    console.log(`\n✅ Total unique models found: ${results.models.length}`);
    
    return results;
  }

  /**
   * Scrape specific database
   */
  async scrapeDatabase(dbKey, database) {
    const results = {
      models: [],
      urls_scraped: 0
    };

    switch (dbKey) {
      case 'webike':
        results.models = await this.scrapeWebike(database.urls);
        results.urls_scraped = database.urls.length;
        break;
        
      case 'wikipedia':
        results.models = await this.scrapeWikipedia(database.urls);
        results.urls_scraped = database.urls.length;
        break;
        
      case 'bikebros':
        results.models = await this.scrapeBikeBros(database.urls);
        results.urls_scraped = database.urls.length;
        break;
    }

    return results;
  }

  /**
   * Scrape Webike Japan
   */
  async scrapeWebike(urls) {
    const models = [];
    
    for (const url of urls) {
      try {
        console.log(`  Scraping: ${url.split('/').slice(-3).join('/')}`);
        
        // Use adaptive scraper
        const scraped = await this.adaptiveScraper.scrape(url, {
          enhance: true
        });
        
        if (scraped.data && scraped.data.length > 0) {
          scraped.data.forEach(item => {
            const model = this.normalizeWebikeData(item, url);
            if (model) {
              models.push(model);
            }
          });
        }

        // Also try direct extraction
        const html = await fetchPage(url);
        const $ = parseHTML(html);
        
        // Extract model years from year selector
        $('.year-selector option, .model-year a').each((i, elem) => {
          const yearText = $(elem).text();
          const yearMatch = yearText.match(/\d{4}/);
          
          if (yearMatch) {
            const year = parseInt(yearMatch[0]);
            
            const model = {
              make: 'Honda',
              model: 'Gyro Canopy',
              year: year,
              category: 'cabin',
              specifications: {
                source: 'webike.net',
                url: url
              }
            };

            // Extract specifications from page
            $('.spec-table tr, .specs tr').each((i, row) => {
              const $row = $(row);
              const label = cleanText($row.find('td:first').text());
              const value = cleanText($row.find('td:last').text());
              
              if (label && value && label !== value) {
                const key = this.normalizeSpecKey(label);
                model.specifications[key] = value;
              }
            });

            // Extract model code
            const modelCode = $('.model-code').text();
            if (modelCode) {
              const codeMatch = modelCode.match(/TA0[23]|2BH-TA03|JBH-TA03/);
              if (codeMatch) {
                model.package = codeMatch[0];
              }
            }

            if (Object.keys(model.specifications).length > 1) {
              models.push(model);
            }
          }
        });
        
      } catch (error) {
        console.error(`    Error: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return models;
  }

  /**
   * Scrape Wikipedia
   */
  async scrapeWikipedia(urls) {
    const models = [];
    
    for (const url of urls) {
      try {
        console.log(`  Scraping: ${url.includes('ja.') ? 'Wikipedia Japan' : 'Wikipedia English'}`);
        const html = await fetchPage(url);
        const $ = parseHTML(html);
        
        // Extract from infobox
        const infobox = $('.infobox');
        if (infobox.length > 0) {
          // Look for production years
          infobox.find('tr').each((i, row) => {
            const $row = $(row);
            const label = cleanText($row.find('th').text()).toLowerCase();
            const value = cleanText($row.find('td').text());
            
            if (label.includes('production') || label.includes('製造')) {
              // Extract year range
              const yearMatches = value.match(/\d{4}/g);
              if (yearMatches) {
                yearMatches.forEach(year => {
                  const model = {
                    make: 'Honda',
                    model: 'Gyro Canopy',
                    year: parseInt(year),
                    category: 'cabin',
                    specifications: {
                      source: 'wikipedia',
                      url: url,
                      production_info: value
                    }
                  };
                  models.push(model);
                });
              }
            }
          });
        }

        // Extract model information from content
        const content = $('#mw-content-text').text();
        
        // Look for TA02 information
        if (content.includes('TA02')) {
          const ta02Match = content.match(/TA02.*?(19|20)\d{2}/);
          if (ta02Match) {
            const year = parseInt(ta02Match[1] + ta02Match[2]);
            models.push({
              make: 'Honda',
              model: 'Gyro Canopy',
              package: 'TA02',
              year: year,
              category: 'cabin',
              specifications: {
                source: 'wikipedia',
                url: url,
                engine_type: '2-stroke'
              }
            });
          }
        }

        // Look for TA03 information
        if (content.includes('TA03')) {
          const ta03Match = content.match(/TA03.*?(20)\d{2}/);
          if (ta03Match) {
            const year = parseInt(ta03Match[0].match(/20\d{2}/)[0]);
            models.push({
              make: 'Honda',
              model: 'Gyro Canopy',
              package: 'TA03',
              year: year,
              category: 'cabin',
              specifications: {
                source: 'wikipedia',
                url: url,
                engine_type: '4-stroke'
              }
            });
          }
        }

        // Extract technical specifications
        $('table.wikitable').each((i, table) => {
          const $table = $(table);
          const tableText = $table.text();
          
          if (tableText.includes('Gyro') || tableText.includes('ジャイロ')) {
            const specs = {};
            
            $table.find('tr').each((i, row) => {
              const $row = $(row);
              const cells = $row.find('td');
              
              if (cells.length >= 2) {
                const label = cleanText($(cells[0]).text());
                const value = cleanText($(cells[1]).text());
                
                if (label && value) {
                  const key = this.normalizeSpecKey(label);
                  specs[key] = value;
                }
              }
            });
            
            if (Object.keys(specs).length > 0) {
              models.push({
                make: 'Honda',
                model: 'Gyro Canopy',
                category: 'cabin',
                specifications: {
                  ...specs,
                  source: 'wikipedia',
                  url: url
                }
              });
            }
          }
        });
        
      } catch (error) {
        console.error(`    Error: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return models;
  }

  /**
   * Scrape BikeBros
   */
  async scrapeBikeBros(urls) {
    const models = [];
    
    for (const url of urls) {
      try {
        console.log(`  Scraping: BikeBros ${url.includes('999_150') ? '(Electric)' : '(Gasoline)'}`);
        
        // Use adaptive scraper
        const scraped = await this.adaptiveScraper.scrape(url, {
          enhance: true
        });
        
        if (scraped.data && scraped.data.length > 0) {
          scraped.data.forEach(item => {
            const model = this.normalizeBikeBrosData(item, url);
            if (model) {
              models.push(model);
            }
          });
        }
        
      } catch (error) {
        console.error(`    Error: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
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
   * Normalize Webike data
   */
  normalizeWebikeData(item, url) {
    if (!item || !item.title) return null;
    
    const model = {
      make: 'Honda',
      model: 'Gyro Canopy',
      category: 'cabin',
      specifications: {
        source: 'webike.net',
        url: url
      }
    };
    
    // Extract year
    const yearMatch = JSON.stringify(item).match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      model.year = parseInt(yearMatch[0]);
    }
    
    // Check for electric model
    if (item.title.includes('e:') || url.includes('999_150')) {
      model.model = 'Gyro Canopy e:';
      model.specifications.propulsion = 'electric';
    }
    
    // Extract model code
    const codeMatch = JSON.stringify(item).match(/TA0[23]|2BH-TA03|ZAD-EF14/);
    if (codeMatch) {
      model.package = codeMatch[0];
    }
    
    // Merge specifications
    if (item.specifications) {
      Object.assign(model.specifications, item.specifications);
    }
    
    return model;
  }

  /**
   * Normalize BikeBros data
   */
  normalizeBikeBrosData(item, url) {
    if (!item) return null;
    
    const model = {
      make: 'Honda',
      model: 'Gyro Canopy',
      category: 'cabin',
      specifications: {
        source: 'bikebros.co.jp',
        url: url
      }
    };
    
    // Check for electric model
    if (url.includes('999_150') || JSON.stringify(item).includes('e:')) {
      model.model = 'Gyro Canopy e:';
      model.specifications.propulsion = 'electric';
    }
    
    // Extract year
    if (item.year) {
      model.year = parseInt(item.year);
    }
    
    // Extract specifications
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
      const key = `${model.model}-${model.package || 'base'}-${model.year || 'unknown'}`;
      
      if (!seen.has(key)) {
        seen.set(key, model);
      } else {
        // Merge specifications
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
async function scrapeHondaDatabases(options = {}) {
  const scraper = new HondaMotorcycleDBScraper(options);
  return await scraper.scrapeAll();
}

module.exports = {
  HondaMotorcycleDBScraper,
  scrapeHondaDatabases
};