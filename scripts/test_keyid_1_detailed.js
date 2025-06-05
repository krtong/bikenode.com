#!/usr/bin/env node
import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../scrapers/.env') });

const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
});

async function analyzeKeyId1() {
  try {
    await client.connect();
    console.log('\n🔍 Analyzing data for KeyID 1\n');
    
    // Get basic info
    const catalogInfo = await client.query(`
      SELECT * FROM bikes_catalog WHERE keyid = 1
    `);
    
    if (catalogInfo.rows.length === 0) {
      console.log('❌ No record found for keyid 1');
      return;
    }
    
    const catalog = catalogInfo.rows[0];
    console.log('📚 Catalog Info:');
    console.log(`  Make: ${catalog.make}`);
    console.log(`  Model: ${catalog.model}`);
    console.log(`  Year: ${catalog.year}`);
    console.log(`  Variant: ${catalog.variant}`);
    
    // Check bikes_data_2 (raw extraction)
    console.log('\n📦 Raw Extraction Data (bikes_data_2):');
    const rawData = await client.query(`
      SELECT * FROM bikes_data_2 WHERE keyid = 1
    `);
    
    if (rawData.rows.length > 0) {
      const raw = rawData.rows[0];
      console.log(`  URL: ${raw.url}`);
      console.log(`  Has embedded data: ${raw.has_embedded_data}`);
      console.log(`  Scraped at: ${raw.scraped_at}`);
      
      // Check extracted_data structure
      if (raw.extracted_data) {
        console.log('\n  📊 Extracted Data Structure:');
        const extracted = raw.extracted_data;
        console.log(`    ID: ${extracted.id || 'N/A'}`);
        console.log(`    Manufacturer: ${extracted.manufacturer || 'N/A'}`);
        console.log(`    Model: ${extracted.model || 'N/A'}`);
        console.log(`    Year: ${extracted.year || 'N/A'}`);
        console.log(`    Category: ${extracted.category || 'N/A'}`);
        console.log(`    Is E-bike: ${extracted.isebike || false}`);
        console.log(`    Has components: ${!!extracted.components}`);
        console.log(`    Has geometry: ${!!extracted.sizes}`);
        console.log(`    Has images: ${extracted.images ? extracted.images.length : 0}`);
      }
    } else {
      console.log('  ❌ No raw extraction data found');
    }
    
    // Check bikes table (cleaned data)
    console.log('\n✨ Cleaned Data (bikes table):');
    const cleanData = await client.query(`
      SELECT * FROM bikes WHERE keyid = 1
    `);
    
    if (cleanData.rows.length > 0) {
      const bike = cleanData.rows[0];
      
      console.log('\n  🆔 Identifiers:');
      console.log(`    bike_id: ${bike.bike_id}`);
      console.log(`    makerid: ${bike.makerid}`);
      console.log(`    manufacturer: ${bike.manufacturer}`);
      console.log(`    familyid: ${bike.familyid || 'NULL'}`);
      console.log(`    familyname: ${bike.familyname || 'NULL'}`);
      console.log(`    modelid: ${bike.modelid || 'NULL'}`);
      console.log(`    model: ${bike.model}`);
      console.log(`    year: ${bike.year}`);
      console.log(`    variant: ${bike.variant}`);
      
      console.log('\n  📋 Classification:');
      console.log(`    category: ${bike.category || 'NULL'}`);
      console.log(`    subcategories: ${bike.subcategories || '[]'}`);
      console.log(`    buildkind: ${bike.buildkind}`);
      console.log(`    gender: ${bike.gender || 'NULL'}`);
      
      console.log('\n  🔗 URLs:');
      console.log(`    canonical_url: ${bike.canonical_url || 'NULL'}`);
      console.log(`    manufacturer_url: ${bike.manufacturer_url || 'NULL'}`);
      console.log(`    primary_image_url: ${bike.primary_image_url || 'NULL'}`);
      
      console.log('\n  💰 Pricing:');
      console.log(`    msrp_cents: ${bike.msrp_cents || 'NULL'}`);
      console.log(`    display_price_cents: ${bike.display_price_cents || 'NULL'}`);
      console.log(`    display_price_currency: ${bike.display_price_currency}`);
      
      console.log('\n  🚲 Frame & Suspension:');
      console.log(`    frame_material: ${bike.frame_material || 'NULL'}`);
      console.log(`    frame_colors: ${JSON.stringify(bike.frame_colors) || '[]'}`);
      console.log(`    suspension_type: ${bike.suspension_type}`);
      console.log(`    front_travel_mm: ${bike.front_travel_mm || 'NULL'}`);
      console.log(`    rear_travel_mm: ${bike.rear_travel_mm || 'NULL'}`);
      
      console.log('\n  ⚡ Electric:');
      console.log(`    is_ebike: ${bike.is_ebike}`);
      console.log(`    electric_specs: ${JSON.stringify(bike.electric_specs) || 'NULL'}`);
      
      console.log('\n  ⚙️ Drivetrain & Wheels:');
      console.log(`    drivetrain_speeds: ${bike.drivetrain_speeds || 'NULL'}`);
      console.log(`    drivetrain_configuration: ${bike.drivetrain_configuration || 'NULL'}`);
      console.log(`    wheel_size: ${bike.wheel_size || 'NULL'}`);
      
      console.log('\n  🔧 Components:');
      if (bike.components) {
        const compKeys = Object.keys(bike.components);
        console.log(`    Total component categories: ${compKeys.length}`);
        compKeys.slice(0, 5).forEach(key => {
          console.log(`    - ${key}: ${JSON.stringify(bike.components[key]).substring(0, 60)}...`);
        });
      }
      
      console.log('\n  📐 Geometry:');
      if (bike.geometry && bike.geometry.sizes) {
        console.log(`    Total sizes: ${bike.geometry.sizes.length}`);
        if (bike.geometry.sizes[0]) {
          const firstSize = bike.geometry.sizes[0];
          console.log(`    Sample size: ${firstSize.name || firstSize.frameSize}`);
          console.log(`    Stack: ${firstSize.stackMm || firstSize.stack || 'N/A'}`);
          console.log(`    Reach: ${firstSize.reachMm || firstSize.reach || 'N/A'}`);
        }
      }
      
      console.log('\n  📷 Images:');
      if (bike.images) {
        console.log(`    Total images: ${bike.images.length}`);
        if (bike.images[0]) {
          console.log(`    First image: ${bike.images[0].url || bike.images[0].src}`);
        }
      }
      
      console.log('\n  📊 Analysis:');
      console.log(`    spec_level: ${bike.spec_level || 'NULL'}`);
      console.log(`    has_full_geometry: ${bike.has_full_geometry}`);
      console.log(`    is_active: ${bike.is_active}`);
      
    } else {
      console.log('  ❌ No cleaned data found in bikes table');
    }
    
    // Show the actual URL we should be scraping
    console.log('\n🌐 URL Analysis:');
    const urlData = await client.query(`
      SELECT bd.comprehensive_data->'pageInfo'->>'url' as url
      FROM bikes_data bd
      WHERE bd.keyid = 1
    `);
    
    if (urlData.rows.length > 0) {
      console.log(`  Original URL from bikes_data: ${urlData.rows[0].url}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

analyzeKeyId1();