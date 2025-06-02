#!/usr/bin/env node
/*  Enhanced Data Cleaner v5 - Three-tier extraction approach  */

import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import 'dotenv/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the enhanced scraper for fallback web scraping
import EnhancedBikeScraper from './04.5_enhanced_scraper_fixed.js';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bikenode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

class EnhancedDataCleaner {
  constructor() {
    this.pool = new pg.Pool(dbConfig);
    this.scraper = null;
    this.makerIds = {};
    this.stats = {
      total: 0,
      processed: 0,
      fromBikesData: 0,
      fromBikesData2: 0,
      fromWebScrape: 0,
      failed: 0,
      errors: []
    };
  }

  async initialize(enableWebScraping = false) {
    // Test database connection
    try {
      const client = await this.pool.connect();
      console.log(chalk.green('✅ Database connection established'));
      client.release();
    } catch (err) {
      console.error(chalk.red('❌ Database connection failed:'), err.message);
      throw err;
    }

    // Load maker_ids mapping
    await this.loadMakerIds();

    // Initialize web scraper if enabled
    if (enableWebScraping) {
      this.scraper = new EnhancedBikeScraper();
      await this.scraper.initialize();
      console.log(chalk.green('✅ Web scraper initialized'));
    }

    // Ensure bikes table exists
    await this.ensureBikesTable();
  }

  async ensureBikesTable() {
    const tableCheck = await this.pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bikes'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log(chalk.yellow('⚠️  bikes table not found, creating it...'));
      if (!this.scraper) {
        this.scraper = new EnhancedBikeScraper();
        await this.scraper.initialize();
      }
      // The scraper has the createBikesTable method
    }
  }

  /**
   * Load maker_ids mapping from file
   */
  async loadMakerIds() {
    try {
      const makerIdsPath = path.join(__dirname, 'maker_ids.js');
      const content = await fs.readFile(makerIdsPath, 'utf8');
      const match = content.match(/const maker_ids = ({[\s\S]*})\s*;?\s*$/);
      if (match) {
        this.makerIds = JSON.parse(match[1]);
        console.log(chalk.green(`✅ Loaded ${Object.keys(this.makerIds).length} maker IDs`));
      } else {
        console.log(chalk.yellow('⚠️ Could not parse maker_ids.js'));
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Could not load maker_ids.js: ${error.message}`));
    }
  }

  /**
   * Find makerid from manufacturer name
   */
  findMakeridFromManufacturer(manufacturer) {
    if (!manufacturer) return null;
    
    const cleanName = manufacturer.toLowerCase();
    
    // Direct lookup
    if (this.makerIds[cleanName]) {
      return cleanName;
    }
    
    // Try to find partial matches
    for (const [makerid, brandName] of Object.entries(this.makerIds)) {
      if (cleanName.includes(makerid) || brandName.toLowerCase().includes(cleanName)) {
        return makerid;
      }
    }
    
    return null;
  }

  /**
   * Recursively decode JSON strings within any data structure
   */
  findAndDecodeJsonStrings(data, depth = 0, maxDepth = 10) {
    if (depth > maxDepth) return data;

    if (typeof data === 'string') {
      if ((data.includes('{') && data.includes('}')) || (data.includes('[') && data.includes(']'))) {
        try {
          const parsed = JSON.parse(data);
          return this.findAndDecodeJsonStrings(parsed, depth + 1, maxDepth);
        } catch (e) {
          return data;
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

  /**
   * Clean up concatenated manufacturer names
   */
  cleanManufacturerName(manufacturer) {
    if (!manufacturer) return null;
    
    let cleaned = manufacturer;
    
    // Handle various concatenated manufacturer names
    if (cleaned.includes('Cross')) {
      // Handle cases like "BULLSCross" -> "BULLS"
      const match = cleaned.match(/^([A-Z]+)(?=[A-Z][a-z])/);
      if (match) {
        cleaned = match[1];
      }
    } else if (/^[A-Z][a-z]+[A-Z][a-z]/.test(cleaned)) {
      // Handle cases like "GiantXtC" -> "Giant", "SpecializedTarmac" -> "Specialized"
      const match = cleaned.match(/^([A-Z][a-z]+)(?=[A-Z])/);
      if (match) {
        cleaned = match[1];
      }
    }
    
    // Convert to lowercase for consistency
    return cleaned.toLowerCase();
  }

  /**
   * Extract bike data using three-tier approach
   */
  async extractBikeData(record) {
    const { keyid, comprehensive_data, url } = record;
    
    // Tier 1: Try bikes_data comprehensive_data
    try {
      if (comprehensive_data) {
        const decodedData = this.findAndDecodeJsonStrings(comprehensive_data);
        const bikeData = this.extractBikeFromComprehensiveData(decodedData);
        
        if (this.isDataSufficient(bikeData)) {
          this.stats.fromBikesData++;
          return {
            success: true,
            source: 'bikes_data',
            data: bikeData
          };
        }
      }
    } catch (error) {
      console.log(chalk.yellow(`  ⚠️ Tier 1 failed for keyid ${keyid}: ${error.message}`));
    }

    // Tier 2: Try bikes_data_2 extracted_data
    try {
      const data2Result = await this.pool.query(
        'SELECT extracted_data FROM bikes_data_2 WHERE keyid = $1',
        [keyid]
      );

      if (data2Result.rows.length > 0 && data2Result.rows[0].extracted_data) {
        const extractedData = data2Result.rows[0].extracted_data;
        
        if (this.isDataSufficient(extractedData)) {
          this.stats.fromBikesData2++;
          return {
            success: true,
            source: 'bikes_data_2',
            data: extractedData
          };
        }
      }
    } catch (error) {
      console.log(chalk.yellow(`  ⚠️ Tier 2 failed for keyid ${keyid}: ${error.message}`));
    }

    // Tier 3: Web scraping if enabled
    if (this.scraper && url) {
      try {
        console.log(chalk.blue(`  🌐 Tier 3: Web scraping ${url}`));
        const scrapedData = await this.scraper.extractBikeData(url);
        
        if (scrapedData.bike && this.isDataSufficient(scrapedData.bike)) {
          // Save to bikes_data_2 for future use
          await this.saveToBikesData2(keyid, scrapedData);
          
          this.stats.fromWebScrape++;
          return {
            success: true,
            source: 'web_scrape',
            data: scrapedData.bike
          };
        }
      } catch (error) {
        console.log(chalk.red(`  ❌ Tier 3 failed for keyid ${keyid}: ${error.message}`));
      }
    }

    // All tiers failed
    this.stats.failed++;
    return {
      success: false,
      source: 'none',
      error: 'No sufficient data found in any tier'
    };
  }

  /**
   * Extract bike data from comprehensive_data JSONB
   */
  extractBikeFromComprehensiveData(data) {
    // Method 1: Search through all string fields for embedded JSON FIRST (highest quality data)
    const searchForEmbeddedJson = (obj) => {
      if (typeof obj === 'string' && obj.includes('{"props"')) {
        try {
          const jsonStart = obj.indexOf('{"props"');
          let jsonStr = obj.substring(jsonStart);
          
          // Try to find valid JSON ending by attempting to parse progressively shorter strings
          let parsed = null;
          for (let i = jsonStr.length; i > 1000; i -= 100) {
            try {
              parsed = JSON.parse(jsonStr.substring(0, i));
              break;
            } catch (e) {
              // Continue trying shorter lengths
            }
          }
          
          if (parsed) {
            // Check for different case variations of pageProps
            const bike = parsed.props?.pageProps?.bike || parsed.props?.pageprops?.bike;
            if (bike) {
              return bike;
            }
          }
        } catch (e) {
          // Continue searching
        }
      }
      
      if (obj && typeof obj === 'object') {
        for (const value of Object.values(obj)) {
          const result = searchForEmbeddedJson(value);
          if (result) return result;
        }
      }
      
      return null;
    };

    const embeddedResult = searchForEmbeddedJson(data);
    if (embeddedResult) {
      console.log('  📦 Found embedded JSON in comprehensive_data');
      return embeddedResult;
    }

    // Method 2: Look for structured bike data in standard locations
    const possiblePaths = [
      data.bike,
      data.props?.pageProps?.bike,
      data.props?.pageprops?.bike,
      data.bikeDetails,
      data.pageData?.bike,
      data.data?.bike
    ];

    for (const bikeData of possiblePaths) {
      if (bikeData && typeof bikeData === 'object' && bikeData.manufacturer) {
        console.log('  🔍 Found structured bike data in standard location');
        
        // Clean up the manufacturer name and find proper makerid
        const cleanedManufacturer = this.cleanManufacturerName(bikeData.manufacturer);
        const makerid = this.findMakeridFromManufacturer(cleanedManufacturer);
        
        const cleanedData = {
          ...bikeData,
          manufacturer: cleanedManufacturer,
          makerid: makerid,
          makerId: makerid
        };
        
        return cleanedData;
      }
    }

    // Method 3: Look for embedded JSON string in frameMaterial field specifically
    if (typeof data.frameMaterial === 'string' && data.frameMaterial.includes('{"props"')) {
      try {
        const jsonStart = data.frameMaterial.indexOf('{"props"');
        const jsonStr = data.frameMaterial.substring(jsonStart);
        const parsed = JSON.parse(jsonStr);
        
        const bike = parsed.props?.pageProps?.bike || parsed.props?.pageprops?.bike;
        if (bike) {
          console.log('  📦 Found embedded JSON in frameMaterial field');
          return bike;
        }
      } catch (e) {
        console.log('  ⚠️ Failed to parse embedded JSON from frameMaterial');
      }
    }

    // Method 4: If no structured bike object found, try to construct from fragments
    if (data.manufacturer || data.make) {
      console.log('  🔧 Constructing bike data from fragments');
      
      // Clean up manufacturer name and find proper makerid
      const manufacturer = this.cleanManufacturerName(data.manufacturer || data.make);
      const makerid = this.findMakeridFromManufacturer(manufacturer);
      
      return {
        manufacturer: manufacturer,
        makerid: makerid,
        makerId: makerid,
        model: data.model,
        year: parseInt(data.year),
        id: data.id,
        isEbike: data.isElectric || false,
        electricSpecs: data.electricSpecs,
        frameMaterial: data.frameMaterial?.split('Color:')[0]?.trim(),
        wheelSize: data.wheelSize,
        suspension: data.suspension,
        description: data.description,
        // Copy other available fields
        ...data
      };
    }

    return null;
  }

  /**
   * Check if extracted data has sufficient fields for processing
   */
  isDataSufficient(data) {
    if (!data) return false;
    
    // Minimum required fields
    const hasManufacturer = data.manufacturer || data.make;
    const hasModel = data.model;
    const hasYear = data.year;
    const hasMakerid = data.makerid || data.makerId;
    
    // CRITICAL: If makerid is null, don't save to bikes_data_2 
    // so that the fallback scraper (04.5) can process it
    if (!hasMakerid) {
      console.log(chalk.yellow(`  ⚠️ No valid makerid found - will let fallback scraper handle this`));
      return false;
    }
    
    return hasManufacturer && hasModel && hasYear && hasMakerid;
  }

  /**
   * Save scraped data to bikes_data_2 table with transaction support
   */
  async saveToBikesData2WithTransaction(keyid, scrapedData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if keyid already exists in bikes_data_2
      const existingResult = await client.query(
        'SELECT keyid FROM bikes_data_2 WHERE keyid = $1',
        [keyid]
      );
      
      if (existingResult.rows.length > 0) {
        console.log(chalk.yellow(`  ⚠️ KeyID ${keyid} already exists in bikes_data_2 - SKIPPING to prevent overwrite`));
        await client.query('ROLLBACK');
        return { success: false, reason: 'already_exists' };
      }
      
      // Only insert if keyid doesn't exist
      await client.query(`
        INSERT INTO bikes_data_2 (keyid, url, has_embedded_data, extracted_data, raw_data)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        keyid,
        scrapedData.url,
        scrapedData.hasEmbeddedData,
        JSON.stringify(scrapedData.bike || {}),
        JSON.stringify(scrapedData.raw)
      ]);
      
      await client.query('COMMIT');
      console.log(chalk.green(`  ✅ Saved new data to bikes_data_2 for keyid ${keyid}`));
      return { success: true };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.log(chalk.red(`  ❌ Transaction failed for keyid ${keyid}: ${error.message}`));
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async saveToBikesData2(keyid, scrapedData) {
    return this.saveToBikesData2WithTransaction(keyid, scrapedData);
  }

  /**
   * Save cleaned data to bikes table using scraper's transform function
   */
  async saveCleanedData(keyid, bikeData, source) {
    try {
      if (this.scraper) {
        // Use the scraper's transform function
        const cleanData = this.scraper.transformToCleanFormat(keyid, { bike: bikeData });
        
        if (cleanData && cleanData.manufacturer && cleanData.model && cleanData.year) {
          // Prepare values for PostgreSQL - stringify JSONB fields
          const jsonbFields = ['frame_colors', 'electric_specs', 'components', 'geometry', 
                              'spec_level_components', 'images', 'family_siblings', 'raw_data'];
          
          const fields = Object.keys(cleanData);
          const values = Object.values(cleanData).map((value, index) => {
            const fieldName = fields[index];
            if (jsonbFields.includes(fieldName) && value !== null && typeof value === 'object') {
              return JSON.stringify(value);
            }
            return value;
          });
          
          const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
          const updateSet = fields.map(f => `${f} = EXCLUDED.${f}`).join(', ');
          
          await this.pool.query(`
            INSERT INTO bikes (${fields.join(', ')})
            VALUES (${placeholders})
            ON CONFLICT (keyid) DO UPDATE SET ${updateSet}
          `, values);
          
          return true;
        }
      }
      
      // Fallback: minimal save
      await this.pool.query(`
        INSERT INTO bikes (keyid, manufacturer, model, year, raw_data)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (keyid) DO UPDATE SET
          manufacturer = EXCLUDED.manufacturer,
          model = EXCLUDED.model,
          year = EXCLUDED.year,
          raw_data = EXCLUDED.raw_data,
          extracted_at = CURRENT_TIMESTAMP
      `, [
        keyid,
        bikeData.manufacturer || bikeData.make,
        bikeData.model,
        bikeData.year,
        JSON.stringify({ source, data: bikeData })
      ]);
      
      return true;
    } catch (error) {
      console.error(chalk.red(`  ❌ Failed to save cleaned data: ${error.message}`));
      return false;
    }
  }

  /**
   * Get bikes to process
   */
  async getBikesToProcess(limit = null) {
    const query = `
      SELECT 
        bc.keyid,
        bc.make,
        bc.model,
        bc.year,
        bc.variant,
        bd.comprehensive_data,
        bd.comprehensive_data->'pageInfo'->>'url' as url
      FROM bikes_catalog bc
      JOIN bikes_data bd ON bc.keyid = bd.keyid
      WHERE bd.comprehensive_data IS NOT NULL
      ORDER BY bc.keyid
      ${limit ? `LIMIT ${limit}` : ''}
    `;
    
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Process all bikes
   */
  async processAll(options = {}) {
    const { limit = null, enableWebScraping = false } = options;
    
    console.log(chalk.bold('\n🔧 Enhanced Data Cleaner v5\n'));
    console.log(chalk.blue('Three-tier extraction approach:'));
    console.log(chalk.blue('  1. Extract from bikes_data (comprehensive_data)'));
    console.log(chalk.blue('  2. Fallback to bikes_data_2 (extracted_data)'));
    console.log(chalk.blue(`  3. Web scraping: ${enableWebScraping ? 'ENABLED' : 'DISABLED'}\n`));
    
    // Get bikes to process
    const bikes = await this.getBikesToProcess(limit);
    this.stats.total = bikes.length;
    
    console.log(chalk.blue(`Processing ${this.stats.total} bikes...\n`));
    
    // Process each bike
    for (const bike of bikes) {
      this.stats.processed++;
      const progress = `[${this.stats.processed}/${this.stats.total}]`;
      
      console.log(chalk.bold(`${progress} Processing: ${bike.year} ${bike.make} ${bike.model}`));
      console.log(`  KeyID: ${bike.keyid}`);
      
      try {
        // Extract data using three-tier approach
        const result = await this.extractBikeData(bike);
        
        if (result.success) {
          console.log(chalk.green(`  ✅ Extracted from: ${result.source}`));
          
          // Save cleaned data
          await this.saveCleanedData(bike.keyid, result.data, result.source);
        } else {
          console.log(chalk.red(`  ❌ Failed: ${result.error}`));
          this.stats.errors.push({
            keyid: bike.keyid,
            bike: `${bike.year} ${bike.make} ${bike.model}`,
            error: result.error
          });
        }
        
      } catch (error) {
        console.log(chalk.red(`  ❌ Error: ${error.message}`));
        this.stats.failed++;
        this.stats.errors.push({
          keyid: bike.keyid,
          bike: `${bike.year} ${bike.make} ${bike.model}`,
          error: error.message
        });
      }
      
      // Small delay between bikes
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Generate report
    await this.generateReport();
  }

  /**
   * Generate summary report
   */
  async generateReport() {
    console.log(chalk.bold('\n📊 EXTRACTION SUMMARY'));
    console.log(`Total processed: ${this.stats.processed}`);
    console.log(`From bikes_data: ${chalk.green(this.stats.fromBikesData)}`);
    console.log(`From bikes_data_2: ${chalk.blue(this.stats.fromBikesData2)}`);
    console.log(`From web scraping: ${chalk.yellow(this.stats.fromWebScrape)}`);
    console.log(`Failed: ${chalk.red(this.stats.failed)}`);
    
    const successRate = ((this.stats.processed - this.stats.failed) / this.stats.processed * 100).toFixed(1);
    console.log(`Success rate: ${successRate}%`);
    
    if (this.stats.errors.length > 0) {
      console.log(chalk.red('\n❌ ERRORS:'));
      this.stats.errors.slice(0, 5).forEach(error => {
        console.log(`  ${error.bike}: ${error.error}`);
      });
      
      if (this.stats.errors.length > 5) {
        console.log(`  ... and ${this.stats.errors.length - 5} more errors`);
      }
    }
    
    // Save detailed report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(__dirname, 'downloads', `extraction_report_${timestamp}.json`);
    
    await fs.mkdir(path.join(__dirname, 'downloads'), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      stats: this.stats,
      errors: this.stats.errors
    }, null, 2));
    
    console.log(chalk.green(`\n✅ Detailed report saved to: ${reportPath}`));
  }

  async cleanup() {
    await this.pool.end();
    if (this.scraper) {
      await this.scraper.cleanup();
    }
  }
}

// Main execution
async function main() {
  const cleaner = new EnhancedDataCleaner();
  
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const enableWebScraping = args.includes('--scrape') || args.includes('-s');
    const limit = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
    const help = args.includes('--help') || args.includes('-h');
    
    if (help) {
      console.log(`
${chalk.bold('Enhanced Data Cleaner v5')}

Usage: node 05_enhanced_data_cleaner.js [options]

Options:
  -s, --scrape     Enable web scraping as fallback (Tier 3)
  --limit=N        Process only N bikes (useful for testing)
  -h, --help       Show this help message

Three-tier extraction approach:
  1. Extract from bikes_data table (comprehensive_data JSONB)
  2. Fallback to bikes_data_2 table (extracted_data JSONB)  
  3. Web scraping from 99spokes (if enabled and needed)
  
All cleaned data is saved to the bikes table with proper schema.
`);
      process.exit(0);
    }
    
    await cleaner.initialize(enableWebScraping);
    
    await cleaner.processAll({
      limit: limit ? parseInt(limit) : null,
      enableWebScraping
    });
    
  } catch (error) {
    console.error(chalk.red('\n❌ Fatal error:'), error.message);
    console.error(error.stack);
  } finally {
    await cleaner.cleanup();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default EnhancedDataCleaner;