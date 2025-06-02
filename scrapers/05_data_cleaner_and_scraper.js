#!/usr/bin/env node
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pLimit from 'p-limit';
import chalk from 'chalk';
import { SingleBar, Presets } from 'cli-progress';
import { Stagehand } from '@browserbasehq/stagehand';
import 'dotenv/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
};

// Import maker_ids mapping
async function loadMakerIds() {
  const makerIdsPath = path.join(__dirname, 'maker_ids.js');
  const content = await fs.readFile(makerIdsPath, 'utf8');
  const match = content.match(/const maker_ids = ({[\s\S]*})\s*;?\s*$/);
  return match ? JSON.parse(match[1]) : {};
}

class BikeDataCleaner {
  constructor() {
    this.client = new pg.Client(dbConfig);
    this.makerIds = {};
    this.stagehand = null;
    this.stats = {
      total: 0,
      processed: 0,
      cleaned: 0,
      needsScraping: 0,
      scraped: 0,
      scrapeFailed: 0,
      errors: 0
    };
  }

  async initialize(enableScraping = false) {
    await this.client.connect();
    this.makerIds = await loadMakerIds();
    console.log(chalk.green('✓ Connected to database'));
    console.log(chalk.green(`✓ Loaded ${Object.keys(this.makerIds).length} maker IDs`));
    
    if (enableScraping) {
      if (!process.env.OPENAI_API_KEY) {
        console.error(chalk.red('✖ OPENAI_API_KEY missing - required for re-scraping'));
        process.exit(1);
      }
      
      this.stagehand = new Stagehand({ 
        env: 'LOCAL', 
        apiKey: process.env.OPENAI_API_KEY,
        verbose: 0
      });
      await this.stagehand.init();
      console.log(chalk.green('✓ Initialized Stagehand for re-scraping'));
    }
  }

  // Recursively search for and decode JSON strings within any data structure
  findAndDecodeJsonStrings(data, depth = 0, maxDepth = 10) {
    if (depth > maxDepth) return data;

    if (typeof data === 'string') {
      // Check if string might contain JSON
      if ((data.includes('{') && data.includes('}')) || (data.includes('[') && data.includes(']'))) {
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(data);
          // Recursively decode any nested JSON strings
          return this.findAndDecodeJsonStrings(parsed, depth + 1, maxDepth);
        } catch (e) {
          // If not valid JSON, try to extract JSON from within the string
          const jsonMatches = this.extractJsonFromString(data);
          if (jsonMatches.length > 0) {
            return jsonMatches.map(match => this.findAndDecodeJsonStrings(match, depth + 1, maxDepth));
          }
        }
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.findAndDecodeJsonStrings(item, depth + 1, maxDepth));
    }

    if (data && typeof data === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.findAndDecodeJsonStrings(value, depth + 1, maxDepth);
      }
      return result;
    }

    return data;
  }

  // Extract JSON objects from a string
  extractJsonFromString(text) {
    const jsonObjects = [];
    const stack = [];
    let currentJson = '';
    let inJson = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (char === '{') {
        if (!inJson) {
          inJson = true;
          currentJson = '';
        }
        stack.push('{');
        currentJson += char;
      } else if (char === '}' && inJson) {
        stack.pop();
        currentJson += char;
        
        if (stack.length === 0) {
          try {
            const parsed = JSON.parse(currentJson);
            jsonObjects.push(parsed);
          } catch (e) {
            // Not valid JSON
          }
          inJson = false;
          currentJson = '';
        }
      } else if (inJson) {
        currentJson += char;
      }
    }
    
    return jsonObjects;
  }

  // Extract bike identifiers from various possible locations
  extractBikeIdentifiers(data) {
    const identifiers = {
      keyid: null,
      id: null,
      makerid: null,
      manufacturer: null,
      familyid: null,
      familyname: null,
      modelid: null,
      model: null,
      year: null
    };

    // Recursive search function
    const search = (obj, path = '') => {
      if (!obj || typeof obj !== 'object') return;

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        // Direct matches
        if (key === 'keyid' && value) identifiers.keyid = value;
        if (key === 'id' && value && typeof value === 'string' && value.includes('-')) identifiers.id = value;
        if (key === 'makerid' && value) identifiers.makerid = value;
        if (key === 'manufacturer' && value) identifiers.manufacturer = value;
        if (key === 'familyid' && value) identifiers.familyid = value;
        if (key === 'familyname' && value) identifiers.familyname = value;
        if (key === 'family' && value && !identifiers.familyname) identifiers.familyname = value;
        if (key === 'modelid' && value) identifiers.modelid = value;
        if (key === 'model' && value && !identifiers.model) identifiers.model = value;
        if (key === 'year' && value) identifiers.year = parseInt(value);

        // Recursive search
        if (typeof value === 'object' && value !== null) {
          search(value, currentPath);
        }
      }
    };

    // Search through the cleaned data
    const cleanedData = this.findAndDecodeJsonStrings(data);
    search(cleanedData);

    // Map makerid to manufacturer name
    if (identifiers.makerid && this.makerIds[identifiers.makerid]) {
      identifiers.manufacturer = this.makerIds[identifiers.makerid];
    }

    // Extract from id if available (e.g., "bulls-cross-lite-evo-2-750-2023")
    if (identifiers.id && !identifiers.year) {
      const yearMatch = identifiers.id.match(/(\d{4})$/);
      if (yearMatch) {
        identifiers.year = parseInt(yearMatch[1]);
      }
    }

    return identifiers;
  }

  // Parse electric bike specifications
  parseElectricSpecs(data) {
    const electric = {
      isEbike: false,
      motor: null,
      battery: null,
      display: null
    };

    const search = (obj) => {
      if (!obj || typeof obj !== 'object') return;

      for (const [key, value] of Object.entries(obj)) {
        // Check various fields that might contain electric specs
        if (key.toLowerCase().includes('motor') || 
            key.toLowerCase().includes('ebike') ||
            key.toLowerCase().includes('electric')) {
          
          if (typeof value === 'string') {
            // Parse motor specs from string
            const motorMatch = value.match(/(\w+)\s+(\d+)w\s+(\d+)nm/i);
            if (motorMatch) {
              electric.isEbike = true;
              electric.motor = {
                manufacturer: motorMatch[1],
                powerW: parseInt(motorMatch[2]),
                torqueNm: parseInt(motorMatch[3]),
                description: value
              };
            }
          } else if (typeof value === 'object') {
            if (value.description) {
              electric.motor = value;
              electric.isEbike = true;
            }
          }
        }

        if (key.toLowerCase().includes('battery')) {
          if (typeof value === 'string') {
            const batteryMatch = value.match(/(\d+)wh/i);
            if (batteryMatch) {
              electric.battery = {
                capacityWh: parseInt(batteryMatch[1]),
                description: value
              };
            }
          } else if (typeof value === 'object') {
            electric.battery = value;
          }
        }

        if (key.toLowerCase().includes('display')) {
          electric.display = value;
        }

        // Recursive search
        if (typeof value === 'object' && value !== null) {
          search(value);
        }
      }
    };

    const cleanedData = this.findAndDecodeJsonStrings(data);
    search(cleanedData);

    return electric;
  }

  // Extract and normalize geometry data
  extractGeometry(data) {
    const geometry = {
      sizes: []
    };

    const search = (obj) => {
      if (!obj || typeof obj !== 'object') return;

      // Look for sizes array or geometry objects
      if (obj.sizes && Array.isArray(obj.sizes)) {
        geometry.sizes = obj.sizes.map(size => this.normalizeGeometrySize(size));
      } else if (obj.geometry) {
        if (Array.isArray(obj.geometry)) {
          geometry.sizes = obj.geometry.map(size => this.normalizeGeometrySize(size));
        } else if (typeof obj.geometry === 'object') {
          // Single geometry object
          const normalized = this.normalizeGeometrySize(obj.geometry);
          if (normalized) geometry.sizes.push(normalized);
        }
      }

      // Recursive search
      for (const value of Object.values(obj)) {
        if (typeof value === 'object' && value !== null) {
          search(value);
        }
      }
    };

    const cleanedData = this.findAndDecodeJsonStrings(data);
    search(cleanedData);

    return geometry;
  }

  // Normalize a single geometry size object
  normalizeGeometrySize(size) {
    const normalized = {};
    
    // Map various field names to standard names
    const fieldMap = {
      stackmm: 'stackMm',
      stack: 'stackMm',
      reachmm: 'reachMm',
      reach: 'reachMm',
      wheelbase: 'wheelbaseMm',
      wheelbasemm: 'wheelbaseMm',
      chainstay: 'chainstayMm',
      chainstaylengthmm: 'chainstayMm',
      headangle: 'headAngle',
      headtubeangle: 'headAngle',
      seatangle: 'seatAngle',
      seattubeangle: 'seatAngle',
      bbdrop: 'bbDropMm',
      bottombracketdropmm: 'bbDropMm'
    };

    for (const [key, value] of Object.entries(size)) {
      const normalizedKey = fieldMap[key.toLowerCase()] || key;
      
      // Convert string numbers to actual numbers
      if (typeof value === 'string' && !isNaN(value)) {
        normalized[normalizedKey] = parseFloat(value);
      } else {
        normalized[normalizedKey] = value;
      }
    }

    return normalized;
  }

  // Extract component specifications
  extractComponents(data) {
    const components = {};
    
    const componentFields = [
      'fork', 'frame', 'rearDerailleur', 'frontDerailleur', 'shifters',
      'cassette', 'crank', 'chain', 'brakes', 'brakeLevers', 'wheels',
      'rims', 'tires', 'frontHub', 'rearHub', 'stem', 'handlebar',
      'saddle', 'seatpost', 'pedals', 'headset'
    ];

    const search = (obj) => {
      if (!obj || typeof obj !== 'object') return;

      for (const [key, value] of Object.entries(obj)) {
        const normalizedKey = key.replace(/[-_]/g, '').toLowerCase();
        
        for (const field of componentFields) {
          if (normalizedKey.includes(field.toLowerCase())) {
            if (typeof value === 'string' && value.trim()) {
              components[field] = value.trim();
            } else if (typeof value === 'object' && value.description) {
              components[field] = value.description;
            }
          }
        }

        // Recursive search
        if (typeof value === 'object' && value !== null && key !== 'components') {
          search(value);
        }
      }
    };

    const cleanedData = this.findAndDecodeJsonStrings(data);
    search(cleanedData);

    return components;
  }

  // Determine if a record needs re-scraping
  needsRescraping(cleanedData) {
    const required = ['makerid', 'familyid', 'model', 'year'];
    const missing = [];

    for (const field of required) {
      if (!cleanedData[field]) {
        missing.push(field);
      }
    }

    // For e-bikes, check if we have motor data
    if (cleanedData.isEbike && !cleanedData.electric?.motor) {
      missing.push('electric.motor');
    }

    return {
      needs: missing.length > 0,
      missing
    };
  }

  // Extract comprehensive bike data from a webpage (based on 04_data_scraper.js)
  async scrapeWebpage(url) {
    if (!this.stagehand) {
      throw new Error('Stagehand not initialized - enable scraping in initialize()');
    }

    const page = this.stagehand.page;
    const MAX_RETRIES = 3;
    const TIMEOUT = 45000;
    
    for (let retryCount = 0; retryCount < MAX_RETRIES; retryCount++) {
      try {
        console.log(chalk.blue(`    🌐 Navigating to: ${url}`));
        
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: TIMEOUT
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check for 404 or errors
        const pageStatus = await page.evaluate(() => {
          return {
            title: document.title,
            hasContent: document.body.textContent?.length > 1000,
            has404: document.title?.toLowerCase().includes('404') || 
                    document.body.textContent?.toLowerCase().includes('page not found'),
            contentLength: document.body.textContent?.length || 0
          };
        });
        
        if (pageStatus.has404) {
          throw new Error('404_NOT_FOUND');
        }
        
        if (!pageStatus.hasContent) {
          throw new Error('EMPTY_PAGE');
        }
        
        // Extract all JSON data from the page, including script tags
        const comprehensiveData = await page.evaluate(() => {
          const data = {
            pageInfo: {
              title: document.title,
              url: window.location.href,
              extractionTimestamp: new Date().toISOString()
            }
          };
          
          // Look for embedded JSON in script tags
          const scriptTags = Array.from(document.querySelectorAll('script'));
          let foundBikeData = false;
          
          for (const script of scriptTags) {
            if (script.textContent && script.textContent.includes('"bike":')) {
              try {
                // Extract JSON from script content
                const jsonMatch = script.textContent.match(/{.*}/s);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  if (parsed.props?.pageProps?.bike) {
                    // Found the main bike data!
                    Object.assign(data, parsed.props.pageProps.bike);
                    foundBikeData = true;
                    break;
                  }
                }
              } catch (e) {
                // Continue to next script
              }
            }
          }
          
          // If we didn't find structured data, extract what we can from the page
          if (!foundBikeData) {
            // Extract title
            const h1 = document.querySelector('h1');
            if (h1) {
              data.name = h1.textContent?.trim();
            }
            
            // Try to extract specs from tables
            const specs = {};
            const tables = document.querySelectorAll('table');
            tables.forEach(table => {
              const rows = table.querySelectorAll('tr');
              rows.forEach(row => {
                const cells = row.querySelectorAll('td, th');
                if (cells.length === 2) {
                  const key = cells[0].textContent?.trim();
                  const value = cells[1].textContent?.trim();
                  if (key && value) {
                    specs[key.toLowerCase()] = value;
                  }
                }
              });
            });
            if (Object.keys(specs).length > 0) {
              data.specifications = specs;
            }
          }
          
          return data;
        });
        
        console.log(chalk.green(`    ✅ Successfully scraped ${url}`));
        return comprehensiveData;
        
      } catch (error) {
        console.log(chalk.yellow(`    ⚠️ Scrape attempt ${retryCount + 1} failed: ${error.message}`));
        
        if (retryCount < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.log(chalk.red(`    ❌ Failed to scrape after ${MAX_RETRIES} attempts`));
          throw error;
        }
      }
    }
  }

  // Process a single bike record
  async processBikeRecord(record, enableScraping = false) {
    try {
      const { keyid, comprehensive_data } = record;
      
      // Extract all data
      const identifiers = this.extractBikeIdentifiers(comprehensive_data);
      const electric = this.parseElectricSpecs(comprehensive_data);
      const geometry = this.extractGeometry(comprehensive_data);
      const components = this.extractComponents(comprehensive_data);
      
      // Combine into cleaned record
      const cleanedData = {
        keyid,
        ...identifiers,
        ...electric,
        geometry,
        components,
        original_data: comprehensive_data
      };

      // Check if needs re-scraping
      const scrapeCheck = this.needsRescraping(cleanedData);
      cleanedData.needs_rescraping = scrapeCheck.needs;
      cleanedData.missing_fields = scrapeCheck.missing;
      
      // If scraping is enabled and data is missing, try to re-scrape
      if (enableScraping && scrapeCheck.needs && comprehensive_data?.pageInfo?.url) {
        console.log(chalk.yellow(`\n    🔄 Re-scraping ${comprehensive_data.pageInfo.url} (missing: ${scrapeCheck.missing.join(', ')})`));
        
        try {
          const newData = await this.scrapeWebpage(comprehensive_data.pageInfo.url);
          
          // Re-process with new data
          const newIdentifiers = this.extractBikeIdentifiers(newData);
          const newElectric = this.parseElectricSpecs(newData);
          const newGeometry = this.extractGeometry(newData);
          const newComponents = this.extractComponents(newData);
          
          // Merge new data with existing
          Object.assign(cleanedData, {
            ...newIdentifiers,
            ...newElectric,
            geometry: { ...cleanedData.geometry, ...newGeometry },
            components: { ...cleanedData.components, ...newComponents },
            original_data: newData,
            scraped_at: new Date().toISOString()
          });
          
          // Re-check if still needs scraping
          const newScrapeCheck = this.needsRescraping(cleanedData);
          cleanedData.needs_rescraping = newScrapeCheck.needs;
          cleanedData.missing_fields = newScrapeCheck.missing;
          
          this.stats.scraped++;
          console.log(chalk.green(`    ✅ Re-scraping improved data quality`));
          
        } catch (scrapeError) {
          console.log(chalk.red(`    ❌ Re-scraping failed: ${scrapeError.message}`));
          this.stats.scrapeFailed++;
        }
      }

      return {
        success: true,
        data: cleanedData,
        needsScraping: scrapeCheck.needs
      };
    } catch (error) {
      console.error(`Error processing keyid ${record.keyid}:`, error.message);
      return {
        success: false,
        error: error.message,
        keyid: record.keyid
      };
    }
  }

  // Create the cleaned data table
  async createCleanedTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS cleaned_bikes_data (
        keyid INTEGER PRIMARY KEY REFERENCES bikes_data(keyid),
        id TEXT,
        makerid TEXT,
        manufacturer TEXT,
        familyid TEXT,
        familyname TEXT,
        modelid TEXT,
        model TEXT,
        year INTEGER,
        is_ebike BOOLEAN DEFAULT FALSE,
        electric JSONB,
        geometry JSONB,
        components JSONB,
        needs_rescraping BOOLEAN DEFAULT FALSE,
        missing_fields TEXT[],
        original_data JSONB,
        cleaned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.client.query(createTableQuery);
    console.log(chalk.green('✓ Created cleaned_bikes_data table'));
  }

  // Save cleaned data to database
  async saveCleanedData(cleanedData) {
    const query = `
      INSERT INTO cleaned_bikes_data (
        keyid, id, makerid, manufacturer, familyid, familyname,
        modelid, model, year, is_ebike, electric, geometry,
        components, needs_rescraping, missing_fields, original_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (keyid) DO UPDATE SET
        id = EXCLUDED.id,
        makerid = EXCLUDED.makerid,
        manufacturer = EXCLUDED.manufacturer,
        familyid = EXCLUDED.familyid,
        familyname = EXCLUDED.familyname,
        modelid = EXCLUDED.modelid,
        model = EXCLUDED.model,
        year = EXCLUDED.year,
        is_ebike = EXCLUDED.is_ebike,
        electric = EXCLUDED.electric,
        geometry = EXCLUDED.geometry,
        components = EXCLUDED.components,
        needs_rescraping = EXCLUDED.needs_rescraping,
        missing_fields = EXCLUDED.missing_fields,
        original_data = EXCLUDED.original_data,
        cleaned_at = CURRENT_TIMESTAMP
    `;

    const values = [
      cleanedData.keyid,
      cleanedData.id,
      cleanedData.makerid,
      cleanedData.manufacturer,
      cleanedData.familyid,
      cleanedData.familyname,
      cleanedData.modelid,
      cleanedData.model,
      cleanedData.year,
      cleanedData.isEbike,
      cleanedData.electric,
      cleanedData.geometry,
      cleanedData.components,
      cleanedData.needs_rescraping,
      cleanedData.missing_fields,
      cleanedData.original_data
    ];

    await this.client.query(query, values);
  }

  // Process all records
  async processAll(enableScraping = false) {
    // Create cleaned table
    await this.createCleanedTable();

    // Get total count
    const countResult = await this.client.query(
      'SELECT COUNT(*) FROM bikes_data WHERE comprehensive_data IS NOT NULL'
    );
    this.stats.total = parseInt(countResult.rows[0].count);

    console.log(chalk.blue(`\nProcessing ${this.stats.total} bike records...`));
    if (enableScraping) {
      console.log(chalk.yellow('🔄 Re-scraping enabled for records with missing data'));
    }

    // Create progress bar
    const progressBar = new SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} | ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    }, Presets.shades_classic);

    progressBar.start(this.stats.total, 0);

    // Process in batches
    const batchSize = 100;
    const limit = pLimit(5); // Process 5 records concurrently

    for (let offset = 0; offset < this.stats.total; offset += batchSize) {
      const result = await this.client.query(
        'SELECT keyid, comprehensive_data FROM bikes_data WHERE comprehensive_data IS NOT NULL ORDER BY keyid LIMIT $1 OFFSET $2',
        [batchSize, offset]
      );

      const promises = result.rows.map(row => 
        limit(async () => {
          const processed = await this.processBikeRecord(row, enableScraping);
          
          if (processed.success) {
            await this.saveCleanedData(processed.data);
            this.stats.cleaned++;
            if (processed.needsScraping) {
              this.stats.needsScraping++;
            }
          } else {
            this.stats.errors++;
          }
          
          this.stats.processed++;
          progressBar.update(this.stats.processed);
        })
      );

      await Promise.all(promises);
    }

    progressBar.stop();

    // Generate summary report
    await this.generateReport();
  }

  // Generate summary report
  async generateReport() {
    console.log(chalk.green('\n=== CLEANING SUMMARY ==='));
    console.log(`Total records: ${this.stats.total}`);
    console.log(`Successfully cleaned: ${chalk.green(this.stats.cleaned)}`);
    console.log(`Need re-scraping: ${chalk.yellow(this.stats.needsScraping)}`);
    if (this.stats.scraped > 0) {
      console.log(`Re-scraped: ${chalk.blue(this.stats.scraped)}`);
      console.log(`Scrape failed: ${chalk.red(this.stats.scrapeFailed)}`);
    }
    console.log(`Errors: ${chalk.red(this.stats.errors)}`);

    // Get breakdown of missing fields
    const missingFieldsResult = await this.client.query(`
      SELECT missing_fields, COUNT(*) as count
      FROM cleaned_bikes_data
      WHERE needs_rescraping = true
      GROUP BY missing_fields
      ORDER BY count DESC
      LIMIT 10
    `);

    if (missingFieldsResult.rows.length > 0) {
      console.log(chalk.yellow('\n=== TOP MISSING FIELDS ==='));
      for (const row of missingFieldsResult.rows) {
        console.log(`${row.missing_fields}: ${row.count} records`);
      }
    }

    // Save detailed report
    const downloadsDir = path.join(__dirname, 'downloads');
    await fs.mkdir(downloadsDir, { recursive: true });
    
    const reportPath = path.join(downloadsDir, 'cleaning_report.json');
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      missingFields: missingFieldsResult.rows
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(chalk.green(`\n✓ Detailed report saved to ${reportPath}`));
  }

  async cleanup() {
    await this.client.end();
    if (this.stagehand) {
      await this.stagehand.close();
    }
  }
}

// Main execution
async function main() {
  const cleaner = new BikeDataCleaner();
  
  // Check command line arguments
  const args = process.argv.slice(2);
  const enableScraping = args.includes('--scrape') || args.includes('-s');
  const help = args.includes('--help') || args.includes('-h');
  
  if (help) {
    console.log(`
${chalk.bold('BikeNode Data Cleaner and Scraper')}

Usage: node 05_data_cleaner_and_scraper.js [options]

Options:
  -s, --scrape    Enable re-scraping for records with missing data
  -h, --help      Show this help message

Description:
  This script processes the bikes_data table, extracts structured information,
  and creates a cleaned_bikes_data table. When --scrape is enabled, it will
  also re-scrape webpages for records missing critical data (makerid, familyid,
  model, year, or electric motor specs for e-bikes).
`);
    process.exit(0);
  }
  
  try {
    await cleaner.initialize(enableScraping);
    await cleaner.processAll(enableScraping);
  } catch (error) {
    console.error(chalk.red('Fatal error:'), error);
  } finally {
    await cleaner.cleanup();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default BikeDataCleaner;