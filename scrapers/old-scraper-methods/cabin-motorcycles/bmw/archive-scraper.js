/**
 * BMW C1 Archive.org Scraper
 * Scrapes historical BMW C1 data from Archive.org snapshots
 */

const axios = require('axios');
const { parseHTML, cleanText } = require('../shared/utils');
const AdaptiveScraper = require('../shared/adaptive-scraper');

class BMWArchiveScraper {
  constructor(options = {}) {
    this.adaptiveScraper = new AdaptiveScraper(options);
    this.baseUrls = [
      'https://www.bmw-motorrad.com',
      'https://www.bmw-motorrad.de',
      'https://www.bmw-motorrad.co.uk'
    ];
    this.debug = options.debug || false;
  }

  /**
   * Search Archive.org for BMW C1 pages
   */
  async searchArchive() {
    console.log('\n🔍 Searching Archive.org for BMW C1 pages...');
    
    const results = {
      snapshots: [],
      models: [],
      errors: [],
      metadata: {
        search_time: new Date().toISOString()
      }
    };

    try {
      // Search for BMW C1 specific pages
      const searchUrls = [
        'bmw-motorrad.com/models/c1',
        'bmw-motorrad.com/c1',
        'bmw.com/c1',
        'bmw-c1.com'
      ];

      for (const searchUrl of searchUrls) {
        console.log(`\n📍 Searching for snapshots of: ${searchUrl}`);
        
        try {
          // Query Wayback Machine CDX API
          const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${searchUrl}*&output=json&collapse=timestamp:8`;
          const response = await axios.get(cdxUrl, {
            timeout: 30000,
            headers: {
              'User-Agent': 'BMW-C1-Research-Bot/1.0'
            }
          });

          if (response.data && response.data.length > 1) {
            // First row is headers
            const headers = response.data[0];
            const snapshots = response.data.slice(1);
            
            console.log(`Found ${snapshots.length} snapshots`);
            
            // Process snapshots
            for (const snapshot of snapshots.slice(0, 10)) { // Limit to 10 per URL
              const snapshotData = this.parseSnapshot(headers, snapshot);
              
              // Filter for relevant years (2000-2003 when C1 was produced)
              const year = parseInt(snapshotData.timestamp.substring(0, 4));
              if (year >= 1999 && year <= 2004) {
                results.snapshots.push(snapshotData);
              }
            }
          }
        } catch (error) {
          console.error(`Error searching ${searchUrl}:`, error.message);
        }
        
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Now scrape the most promising snapshots
      console.log(`\n📄 Found ${results.snapshots.length} relevant snapshots to analyze`);
      
      for (const snapshot of results.snapshots.slice(0, 5)) { // Limit processing
        await this.scrapeSnapshot(snapshot, results);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error('Archive search error:', error);
      results.errors.push({
        stage: 'search',
        error: error.message
      });
    }

    results.metadata.end_time = new Date().toISOString();
    return results;
  }

  /**
   * Parse CDX API snapshot data
   */
  parseSnapshot(headers, data) {
    const snapshot = {};
    headers.forEach((header, index) => {
      snapshot[header] = data[index];
    });
    
    return {
      url: snapshot.original,
      timestamp: snapshot.timestamp,
      status: snapshot.statuscode,
      archiveUrl: `https://web.archive.org/web/${snapshot.timestamp}/${snapshot.original}`
    };
  }

  /**
   * Scrape a specific Archive.org snapshot
   */
  async scrapeSnapshot(snapshot, results) {
    console.log(`\n🔗 Scraping snapshot from ${snapshot.timestamp.substring(0, 4)}: ${snapshot.url}`);
    
    try {
      // Use adaptive scraper on the archive URL
      const scraped = await this.adaptiveScraper.scrape(snapshot.archiveUrl, {
        javascript: false, // Archive pages are static
        enhance: true
      });

      if (scraped.data && scraped.data.length > 0) {
        console.log(`✅ Found ${scraped.data.length} items`);
        
        // Process and normalize data
        scraped.data.forEach(item => {
          const model = this.normalizeBMWData(item, snapshot);
          if (model) {
            results.models.push(model);
          }
        });
      }

      // Also try specific extraction for BMW pages
      const specificData = await this.extractBMWSpecific(snapshot.archiveUrl);
      if (specificData.length > 0) {
        results.models.push(...specificData);
      }

    } catch (error) {
      console.error(`Error scraping snapshot:`, error.message);
      results.errors.push({
        snapshot: snapshot.url,
        timestamp: snapshot.timestamp,
        error: error.message
      });
    }
  }

  /**
   * Extract BMW-specific data from archived pages
   */
  async extractBMWSpecific(archiveUrl) {
    const models = [];
    
    try {
      const response = await axios.get(archiveUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BMW-C1-Research/1.0)'
        }
      });
      
      const $ = parseHTML(response.data);
      
      // Look for C1 specific content
      const c1Patterns = [
        /C1\s*125/gi,
        /C1\s*200/gi,
        /C1.*Executive/gi,
        /C1.*Williams/gi
      ];
      
      // Search for model information in various contexts
      const contexts = [
        '.model-info',
        '.specifications',
        '.technical-data',
        '.model-overview',
        '#content',
        'main',
        'article'
      ];
      
      contexts.forEach(selector => {
        const $context = $(selector);
        if ($context.length > 0) {
          const text = $context.text();
          
          c1Patterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
              matches.forEach(match => {
                const modelData = {
                  make: 'BMW',
                  model: 'C1',
                  variant: this.extractVariant(match),
                  category: 'cabin',
                  specifications: {
                    source: 'archive.org',
                    archive_url: archiveUrl,
                    extracted_from: selector
                  }
                };
                
                // Try to extract year from URL or content
                const yearMatch = archiveUrl.match(/\/(\d{4})\d{2}\d{2}\d{6}\//);
                if (yearMatch) {
                  modelData.year = parseInt(yearMatch[1]);
                }
                
                // Extract specifications if available
                this.extractSpecifications($context, modelData);
                
                models.push(modelData);
              });
            }
          });
        }
      });
      
      // Also check for specification tables
      $('table').each((i, table) => {
        const $table = $(table);
        const tableText = $table.text().toLowerCase();
        
        if (tableText.includes('c1') && (tableText.includes('specification') || tableText.includes('technical'))) {
          const specs = this.parseSpecificationTable($table, $);
          if (Object.keys(specs).length > 0) {
            models.push({
              make: 'BMW',
              model: 'C1',
              category: 'cabin',
              specifications: {
                ...specs,
                source: 'archive.org',
                archive_url: archiveUrl
              }
            });
          }
        }
      });
      
    } catch (error) {
      console.error('Error in BMW-specific extraction:', error.message);
    }
    
    return models;
  }

  /**
   * Extract variant from model string
   */
  extractVariant(modelString) {
    if (modelString.includes('125')) return '125';
    if (modelString.includes('200')) return '200';
    if (modelString.toLowerCase().includes('executive')) return '200 Executive';
    if (modelString.toLowerCase().includes('williams')) return 'Williams F1';
    return null;
  }

  /**
   * Extract specifications from context
   */
  extractSpecifications($context, modelData) {
    // Look for specification patterns
    const specPatterns = [
      { pattern: /(\d+)\s*cc/i, key: 'displacement' },
      { pattern: /(\d+)\s*hp/i, key: 'horsepower' },
      { pattern: /(\d+)\s*kW/i, key: 'power_kw' },
      { pattern: /(\d+)\s*kg/i, key: 'weight' },
      { pattern: /(\d+)\s*km\/h/i, key: 'top_speed' },
      { pattern: /ABS/i, key: 'abs', value: true },
      { pattern: /heated\s+grips/i, key: 'heated_grips', value: true }
    ];
    
    const text = $context.text();
    
    specPatterns.forEach(spec => {
      const match = text.match(spec.pattern);
      if (match) {
        if (spec.value !== undefined) {
          modelData.specifications[spec.key] = spec.value;
        } else {
          modelData.specifications[spec.key] = match[1];
        }
      }
    });
  }

  /**
   * Parse specification table
   */
  parseSpecificationTable($table, $) {
    const specs = {};
    
    $table.find('tr').each((i, row) => {
      const $row = $(row);
      const cells = $row.find('td, th');
      
      if (cells.length >= 2) {
        const label = cleanText($(cells[0]).text()).toLowerCase();
        const value = cleanText($(cells[1]).text());
        
        if (label && value) {
          // Map common labels
          const labelMap = {
            'engine': 'engine_type',
            'displacement': 'displacement',
            'power': 'power',
            'torque': 'torque',
            'weight': 'weight',
            'fuel capacity': 'fuel_capacity',
            'seat height': 'seat_height',
            'wheelbase': 'wheelbase'
          };
          
          const key = labelMap[label] || label.replace(/\s+/g, '_');
          specs[key] = value;
        }
      }
    });
    
    return specs;
  }

  /**
   * Normalize BMW data to standard format
   */
  normalizeBMWData(item, snapshot) {
    const model = {
      make: 'BMW',
      category: 'cabin',
      specifications: {
        source: 'archive.org',
        snapshot_date: snapshot.timestamp,
        original_url: snapshot.url
      }
    };
    
    // Extract model info
    if (item.model) {
      model.model = item.model;
    } else if (item.title) {
      const match = item.title.match(/C1\s*(\d+)?/i);
      if (match) {
        model.model = 'C1';
        if (match[1]) {
          model.variant = match[1];
        }
      }
    }
    
    // Only process if it's actually a C1
    if (!model.model || !model.model.includes('C1')) {
      return null;
    }
    
    // Extract year
    if (item.year) {
      model.year = parseInt(item.year);
    } else {
      // Try to infer from snapshot year if it's during production
      const snapshotYear = parseInt(snapshot.timestamp.substring(0, 4));
      if (snapshotYear >= 2000 && snapshotYear <= 2002) {
        model.year = snapshotYear;
        model.specifications.year_inferred = true;
      }
    }
    
    // Merge specifications
    if (item.specifications) {
      Object.assign(model.specifications, item.specifications);
    }
    
    return model;
  }
}

// Export functions
async function scrapeBMWArchive(options = {}) {
  const scraper = new BMWArchiveScraper(options);
  return await scraper.searchArchive();
}

module.exports = {
  BMWArchiveScraper,
  scrapeBMWArchive
};