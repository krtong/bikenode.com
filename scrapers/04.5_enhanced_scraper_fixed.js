#!/usr/bin/env node
/*  Enhanced scraper v4.5 - Extracts ALL client-side JSON from 99spokes pages  */

import { Stagehand } from "@browserbasehq/stagehand";
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import 'dotenv/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  NAV_DELAY: 1000,
  RETRY_DELAY: 2000,
  MAX_RETRIES: 3,
  TIMEOUT: 45000,
  BATCH_SIZE: 100,
  CONCURRENT_LIMIT: 5
};

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bikenode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

class EnhancedBikeScraper {
  constructor() {
    this.pool = new pg.Pool(dbConfig);
    this.stagehand = null;
    this.stats = {
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };
  }

  async initialize() {
    // Test database connection
    try {
      const client = await this.pool.connect();
      console.log(chalk.green("✅ Database connection established"));
      client.release();
    } catch (err) {
      console.error(chalk.red("❌ Database connection failed:"), err.message);
      throw err;
    }

    // Create tables if they don't exist
    await this.createBikesTable();

    // Initialize Stagehand
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required");
    }

    this.stagehand = new Stagehand({ 
      env: "LOCAL", 
      apiKey: process.env.OPENAI_API_KEY,
      verbose: 0
    });
    
    await this.stagehand.init();
    console.log(chalk.green("✅ Stagehand initialized"));
  }

  /**
   * Extract ALL data from a 99spokes bike page
   * This includes the embedded JSON in script tags which contains the complete bike data
   */
  async extractBikeData(url) {
    const page = this.stagehand.page;
    
    for (let retryCount = 0; retryCount < CONFIG.MAX_RETRIES; retryCount++) {
      try {
        console.log(chalk.blue(`🌐 Navigating to: ${url}`));
        
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: CONFIG.TIMEOUT
        });
        
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, CONFIG.NAV_DELAY));
        
        // Check for errors
        const pageStatus = await page.evaluate(() => {
          return {
            title: document.title,
            url: window.location.href,
            hasContent: document.body?.textContent?.length > 1000,
            has404: document.title?.toLowerCase().includes('404') || 
                    document.body?.textContent?.toLowerCase().includes('page not found'),
            hasError: document.title?.toLowerCase().includes('error'),
            contentLength: document.body?.textContent?.length || 0
          };
        });
        
        if (pageStatus.has404) {
          throw new Error('404_NOT_FOUND');
        }
        
        if (!pageStatus.hasContent) {
          throw new Error(`EMPTY_PAGE: Only ${pageStatus.contentLength} chars`);
        }
        
        // Extract all data including embedded JSON
        const extractedData = await page.evaluate(() => {
          const result = {
            pageInfo: {
              title: document.title,
              url: window.location.href,
              extractedAt: new Date().toISOString()
            },
            embeddedData: null,
            visibleData: {},
            rawScripts: []
          };
          
          // 1. Extract embedded JSON from script tags (main data source)
          const scriptTags = Array.from(document.querySelectorAll('script'));
          
          for (const script of scriptTags) {
            const content = script.textContent || '';
            
            // Look for Next.js data script
            if (script.id === '__NEXT_DATA__' && content) {
              try {
                const parsed = JSON.parse(content);
                result.embeddedData = parsed;
                console.log('Found __NEXT_DATA__ script');
                break;
              } catch (e) {
                console.error('Failed to parse __NEXT_DATA__:', e);
              }
            }
            
            // Look for other embedded JSON patterns
            if (content.includes('"bike":') || content.includes('"props":')) {
              // Try to extract JSON object
              const jsonMatches = content.matchAll(/{[^{}]*"(?:bike|props)":[^{}]*(?:{[^{}]*}[^{}]*)*}/g);
              
              for (const match of jsonMatches) {
                try {
                  const parsed = JSON.parse(match[0]);
                  if (parsed.props?.pageProps?.bike || parsed.bike) {
                    result.embeddedData = parsed;
                    console.log('Found embedded bike data in script');
                    break;
                  }
                } catch (e) {
                  // Try larger JSON extraction
                  try {
                    // Extract from beginning of JSON to end of script
                    const startIdx = content.indexOf('{');
                    const endIdx = content.lastIndexOf('}');
                    if (startIdx >= 0 && endIdx > startIdx) {
                      const jsonStr = content.substring(startIdx, endIdx + 1);
                      const parsed = JSON.parse(jsonStr);
                      if (parsed.props?.pageProps?.bike) {
                        result.embeddedData = parsed;
                        console.log('Found embedded data with broader extraction');
                        break;
                      }
                    }
                  } catch (e2) {
                    // Continue to next script
                  }
                }
              }
              
              // Store raw script content for debugging
              if (content.length < 50000) { // Don't store huge scripts
                result.rawScripts.push({
                  length: content.length,
                  preview: content.substring(0, 200),
                  hasPropsKeyword: content.includes('"props":'),
                  hasBikeKeyword: content.includes('"bike":')
                });
              }
            }
          }
          
          // 2. Extract visible page data as fallback
          const h1 = document.querySelector('h1');
          if (h1) {
            result.visibleData.title = h1.textContent?.trim();
          }
          
          // Extract tables (specifications, geometry, etc.)
          const tables = document.querySelectorAll('table');
          result.visibleData.tables = [];
          
          tables.forEach((table, tableIndex) => {
            const tableData = {
              headers: [],
              rows: []
            };
            
            // Extract headers
            const headerCells = table.querySelectorAll('thead th, thead td, tr:first-child th, tr:first-child td');
            headerCells.forEach(cell => {
              tableData.headers.push(cell.textContent?.trim());
            });
            
            // Extract rows
            const rows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
            rows.forEach(row => {
              const rowData = [];
              const cells = row.querySelectorAll('td, th');
              cells.forEach(cell => {
                rowData.push(cell.textContent?.trim());
              });
              if (rowData.length > 0) {
                tableData.rows.push(rowData);
              }
            });
            
            if (tableData.rows.length > 0) {
              result.visibleData.tables.push(tableData);
            }
          });
          
          // Extract images
          const images = document.querySelectorAll('img');
          result.visibleData.images = [];
          
          images.forEach(img => {
            if (img.src && !img.src.includes('data:') && 
                (img.src.includes('bike') || img.src.includes('99spokes') || 
                 img.src.includes('cloudfront') || img.width > 200)) {
              result.visibleData.images.push({
                src: img.src,
                alt: img.alt || '',
                width: img.width,
                height: img.height
              });
            }
          });
          
          // Extract any structured data from the page
          const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
          result.visibleData.structuredData = [];
          
          jsonLdScripts.forEach(script => {
            try {
              const data = JSON.parse(script.textContent || '{}');
              result.visibleData.structuredData.push(data);
            } catch (e) {
              // Invalid JSON-LD
            }
          });
          
          return result;
        });
        
        // Process and clean the extracted data
        const processedData = this.processExtractedData(extractedData, url);
        
        console.log(chalk.green(`✅ Successfully extracted data from ${url}`));
        return processedData;
        
      } catch (error) {
        console.log(chalk.yellow(`⚠️ Attempt ${retryCount + 1} failed: ${error.message}`));
        
        if (retryCount < CONFIG.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
        } else {
          console.log(chalk.red(`❌ Failed after ${CONFIG.MAX_RETRIES} attempts`));
          throw error;
        }
      }
    }
  }

  /**
   * Process the raw extracted data into a clean structure
   */
  processExtractedData(rawData, url) {
    const processed = {
      url: url,
      extractedAt: new Date().toISOString(),
      hasEmbeddedData: !!rawData.embeddedData,
      bike: null,
      raw: rawData
    };
    
    // If we found embedded JSON data, extract the bike information
    if (rawData.embeddedData) {
      // Handle Next.js data structure
      if (rawData.embeddedData.props?.pageProps?.bike) {
        processed.bike = rawData.embeddedData.props.pageProps.bike;
      } else if (rawData.embeddedData.bike) {
        processed.bike = rawData.embeddedData.bike;
      }
      
      // Extract additional metadata
      if (rawData.embeddedData.props?.pageProps) {
        const pageProps = rawData.embeddedData.props.pageProps;
        
        // Copy any additional useful data
        ['meta', 'seo', 'breadcrumbs', 'related'].forEach(key => {
          if (pageProps[key]) {
            processed[key] = pageProps[key];
          }
        });
      }
    }
    
    // If no embedded data, try to construct from visible data
    if (!processed.bike && rawData.visibleData.title) {
      processed.bike = {
        name: rawData.visibleData.title,
        extractedFromHtml: true,
        specifications: {},
        geometry: {},
        images: rawData.visibleData.images || []
      };
      
      // Process tables to extract specs and geometry
      if (rawData.visibleData.tables) {
        rawData.visibleData.tables.forEach(table => {
          // Detect geometry table
          if (table.headers.some(h => h?.toLowerCase().includes('stack') || 
                                     h?.toLowerCase().includes('reach'))) {
            // Process as geometry table
            table.rows.forEach(row => {
              if (row[0]) {
                const measurement = row[0].toLowerCase();
                for (let i = 1; i < row.length && i < table.headers.length; i++) {
                  const size = table.headers[i];
                  if (!processed.bike.geometry[size]) {
                    processed.bike.geometry[size] = {};
                  }
                  processed.bike.geometry[size][measurement] = row[i];
                }
              }
            });
          } else {
            // Process as specifications table
            table.rows.forEach(row => {
              if (row.length >= 2 && row[0] && row[1]) {
                processed.bike.specifications[row[0]] = row[1];
              }
            });
          }
        });
      }
    }
    
    return processed;
  }

  /**
   * Get bikes that need scraping from the database
   */
  async getBikesToScrape(limit = null, forceRescrape = false) {
    let query;
    
    if (forceRescrape) {
      // If force rescrape is enabled, get all bikes regardless of scraping status
      query = `
        SELECT 
          bd.keyid,
          bc.make,
          bc.model,
          bc.year,
          bc.variant,
          bd.comprehensive_data->'pageInfo'->>'url' as url,
          bd.comprehensive_data
        FROM bikes_data bd
        JOIN bikes_catalog bc ON bd.keyid = bc.keyid
        WHERE bd.comprehensive_data IS NOT NULL
          AND bd.comprehensive_data->'pageInfo'->>'url' IS NOT NULL
        ORDER BY bd.keyid
        ${limit ? `LIMIT ${limit}` : ''}
      `;
    } else {
      // Only get bikes that haven't been scraped yet
      query = `
        SELECT 
          bd.keyid,
          bc.make,
          bc.model,
          bc.year,
          bc.variant,
          bd.comprehensive_data->'pageInfo'->>'url' as url,
          bd.comprehensive_data
        FROM bikes_data bd
        JOIN bikes_catalog bc ON bd.keyid = bc.keyid
        LEFT JOIN bikes_data_2 bd2 ON bd.keyid = bd2.keyid
        LEFT JOIN bikes b ON bd.keyid = b.keyid
        WHERE bd.comprehensive_data IS NOT NULL
          AND bd.comprehensive_data->'pageInfo'->>'url' IS NOT NULL
          AND bd2.keyid IS NULL  -- Not in bikes_data_2 (not scraped)
          AND b.keyid IS NULL    -- Not in bikes table (not processed)
        ORDER BY bd.keyid
        ${limit ? `LIMIT ${limit}` : ''}
      `;
    }
    
    const result = await this.pool.query(query);
    console.log(chalk.blue(`Found ${result.rows.length} bikes ${forceRescrape ? '(including already scraped)' : 'that need scraping'}`));
    return result.rows;
  }

  /**
   * Create the new bikes table with ideal schema
   */
  async createBikesTable() {
    // Create the main bikes table with clean schema
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS bikes (
        -- Primary identifiers
        id SERIAL PRIMARY KEY,
        keyid INTEGER UNIQUE REFERENCES bikes_catalog(keyid),
        bike_id TEXT UNIQUE, -- e.g., "bulls-cross-lite-evo-2-750-2023"
        
        -- Core identifiers
        makerid TEXT NOT NULL,
        manufacturer TEXT NOT NULL,
        familyid TEXT,
        familyname TEXT,
        modelid TEXT,
        model TEXT NOT NULL,
        year INTEGER NOT NULL,
        variant TEXT,
        
        -- Classification
        category TEXT,
        subcategories TEXT[],
        buildkind TEXT, -- 'bike', 'e-bike', 'frameset'
        gender TEXT,
        
        -- URLs and metadata
        canonical_url TEXT,
        manufacturer_url TEXT,
        manufacturer_product_url TEXT,
        primary_image_url TEXT,
        
        -- Timestamps
        imported_at TIMESTAMP,
        modified_at TIMESTAMP,
        extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Pricing (in cents to avoid decimal issues)
        msrp_cents INTEGER,
        display_price_cents INTEGER,
        display_price_currency TEXT DEFAULT 'USD',
        
        -- Frame details
        frame_material TEXT,
        frame_colors JSONB, -- Array of {key, name} objects
        weight_limit_kg NUMERIC,
        
        -- Suspension
        suspension_type TEXT, -- 'rigid', 'hardtail', 'full'
        front_travel_mm INTEGER,
        rear_travel_mm INTEGER,
        
        -- Electric specs (null for non-ebikes)
        is_ebike BOOLEAN DEFAULT FALSE,
        electric_specs JSONB, -- {motor: {make, model, power_w, torque_nm, type}, battery: {make, model, capacity_wh}, display: {make, model}}
        
        -- Drivetrain
        drivetrain_speeds INTEGER,
        drivetrain_configuration TEXT, -- e.g., "1×12"
        
        -- Wheels
        wheel_size TEXT, -- e.g., "700c", "29", "27.5"
        
        -- Components (structured JSONB)
        components JSONB, -- {fork, rearDerailleur, shifters, cassette, chain, brakes, wheels, tires, etc.}
        
        -- Geometry (structured JSONB)
        geometry JSONB, -- {sizes: [{name, frameSize, stackMm, reachMm, ...}]}
        
        -- Analysis scores
        spec_level NUMERIC(3,2), -- 0.00 to 1.00
        spec_level_components JSONB, -- {frame: 0.8, brakes: 1.0, ...}
        
        -- Media
        images JSONB, -- [{url, width, height, alt, role}]
        
        -- Related data
        family_siblings JSONB, -- [{id, msrp}]
        
        -- Status flags
        is_active BOOLEAN DEFAULT TRUE,
        has_full_geometry BOOLEAN DEFAULT FALSE,
        is_latest_family_year BOOLEAN DEFAULT FALSE,
        
        -- Full raw data for reference
        raw_data JSONB
      );
    `);
    
    // Create indexes for common queries
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bikes_makerid ON bikes(makerid);
      CREATE INDEX IF NOT EXISTS idx_bikes_manufacturer ON bikes(manufacturer);
      CREATE INDEX IF NOT EXISTS idx_bikes_familyid ON bikes(familyid);
      CREATE INDEX IF NOT EXISTS idx_bikes_year ON bikes(year);
      CREATE INDEX IF NOT EXISTS idx_bikes_category ON bikes(category);
      CREATE INDEX IF NOT EXISTS idx_bikes_is_ebike ON bikes(is_ebike);
      CREATE INDEX IF NOT EXISTS idx_bikes_manufacturer_year ON bikes(manufacturer, year);
      CREATE INDEX IF NOT EXISTS idx_bikes_bike_id ON bikes(bike_id);
    `);
    
    console.log(chalk.green('✅ Created bikes table with ideal schema'));
  }

  /**
   * Parse timestamp to ensure it's in proper format for PostgreSQL
   */
  parseTimestamp(timestamp) {
    if (!timestamp) return null;
    
    try {
      // If it's already a valid date string, return it
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (e) {
      // Invalid date
    }
    
    return null;
  }

  /**
   * Transform scraped data into clean bikes table format
   */
  transformToCleanFormat(keyid, bikeData) {
    if (!bikeData || !bikeData.bike) return null;
    
    const bike = bikeData.bike;
    const transformed = {
      keyid,
      bike_id: bike.id || null,
      
      // Core identifiers (handle both camelCase and lowercase)
      makerid: bike.makerId || bike.makerid || bike.manufacturer?.toLowerCase() || null,
      manufacturer: bike.manufacturer || null,
      familyid: bike.familyId || bike.familyid || null,
      familyname: bike.familyName || bike.familyname || bike.family?.familyname || null,
      modelid: bike.modelId || bike.modelid || null,
      model: bike.model || null,
      year: bike.year || null,
      variant: bike.variant || 'Standard',
      
      // Classification (handle both camelCase and lowercase)
      category: bike.category || null,
      subcategories: bike.subcategories || [],
      buildkind: bike.buildKind || bike.buildkind || (bike.isEbike || bike.isebike ? 'e-bike' : 'bike'),
      gender: bike.gender || 'unisex',
      
      // URLs (handle both camelCase and lowercase)
      canonical_url: bike.url || bike.canonicalUrl || bike.canonicalurl || null,
      manufacturer_url: bike.manufacturerUrl || bike.manufacturerurl || null,
      manufacturer_product_url: bike.manufacturerProductUrl || bike.manufacturerproducturl || null,
      primary_image_url: bike.primaryThumbnailUrl || bike.primarythumbnailurl || bike.images?.[0]?.url || null,
      
      // Timestamps (ensure proper format)
      imported_at: this.parseTimestamp(bike.meta?.source?.imported),
      modified_at: this.parseTimestamp(bike.meta?.source?.modified),
      
      // Pricing (handle both camelCase and lowercase)
      msrp_cents: bike.msrp ? bike.msrp * 100 : null,
      display_price_cents: (bike.displayPrice?.amount || bike.displayprice?.amount) ? (bike.displayPrice?.amount || bike.displayprice?.amount) * 100 : null,
      display_price_currency: bike.displayPrice?.currency || bike.displayprice?.currency || 'USD',
      
      // Frame (handle both camelCase and lowercase)
      frame_material: bike.frameMaterial || bike.framematerial || null,
      frame_colors: bike.colors || [],
      weight_limit_kg: bike.weightLimit?.weightKG || bike.weightlimit?.weightkg || null,
      
      // Suspension
      suspension_type: bike.suspension?.configuration || 'rigid',
      front_travel_mm: bike.suspension?.front?.travelmm || null,
      rear_travel_mm: bike.suspension?.rear?.travelmm || null,
      
      // Electric (handle both camelCase and lowercase)
      is_ebike: bike.isEbike || bike.isebike || false,
      electric_specs: null,
      
      // Drivetrain
      drivetrain_speeds: bike.gearing?.rear?.count || null,
      drivetrain_configuration: bike.gearing?.gearing || null,
      
      // Wheels
      wheel_size: bike.wheels?.kinds?.[0] || null,
      
      // Components
      components: bike.components || {},
      
      // Geometry
      geometry: bike.sizes ? { sizes: bike.sizes } : {},
      
      // Analysis
      spec_level: bike.analysis?.speclevel?.value || null,
      spec_level_components: bike.analysis?.speclevel?.explanation || {},
      
      // Media
      images: bike.images || [],
      
      // Related
      family_siblings: bike.family?.siblings || [],
      
      // Status
      is_active: bike.meta?.source?.isactive || false,
      has_full_geometry: bike.hasfullgeometry || false,
      is_latest_family_year: bike.islatestfamilyyear || false,
      
      // Raw data
      raw_data: bikeData
    };
    
    // Process electric specs if e-bike (handle both camelCase and lowercase)
    if ((bike.isEbike || bike.isebike) && (bike.components?.motor || bike.components?.battery)) {
      transformed.electric_specs = {
        motor: null,
        battery: null,
        display: null
      };
      
      if (bike.components?.motor?.description) {
        const motorDesc = bike.components.motor.description;
        // Try different patterns for motor specs
        let motorMatch = motorDesc.match(/(\w+)\s+.*?(\d+)w\s+(\d+)nm/i);
        
        if (!motorMatch) {
          // Try pattern with just Nm (like "Bosch Performance Line CX (Smart System) 25/85Nm")
          motorMatch = motorDesc.match(/(\w+)\s+.*?(\d+)\/(\d+)\s*Nm/i);
          if (motorMatch) {
            transformed.electric_specs.motor = {
              make: motorMatch[1],
              model: motorDesc,
              power_w: null, // No wattage in this format
              torque_nm: parseInt(motorMatch[3]), // Use the higher value
              type: motorDesc.toLowerCase().includes('hub') ? 'hub' : 'mid-drive'
            };
          } else {
            // Fallback - just extract brand and model
            transformed.electric_specs.motor = {
              make: motorDesc.split(' ')[0],
              model: motorDesc,
              power_w: null,
              torque_nm: null,
              type: motorDesc.toLowerCase().includes('hub') ? 'hub' : 'mid-drive'
            };
          }
        } else {
          transformed.electric_specs.motor = {
            make: motorMatch[1],
            model: motorDesc,
            power_w: parseInt(motorMatch[2]),
            torque_nm: parseInt(motorMatch[3]),
            type: motorDesc.toLowerCase().includes('hub') ? 'hub' : 'mid-drive'
          };
        }
      }
      
      if (bike.components?.battery?.description) {
        const batteryDesc = bike.components.battery.description;
        let batteryMatch = batteryDesc.match(/(\d+)\s*wh/i);
        
        if (!batteryMatch) {
          // Try pattern with just number (like "Bosch PowerTube Horizontal 750")
          batteryMatch = batteryDesc.match(/(\d{3,4})$/);
        }
        
        if (batteryMatch) {
          transformed.electric_specs.battery = {
            make: batteryDesc.split(' ')[0],
            model: batteryDesc,
            capacity_wh: parseInt(batteryMatch[1])
          };
        } else {
          // Fallback - just store the description
          transformed.electric_specs.battery = {
            make: batteryDesc.split(' ')[0],
            model: batteryDesc,
            capacity_wh: null
          };
        }
      }
      
      if (bike.components?.display?.description) {
        transformed.electric_specs.display = {
          model: bike.components.display.description
        };
      }
    }
    
    return transformed;
  }

  /**
   * Save scraped data to both tables with transaction support
   */
  async saveScrapedData(keyid, scrapedData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if keyid already exists in bikes_data_2 to prevent overwriting
      const existingResult = await client.query(
        'SELECT keyid, scraped_at FROM bikes_data_2 WHERE keyid = $1',
        [keyid]
      );
      
      if (existingResult.rows.length > 0) {
        console.log(chalk.yellow(`  ⚠️ KeyID ${keyid} already exists in bikes_data_2 (scraped: ${existingResult.rows[0].scraped_at}) - SKIPPING to prevent overwrite`));
        await client.query('ROLLBACK');
        return;
      }
      
      // Check if scraped data has sufficient quality (including makerid)
      const hasValidData = scrapedData.bike && 
                          (scrapedData.bike.makerid || scrapedData.bike.makerId) && 
                          scrapedData.bike.manufacturer && 
                          scrapedData.bike.model;
      
      if (!hasValidData) {
        console.log(chalk.yellow(`  ⚠️ Scraped data missing critical fields (makerid/manufacturer/model) - not saving to bikes_data_2`));
        await client.query('ROLLBACK');
        return;
      }
      
      // Save to bikes_data_2 table (raw extraction data) - only insert, never update
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
      
      console.log(chalk.green(`  ✅ Saved new scraped data to bikes_data_2 for keyid ${keyid}`));
      
      // Transform and save to clean bikes table if we have good data
      if (scrapedData.bike && scrapedData.hasEmbeddedData) {
        const cleanData = this.transformToCleanFormat(keyid, scrapedData);
        
        if (cleanData && cleanData.makerid && cleanData.model && cleanData.year) {
          // Prepare values for PostgreSQL - stringify JSONB fields
          const jsonbFields = ['frame_colors', 'electric_specs', 'components', 'geometry', 
                              'spec_level_components', 'images', 'family_siblings', 'raw_data'];
          
          const fields = Object.keys(cleanData);
          const values = Object.values(cleanData).map((value, index) => {
            const fieldName = fields[index];
            // Convert objects/arrays to JSON strings for JSONB columns
            if (jsonbFields.includes(fieldName) && value !== null && typeof value === 'object') {
              return JSON.stringify(value);
            }
            return value;
          });
          
          const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
          const updateSet = fields.map(f => `${f} = EXCLUDED.${f}`).join(', ');
          
          await client.query(`
            INSERT INTO bikes (${fields.join(', ')})
            VALUES (${placeholders})
            ON CONFLICT (keyid) DO UPDATE SET ${updateSet}
          `, values);
        }
      }
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.log(chalk.red(`  ❌ Transaction failed for keyid ${keyid}: ${error.message}`));
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Main processing function
   */
  async processAll(options = {}) {
    const { limit = null, saveToFile = true, forceRescrape = false } = options;
    
    console.log(chalk.bold('\n🚀 Enhanced Bike Data Scraper v4.5\n'));
    
    // Get bikes to scrape
    const bikes = await this.getBikesToScrape(limit, forceRescrape);
    this.stats.total = bikes.length;
    
    console.log(chalk.blue(`Found ${this.stats.total} bikes to process\n`));
    
    const results = {};
    const errors = [];
    
    for (const bike of bikes) {
      this.stats.processed++;
      const progress = `[${this.stats.processed}/${this.stats.total}]`;
      
      console.log(chalk.bold(`\n${progress} Processing: ${bike.make} ${bike.model} ${bike.year}`));
      console.log(`  Variant: ${bike.variant}`);
      console.log(`  KeyID: ${bike.keyid}`);
      
      if (!bike.url) {
        console.log(chalk.yellow('  ⚠️ No URL found, skipping...'));
        continue;
      }
      
      try {
        const scrapedData = await this.extractBikeData(bike.url);
        
        // Save to database
        await this.saveScrapedData(bike.keyid, scrapedData);
        
        // Store in results
        results[bike.keyid] = {
          make: bike.make,
          model: bike.model,
          year: bike.year,
          variant: bike.variant,
          ...scrapedData
        };
        
        this.stats.successful++;
        
        // Log what we found
        if (scrapedData.hasEmbeddedData && scrapedData.bike) {
          console.log(chalk.green('  ✅ Found complete embedded bike data'));
          if (scrapedData.bike.makerid) {
            console.log(`  📊 MakerID: ${scrapedData.bike.makerid}`);
          }
          if (scrapedData.bike.familyid) {
            console.log(`  📊 FamilyID: ${scrapedData.bike.familyid}`);
          }
        } else {
          console.log(chalk.yellow('  ⚠️ No embedded data found, extracted from HTML'));
        }
        
      } catch (error) {
        this.stats.failed++;
        console.log(chalk.red(`  ❌ Error: ${error.message}`));
        
        errors.push({
          keyid: bike.keyid,
          make: bike.make,
          model: bike.model,
          year: bike.year,
          url: bike.url,
          error: error.message
        });
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Save results to file if requested
    if (saveToFile) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const resultsPath = path.join(__dirname, 'downloads', `scraped_data_${timestamp}.json`);
      const errorsPath = path.join(__dirname, 'downloads', `scrape_errors_${timestamp}.json`);
      
      await fs.mkdir(path.join(__dirname, 'downloads'), { recursive: true });
      
      await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
      await fs.writeFile(errorsPath, JSON.stringify(errors, null, 2));
      
      console.log(chalk.green(`\n✅ Results saved to: ${resultsPath}`));
      console.log(chalk.green(`✅ Errors saved to: ${errorsPath}`));
    }
    
    // Print summary
    console.log(chalk.bold('\n📊 Scraping Summary:'));
    console.log(`  Total processed: ${this.stats.processed}`);
    console.log(`  Successful: ${chalk.green(this.stats.successful)}`);
    console.log(`  Failed: ${chalk.red(this.stats.failed)}`);
    console.log(`  Success rate: ${((this.stats.successful / this.stats.processed) * 100).toFixed(1)}%`);
  }

  async cleanup() {
    await this.pool.end();
    if (this.stagehand) {
      await this.stagehand.close();
    }
  }
}

// Main execution
async function main() {
  const scraper = new EnhancedBikeScraper();
  
  try {
    await scraper.initialize();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const limit = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
    const noSave = args.includes('--no-save');
    const forceRescrape = args.includes('--force-rescrape');
    
    if (args.includes('--help')) {
      console.log(`
${chalk.bold('Enhanced Bike Scraper v4.5')}

Usage: node 04.5_enhanced_scraper_fixed.js [options]

Options:
  --limit=N         Process only N bikes (useful for testing)
  --no-save         Don't save results to files
  --force-rescrape  Re-scrape all bikes, including already scraped ones
  --help            Show this help message

This scraper extracts ALL client-side data from 99spokes bike pages,
including the embedded JSON that contains complete bike specifications.
By default, it will skip bikes that have already been scraped.
`);
      process.exit(0);
    }
    
    await scraper.processAll({
      limit: limit ? parseInt(limit) : null,
      saveToFile: !noSave,
      forceRescrape: forceRescrape
    });
    
  } catch (error) {
    console.error(chalk.red('\n❌ Fatal error:'), error.message);
    console.error(error.stack);
  } finally {
    await scraper.cleanup();
  }
}

// Run the scraper
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default EnhancedBikeScraper;