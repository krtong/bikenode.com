#!/usr/bin/env node
import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../scrapers/.env') });

// Import the enhanced cleaner
import EnhancedDataCleaner from '../scrapers/05_enhanced_data_cleaner.js';

const { Client } = pg;

async function debugExtraction() {
  const cleaner = new EnhancedDataCleaner();
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'bikenode',
    user: 'postgres',
    password: 'postgres'
  });
  
  try {
    await client.connect();
    await cleaner.initialize();
    
    console.log('🔍 Debug extraction for KeyID 1\n');
    
    // Get bike info
    const bikeInfo = await client.query(`
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
      WHERE bc.keyid = 1
    `);
    
    if (bikeInfo.rows.length === 0) {
      console.log('❌ No bike found with keyid 1');
      return;
    }
    
    const bike = bikeInfo.rows[0];
    console.log(`📚 Bike: ${bike.year} ${bike.make} ${bike.model}`);
    console.log(`🔗 URL: ${bike.url}\n`);
    
    // Test extraction
    const result = await cleaner.extractBikeData(bike);
    
    console.log('📊 Extraction Result:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Source: ${result.source}`);
    
    if (result.success && result.data) {
      console.log('\n📋 Extracted Data:');
      console.log(`  ID: ${result.data.id || 'NOT FOUND'}`);
      console.log(`  Manufacturer: ${result.data.manufacturer || 'NOT FOUND'}`);
      console.log(`  Make: ${result.data.make || 'NOT FOUND'}`);
      console.log(`  MakerId: ${result.data.makerId || 'NOT FOUND'}`);
      console.log(`  Model: ${result.data.model || 'NOT FOUND'}`);
      console.log(`  Year: ${result.data.year || 'NOT FOUND'}`);
      console.log(`  FamilyId: ${result.data.familyId || 'NOT FOUND'}`);
      console.log(`  Category: ${result.data.category || 'NOT FOUND'}`);
      console.log(`  IsEbike: ${result.data.isEbike || result.data.isEbike || 'NOT FOUND'}`);
      
      // Show all available keys
      console.log('\n🔑 All available keys in extracted data:');
      console.log(Object.keys(result.data).join(', '));
      
      // Save to file for inspection
      const fs = await import('fs/promises');
      await fs.writeFile(
        path.join(__dirname, 'debug_extracted_data.json'),
        JSON.stringify(result.data, null, 2)
      );
      console.log('\n💾 Full extracted data saved to: debug_extracted_data.json');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
    await cleaner.cleanup();
  }
}

debugExtraction();