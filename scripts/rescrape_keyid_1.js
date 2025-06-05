#!/usr/bin/env node
import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../scrapers/.env') });

// Import the scraper
import EnhancedBikeScraper from '../scrapers/04.5_enhanced_scraper_fixed.js';

const { Client } = pg;

async function rescrapeKeyId1() {
  const scraper = new EnhancedBikeScraper();
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'bikenode',
    user: 'postgres',
    password: 'postgres'
  });
  
  try {
    await client.connect();
    await scraper.initialize();
    
    console.log('🔄 Re-scraping KeyID 1\n');
    
    // Get bike info
    const bikeInfo = await client.query(`
      SELECT bc.*, bd.comprehensive_data->'pageInfo'->>'url' as url
      FROM bikes_catalog bc
      JOIN bikes_data bd ON bc.keyid = bd.keyid
      WHERE bc.keyid = 1
    `);
    
    if (bikeInfo.rows.length === 0) {
      console.log('❌ No bike found with keyid 1');
      return;
    }
    
    const bike = bikeInfo.rows[0];
    console.log(`📚 Bike: ${bike.year} ${bike.make} ${bike.model}`);
    console.log(`🔗 URL: ${bike.url}\n`);
    
    // Extract data
    const scrapedData = await scraper.extractBikeData(bike.url);
    
    // Save to database
    await scraper.saveScrapedData(bike.keyid, scrapedData);
    console.log('\n✅ Data saved to database');
    
    // Now check what was saved
    console.log('\n📊 Verifying saved data:');
    
    const savedData = await client.query(`
      SELECT * FROM bikes WHERE keyid = 1
    `);
    
    if (savedData.rows.length > 0) {
      const saved = savedData.rows[0];
      
      console.log('\n✅ Fixed fields:');
      console.log(`  makerid: ${saved.makerid} (was null)`);
      console.log(`  familyid: ${saved.familyid} (was null)`);
      console.log(`  familyname: ${saved.familyname} (was null)`);
      console.log(`  modelid: ${saved.modelid} (was null)`);
      console.log(`  is_ebike: ${saved.is_ebike} (was false, should be true)`);
      console.log(`  buildkind: ${saved.buildkind} (was 'bike', should be 'e-bike')`);
      console.log(`  manufacturer_url: ${saved.manufacturer_url} (was null)`);
      console.log(`  display_price_cents: ${saved.display_price_cents} (was null)`);
      console.log(`  weight_limit_kg: ${saved.weight_limit_kg} (was null)`);
      
      console.log('\n⚡ Electric specs:');
      if (saved.electric_specs) {
        console.log('  Motor:', saved.electric_specs.motor);
        console.log('  Battery:', saved.electric_specs.battery);
        console.log('  Display:', saved.electric_specs.display);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
    await scraper.cleanup();
  }
}

rescrapeKeyId1();