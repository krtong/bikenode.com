#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ElectrifiedBikeScraper from './electrified_bike_scraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database operations for electrified bikes
class ElectrifiedBikeManager {
  constructor() {
    this.dataFile = path.join(__dirname, 'electrified_bikes_database.json');
    this.database = {
      brands: [],
      models: [],
      lastUpdated: null
    };
  }

  // Load existing database
  async loadDatabase() {
    try {
      const data = await fs.readFile(this.dataFile, 'utf-8');
      this.database = JSON.parse(data);
      console.log('📂 Loaded existing database');
      console.log(`  Brands: ${this.database.brands.length}`);
      console.log(`  Models: ${this.database.models.length}`);
    } catch (error) {
      console.log('📂 No existing database found, starting fresh');
    }
  }

  // Save database
  async saveDatabase() {
    await fs.writeFile(this.dataFile, JSON.stringify(this.database, null, 2));
    console.log('💾 Database saved');
  }

  // Import scraped data
  async importScrapedData(scrapedData) {
    console.log('\n📥 Importing scraped data...');

    for (const brandName in scrapedData.brands) {
      const brandData = scrapedData.brands[brandName];
      
      // Find or create brand
      let brand = this.database.brands.find(b => b.name === brandName);
      if (!brand) {
        brand = {
          id: this.database.brands.length + 1,
          name: brandName,
          category: 'electrified',
          website: this.findWebsite(brandName),
          founded: this.findFoundedYear(brandName),
          headquarters: this.findHeadquarters(brandName)
        };
        this.database.brands.push(brand);
        console.log(`  ✅ Added brand: ${brandName}`);
      }

      // Import models
      for (const model of brandData.models) {
        const existingModel = this.database.models.find(m => 
          m.brand === brandName && 
          m.name === model.name && 
          m.year === model.year
        );

        if (!existingModel) {
          const modelData = {
            id: this.database.models.length + 1,
            brand: brandName,
            brandId: brand.id,
            name: model.name,
            year: model.year,
            fullName: model.fullName,
            category: this.categorizeModel(model),
            specs: model.specs || {},
            price: model.price,
            url: model.url,
            importedAt: new Date().toISOString()
          };

          this.database.models.push(modelData);
        }
      }
    }

    this.database.lastUpdated = new Date().toISOString();
    console.log(`\n✅ Import complete!`);
    console.log(`  Total brands: ${this.database.brands.length}`);
    console.log(`  Total models: ${this.database.models.length}`);
  }

  // Categorize model based on specs
  categorizeModel(model) {
    const specs = model.specs || {};
    const name = model.name.toLowerCase();

    // Check motor power
    const motorPower = parseInt(specs.motor) || 0;

    if (motorPower >= 5000) return 'high-performance';
    if (motorPower >= 3000) return 'performance';
    if (motorPower >= 1500) return 'mid-power';
    if (motorPower >= 750) return 'legal-ebike';
    
    // Check by name patterns
    if (name.includes('x160') || name.includes('x260')) return 'youth';
    if (name.includes('storm') || name.includes('xxx')) return 'high-performance';
    if (name.includes('sting')) return 'performance';
    
    return 'standard';
  }

  // Find website for brand (could be expanded with actual data)
  findWebsite(brandName) {
    const websites = {
      'Sur-Ron': 'https://sur-ronusa.com',
      'Talaria': 'https://talaria.bike',
      'Segway': 'https://powersports.segway.com',
      'Zero Motorcycles': 'https://www.zeromotorcycles.com',
      'Cake': 'https://ridecake.com',
      'Stealth Electric Bikes': 'https://www.stealthelectricbikes.com',
      'Onyx Motorbikes': 'https://onyxmotorbikes.com',
      'Monday Motorbikes': 'https://mondaymotorbikes.com',
      'Super73': 'https://super73.com',
      'Ariel Rider': 'https://arielrider.com'
    };
    return websites[brandName] || null;
  }

  // Find founded year (could be expanded with actual data)
  findFoundedYear(brandName) {
    const foundedYears = {
      'Sur-Ron': 2014,
      'Talaria': 2019,
      'Segway': 1999,
      'Zero Motorcycles': 2006,
      'Cake': 2016,
      'Stealth Electric Bikes': 2008,
      'Onyx Motorbikes': 2015,
      'Monday Motorbikes': 2014,
      'Super73': 2016,
      'Ariel Rider': 2019
    };
    return foundedYears[brandName] || null;
  }

  // Find headquarters (could be expanded with actual data)
  findHeadquarters(brandName) {
    const headquarters = {
      'Sur-Ron': 'China',
      'Talaria': 'China',
      'Segway': 'Bedford, NH, USA',
      'Zero Motorcycles': 'Santa Cruz, CA, USA',
      'Cake': 'Stockholm, Sweden',
      'Stealth Electric Bikes': 'Melbourne, Australia',
      'Onyx Motorbikes': 'Los Angeles, CA, USA',
      'Monday Motorbikes': 'San Francisco, CA, USA',
      'Super73': 'Irvine, CA, USA',
      'Ariel Rider': 'Seattle, WA, USA'
    };
    return headquarters[brandName] || null;
  }

  // Export to CSV
  async exportToCSV() {
    const csvFile = path.join(__dirname, 'electrified_bikes_export.csv');
    
    // Create CSV header
    const headers = [
      'Brand', 'Model', 'Year', 'Category', 'Motor', 'Battery', 
      'Top Speed', 'Range', 'Weight', 'Price', 'URL'
    ];
    
    let csv = headers.join(',') + '\n';

    // Add data rows
    for (const model of this.database.models) {
      const row = [
        model.brand,
        model.name,
        model.year,
        model.category,
        model.specs.motor || '',
        model.specs.battery || '',
        model.specs.topSpeed || '',
        model.specs.range || '',
        model.specs.weight || '',
        model.price || '',
        model.url || ''
      ];
      
      // Escape commas in values
      const escapedRow = row.map(val => {
        const str = String(val);
        return str.includes(',') ? `"${str}"` : str;
      });
      
      csv += escapedRow.join(',') + '\n';
    }

    await fs.writeFile(csvFile, csv);
    console.log(`\n📄 Exported to CSV: ${csvFile}`);
  }

  // Generate statistics
  generateStats() {
    console.log('\n📊 Database Statistics:');
    
    // Brand stats
    console.log('\n🏢 Brands:');
    const brandCounts = {};
    this.database.models.forEach(model => {
      brandCounts[model.brand] = (brandCounts[model.brand] || 0) + 1;
    });
    
    Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([brand, count]) => {
        console.log(`  ${brand}: ${count} models`);
      });

    // Category stats
    console.log('\n📁 Categories:');
    const categoryCounts = {};
    this.database.models.forEach(model => {
      categoryCounts[model.category] = (categoryCounts[model.category] || 0) + 1;
    });
    
    Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count} models`);
      });

    // Year stats
    console.log('\n📅 Years:');
    const yearCounts = {};
    this.database.models.forEach(model => {
      yearCounts[model.year] = (yearCounts[model.year] || 0) + 1;
    });
    
    Object.entries(yearCounts)
      .sort((a, b) => a[0] - b[0])
      .forEach(([year, count]) => {
        console.log(`  ${year}: ${count} models`);
      });

    // Spec completeness
    console.log('\n✅ Spec Completeness:');
    const specFields = ['motor', 'battery', 'topSpeed', 'range', 'weight', 'price'];
    const specCounts = {};
    
    specFields.forEach(field => {
      specCounts[field] = this.database.models.filter(m => 
        m.specs[field] || (field === 'price' && m.price)
      ).length;
    });

    specFields.forEach(field => {
      const percentage = ((specCounts[field] / this.database.models.length) * 100).toFixed(1);
      console.log(`  ${field}: ${specCounts[field]}/${this.database.models.length} (${percentage}%)`);
    });
  }

  // Search functionality
  search(query) {
    const searchTerm = query.toLowerCase();
    const results = this.database.models.filter(model => 
      model.fullName.toLowerCase().includes(searchTerm) ||
      model.brand.toLowerCase().includes(searchTerm) ||
      model.name.toLowerCase().includes(searchTerm)
    );

    console.log(`\n🔍 Search results for "${query}":`);
    results.forEach(model => {
      console.log(`  ${model.fullName}`);
      if (model.specs.motor) console.log(`    Motor: ${model.specs.motor}`);
      if (model.specs.topSpeed) console.log(`    Top Speed: ${model.specs.topSpeed}`);
      if (model.price) console.log(`    Price: ${model.price}`);
    });
    
    return results;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const manager = new ElectrifiedBikeManager();

  await manager.loadDatabase();

  switch (command) {
    case 'scrape':
      console.log('🚀 Starting scraper...');
      const scraper = new ElectrifiedBikeScraper();
      try {
        await scraper.initialize();
        const results = await scraper.scrapeAll();
        await scraper.saveResults();
        scraper.printSummary();
        
        // Import to database
        await manager.importScrapedData(results);
        await manager.saveDatabase();
      } finally {
        await scraper.close();
      }
      break;

    case 'stats':
      manager.generateStats();
      break;

    case 'export':
      await manager.exportToCSV();
      break;

    case 'search':
      const query = args.slice(1).join(' ');
      if (!query) {
        console.log('❌ Please provide a search query');
        break;
      }
      manager.search(query);
      break;

    default:
      console.log(`
Electrified Bike Manager

Usage:
  node manage_electrified_bikes.js <command> [options]

Commands:
  scrape    - Run the web scraper and import data
  stats     - Show database statistics
  export    - Export database to CSV
  search    - Search for bikes (e.g., search sur-ron)

Examples:
  node manage_electrified_bikes.js scrape
  node manage_electrified_bikes.js stats
  node manage_electrified_bikes.js export
  node manage_electrified_bikes.js search talaria sting
      `);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ElectrifiedBikeManager;