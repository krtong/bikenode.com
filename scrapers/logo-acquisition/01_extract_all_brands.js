#!/usr/bin/env node
/**
 * Brand Extraction System
 * 
 * This script extracts all bicycle and motorcycle brands from various data sources
 * to create a comprehensive list for logo acquisition.
 * 
 * Data Sources:
 * - scrapers/maker_ids.js (bicycle brands)
 * - database/data/motorcycle_brands.csv (motorcycle brands)
 * - existing database tables (bikes_catalog, motorcycles)
 * - various scraper files and brand lists
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

class BrandExtractor {
  constructor() {
    this.bicycleBrands = new Set();
    this.motorcycleBrands = new Set();
    this.allBrands = new Map(); // brand name -> { type: 'bicycle'|'motorcycle'|'both', sources: [] }
  }

  /**
   * Load bicycle brands from maker_ids.js
   */
  async loadBicycleBrandsFromMakerIds() {
    try {
      console.log('📚 Loading bicycle brands from maker_ids.js...');
      
      // Import the maker_ids module
      const makerIdsPath = path.resolve(__dirname, '../scrapers/maker_ids.js');
      const { default: makerIds } = await import(makerIdsPath);
      
      for (const [id, name] of Object.entries(makerIds)) {
        if (name && name.trim()) {
          const cleanName = name.trim();
          this.bicycleBrands.add(cleanName);
          this.addBrand(cleanName, 'bicycle', 'maker_ids.js');
        }
      }
      
      console.log(`   ✅ Found ${this.bicycleBrands.size} bicycle brands`);
    } catch (error) {
      console.error('❌ Error loading bicycle brands from maker_ids.js:', error.message);
    }
  }

  /**
   * Load motorcycle brands from CSV file
   */
  async loadMotorcycleBrandsFromCSV() {
    try {
      console.log('🏍️  Loading motorcycle brands from CSV...');
      
      const csvPath = path.resolve(__dirname, '../database/data/motorcycle_brands.csv');
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',');
      const manufacturerIndex = headers.findIndex(h => h.toLowerCase().includes('manufacturer'));
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const columns = line.split(',');
        if (columns[manufacturerIndex]) {
          const brand = columns[manufacturerIndex].trim();
          if (brand && brand !== 'Manufacturer') {
            this.motorcycleBrands.add(brand);
            this.addBrand(brand, 'motorcycle', 'motorcycle_brands.csv');
          }
        }
      }
      
      console.log(`   ✅ Found ${this.motorcycleBrands.size} motorcycle brands`);
    } catch (error) {
      console.error('❌ Error loading motorcycle brands from CSV:', error.message);
    }
  }

  /**
   * Load brands from database tables
   */
  async loadBrandsFromDatabase() {
    try {
      console.log('🗄️  Loading brands from database...');
      
      // Load bicycle brands from bikes_catalog table
      try {
        const bikeResult = await pool.query('SELECT DISTINCT make FROM bikes_catalog WHERE make IS NOT NULL AND make != \'\'');
        for (const row of bikeResult.rows) {
          const brand = row.make.trim();
          if (brand) {
            this.bicycleBrands.add(brand);
            this.addBrand(brand, 'bicycle', 'bikes_catalog table');
          }
        }
        console.log(`   ✅ Found ${bikeResult.rows.length} bicycle brands from database`);
      } catch (error) {
        console.log(`   ⚠️  Could not load from bikes_catalog: ${error.message}`);
      }

      // Load motorcycle brands from motorcycles table
      try {
        const motoResult = await pool.query('SELECT DISTINCT make FROM motorcycles WHERE make IS NOT NULL AND make != \'\'');
        for (const row of motoResult.rows) {
          const brand = row.make.trim();
          if (brand) {
            this.motorcycleBrands.add(brand);
            this.addBrand(brand, 'motorcycle', 'motorcycles table');
          }
        }
        console.log(`   ✅ Found ${motoResult.rows.length} motorcycle brands from database`);
      } catch (error) {
        console.log(`   ⚠️  Could not load from motorcycles: ${error.message}`);
      }
      
    } catch (error) {
      console.error('❌ Error loading brands from database:', error.message);
    }
  }

  /**
   * Load additional brands from text files
   */
  async loadBrandsFromTextFiles() {
    try {
      console.log('📄 Loading additional brands from text files...');
      
      const textFiles = [
        '../deprecated/scrapers/bicycle_brands.txt',
        '../deprecated/scrapers/out/valid_makers.txt',
        '../deprecated/scrapers/maker_ids.txt'
      ];

      for (const filePath of textFiles) {
        try {
          const fullPath = path.resolve(__dirname, filePath);
          const content = await fs.readFile(fullPath, 'utf-8');
          const lines = content.split('\n');
          
          let count = 0;
          for (const line of lines) {
            const brand = line.trim();
            if (brand && !brand.startsWith('#') && !brand.startsWith('//')) {
              // Try to determine if it's a bicycle brand based on file location
              const isBicycle = filePath.includes('bicycle') || filePath.includes('maker');
              if (isBicycle) {
                this.bicycleBrands.add(brand);
                this.addBrand(brand, 'bicycle', path.basename(filePath));
              } else {
                // For generic files, add as both types
                this.addBrand(brand, 'both', path.basename(filePath));
              }
              count++;
            }
          }
          console.log(`   ✅ Found ${count} brands from ${path.basename(filePath)}`);
        } catch (error) {
          console.log(`   ⚠️  Could not read ${filePath}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('❌ Error loading brands from text files:', error.message);
    }
  }

  /**
   * Extract brands from scraper code files
   */
  async loadBrandsFromScraperCode() {
    try {
      console.log('🔍 Extracting brands from scraper code...');
      
      const scraperFiles = [
        '../browser-extension/llmParser.js',
        '../scrapers/02_year_scraper.js',
        '../deprecated/scrapers/extract_bike_families.js'
      ];

      for (const filePath of scraperFiles) {
        try {
          const fullPath = path.resolve(__dirname, filePath);
          const content = await fs.readFile(fullPath, 'utf-8');
          
          // Look for brand arrays in the code
          const brandArrayMatches = content.match(/const\s+\w*[Bb]rands?\w*\s*=\s*\[([\s\S]*?)\]/g);
          if (brandArrayMatches) {
            for (const match of brandArrayMatches) {
              const brands = this.extractBrandsFromArray(match);
              for (const brand of brands) {
                this.bicycleBrands.add(brand);
                this.addBrand(brand, 'bicycle', path.basename(filePath));
              }
            }
          }
          
          // Look for quoted brand names
          const quotedBrands = content.match(/'([A-Z][a-zA-Z\s&-]+)'/g);
          if (quotedBrands) {
            for (const match of quotedBrands) {
              const brand = match.slice(1, -1).trim();
              if (brand.length > 2 && /^[A-Z]/.test(brand)) {
                this.bicycleBrands.add(brand);
                this.addBrand(brand, 'bicycle', path.basename(filePath));
              }
            }
          }
          
          console.log(`   ✅ Extracted brands from ${path.basename(filePath)}`);
        } catch (error) {
          console.log(`   ⚠️  Could not read ${filePath}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('❌ Error extracting brands from scraper code:', error.message);
    }
  }

  /**
   * Extract brand names from JavaScript array strings
   */
  extractBrandsFromArray(arrayString) {
    const brands = [];
    const matches = arrayString.match(/"([^"]+)"/g);
    if (matches) {
      for (const match of matches) {
        const brand = match.slice(1, -1).trim();
        if (brand && brand.length > 1) {
          brands.push(brand);
        }
      }
    }
    return brands;
  }

  /**
   * Add a brand to the consolidated list
   */
  addBrand(name, type, source) {
    const cleanName = this.cleanBrandName(name);
    if (!cleanName) return;
    
    if (!this.allBrands.has(cleanName)) {
      this.allBrands.set(cleanName, {
        type: type,
        sources: [source],
        originalNames: new Set([name])
      });
    } else {
      const existing = this.allBrands.get(cleanName);
      existing.sources.push(source);
      existing.originalNames.add(name);
      
      // Update type if it's becoming both
      if (existing.type !== type && type !== 'both' && existing.type !== 'both') {
        existing.type = 'both';
      }
    }
  }

  /**
   * Clean and normalize brand names
   */
  cleanBrandName(name) {
    if (!name || typeof name !== 'string') return null;
    
    // Remove extra whitespace and trim
    let cleaned = name.trim().replace(/\s+/g, ' ');
    
    // Skip if too short or invalid
    if (cleaned.length < 2) return null;
    if (/^\d+$/.test(cleaned)) return null; // Skip pure numbers
    if (cleaned.toLowerCase() === 'unknown') return null;
    if (cleaned.toLowerCase() === 'n/a') return null;
    
    // Standardize common variations
    const standardizations = {
      'bmw motorrad': 'BMW',
      'harley davidson': 'Harley-Davidson',
      'harley-davidson': 'Harley-Davidson',
      'ktm': 'KTM',
      'yamaha motor': 'Yamaha',
      'honda motor': 'Honda',
      'suzuki motor': 'Suzuki',
      'kawasaki motor': 'Kawasaki'
    };
    
    const lower = cleaned.toLowerCase();
    for (const [variant, standard] of Object.entries(standardizations)) {
      if (lower === variant) {
        return standard;
      }
    }
    
    return cleaned;
  }

  /**
   * Generate comprehensive brand lists
   */
  async generateBrandLists() {
    console.log('\n📊 Generating comprehensive brand lists...');
    
    // Sort brands alphabetically
    const sortedBrands = Array.from(this.allBrands.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    // Create output directory
    const outputDir = path.resolve(__dirname, 'output');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate all brands list
    const allBrandsList = sortedBrands.map(([name, data]) => ({
      name,
      type: data.type,
      sources: [...new Set(data.sources)], // Remove duplicates
      originalNames: Array.from(data.originalNames)
    }));
    
    await fs.writeFile(
      path.join(outputDir, 'all_brands.json'),
      JSON.stringify(allBrandsList, null, 2)
    );
    
    // Generate separate lists by type
    const bicycleBrandsList = allBrandsList.filter(b => b.type === 'bicycle' || b.type === 'both');
    const motorcycleBrandsList = allBrandsList.filter(b => b.type === 'motorcycle' || b.type === 'both');
    
    await fs.writeFile(
      path.join(outputDir, 'bicycle_brands.json'),
      JSON.stringify(bicycleBrandsList, null, 2)
    );
    
    await fs.writeFile(
      path.join(outputDir, 'motorcycle_brands.json'),
      JSON.stringify(motorcycleBrandsList, null, 2)
    );
    
    // Generate simple text lists for logo acquisition
    const bicycleNames = bicycleBrandsList.map(b => b.name).sort();
    const motorcycleNames = motorcycleBrandsList.map(b => b.name).sort();
    
    await fs.writeFile(
      path.join(outputDir, 'bicycle_brands_for_logos.txt'),
      bicycleNames.join('\n')
    );
    
    await fs.writeFile(
      path.join(outputDir, 'motorcycle_brands_for_logos.txt'),
      motorcycleNames.join('\n')
    );
    
    // Generate summary report
    const summary = {
      totalBrands: allBrandsList.length,
      bicycleBrands: bicycleBrandsList.length,
      motorcycleBrands: motorcycleBrandsList.length,
      bothTypes: allBrandsList.filter(b => b.type === 'both').length,
      generatedAt: new Date().toISOString(),
      sources: [...new Set(allBrandsList.flatMap(b => b.sources))].sort()
    };
    
    await fs.writeFile(
      path.join(outputDir, 'extraction_summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log(`\n✅ Brand extraction complete!`);
    console.log(`   📁 Output directory: ${outputDir}`);
    console.log(`   🚲 Bicycle brands: ${bicycleBrandsList.length}`);
    console.log(`   🏍️  Motorcycle brands: ${motorcycleBrandsList.length}`);
    console.log(`   📊 Total unique brands: ${allBrandsList.length}`);
    console.log(`   🔄 Brands in both categories: ${summary.bothTypes}`);
    
    return summary;
  }

  /**
   * Run the complete brand extraction process
   */
  async run() {
    console.log('🚀 Starting comprehensive brand extraction...\n');
    
    try {
      await this.loadBicycleBrandsFromMakerIds();
      await this.loadMotorcycleBrandsFromCSV();
      await this.loadBrandsFromDatabase();
      await this.loadBrandsFromTextFiles();
      await this.loadBrandsFromScraperCode();
      
      const summary = await this.generateBrandLists();
      
      console.log('\n🎉 Brand extraction completed successfully!');
      return summary;
      
    } catch (error) {
      console.error('💥 Error during brand extraction:', error);
      throw error;
    } finally {
      await pool.end();
    }
  }
}

// Run the brand extraction if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const extractor = new BrandExtractor();
  extractor.run().catch(console.error);
}

export default BrandExtractor;
