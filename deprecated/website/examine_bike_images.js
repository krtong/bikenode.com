#!/usr/bin/env node
/*  Script to examine comprehensive_data structure and find image URLs  */

import pkg from 'pg';
const { Pool } = pkg;
import "dotenv/config.js";

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://kevintong@localhost:5432/bikenode?sslmode=disable",
});

async function main() {
  console.log('🔍 Examining bikes_data table structure and image URLs...\n');
  
  try {
    // Test connection
    const client = await pool.connect();
    console.log("✅ Database connection established\n");
    client.release();
    
    // Check if tables exist
    console.log('📊 Checking database tables...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('bikes_catalog', 'bikes_data')
      ORDER BY table_name;
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    console.log('Found tables:', tablesResult.rows.map(r => r.table_name).join(', '));
    console.log('');
    
    // Get column information for bikes_data
    console.log('📋 bikes_data table structure:');
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'bikes_data'
      ORDER BY ordinal_position;
    `;
    
    const columnsResult = await pool.query(columnsQuery);
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    console.log('');
    
    // Get 5 sample bikes with comprehensive_data
    console.log('🚴 Fetching 5 sample bikes with comprehensive_data...\n');
    const sampleQuery = `
      SELECT 
        bc.keyid,
        bc.make,
        bc.model,
        bc.year,
        bc.variant,
        bd.comprehensive_data
      FROM bikes_catalog bc
      JOIN bikes_data bd ON bc.keyid = bd.keyid
      WHERE bd.comprehensive_data IS NOT NULL
      LIMIT 5;
    `;
    
    const sampleResult = await pool.query(sampleQuery);
    
    // Analyze each sample
    for (let i = 0; i < sampleResult.rows.length; i++) {
      const bike = sampleResult.rows[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Sample ${i + 1}: ${bike.make} ${bike.model} ${bike.year} - ${bike.variant}`);
      console.log(`Key ID: ${bike.keyid}`);
      console.log(`${'='.repeat(60)}`);
      
      const data = bike.comprehensive_data;
      
      // Check all possible image locations
      console.log('\n🖼️  Image URL Analysis:');
      
      const imageLocations = [
        { path: 'images', data: data.images },
        { path: 'imageUrl', data: data.imageUrl },
        { path: 'imageUrls', data: data.imageUrls },
        { path: 'image', data: data.image },
        { path: 'photos', data: data.photos },
        { path: 'gallery', data: data.gallery },
        { path: 'media', data: data.media },
        { path: 'media.images', data: data.media?.images },
        { path: 'bikeDetails.images', data: data.bikeDetails?.images },
        { path: 'bikeDetails.imageUrl', data: data.bikeDetails?.imageUrl },
        { path: 'specifications.images', data: data.specifications?.images },
        { path: 'primaryImage', data: data.primaryImage },
        { path: 'thumbnails', data: data.thumbnails },
      ];
      
      let foundImages = false;
      
      imageLocations.forEach(loc => {
        if (loc.data) {
          console.log(`  ✓ Found at '${loc.path}':`);
          if (Array.isArray(loc.data)) {
            console.log(`    - Array with ${loc.data.length} items`);
            loc.data.slice(0, 3).forEach((item, idx) => {
              if (typeof item === 'string') {
                console.log(`      [${idx}]: ${item.substring(0, 100)}${item.length > 100 ? '...' : ''}`);
              } else if (item && typeof item === 'object') {
                console.log(`      [${idx}]: ${JSON.stringify(item).substring(0, 100)}...`);
              }
            });
            if (loc.data.length > 3) {
              console.log(`      ... and ${loc.data.length - 3} more`);
            }
          } else if (typeof loc.data === 'string') {
            console.log(`    - String: ${loc.data.substring(0, 100)}${loc.data.length > 100 ? '...' : ''}`);
          } else if (typeof loc.data === 'object') {
            console.log(`    - Object: ${JSON.stringify(loc.data).substring(0, 100)}...`);
          }
          foundImages = true;
        }
      });
      
      if (!foundImages) {
        console.log('  ❌ No images found in common locations');
        
        // Deep search for any URL-like strings
        console.log('\n  🔍 Deep searching for URL patterns...');
        const urlPattern = /https?:\/\/[^\s"']+\.(jpg|jpeg|png|gif|webp|svg)/gi;
        const jsonString = JSON.stringify(data);
        const urlMatches = jsonString.match(urlPattern);
        
        if (urlMatches) {
          console.log(`  Found ${urlMatches.length} URL(s) in data:`);
          urlMatches.slice(0, 3).forEach((url, idx) => {
            console.log(`    [${idx}]: ${url}`);
          });
          if (urlMatches.length > 3) {
            console.log(`    ... and ${urlMatches.length - 3} more`);
          }
        } else {
          console.log('  No image URLs found anywhere in the data');
        }
      }
      
      // Show top-level keys
      console.log('\n📦 Top-level data structure:');
      Object.keys(data).forEach(key => {
        const value = data[key];
        const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
        console.log(`  - ${key}: ${type}`);
      });
      
      // Show full structure for first sample
      if (i === 0) {
        console.log('\n📄 Full data structure (first sample only):');
        console.log(JSON.stringify(data, null, 2).substring(0, 2000) + '...\n');
      }
    }
    
    // Summary statistics
    console.log('\n📊 Database Statistics:');
    const statsQuery = `
      SELECT 
        COUNT(*) as total_bikes,
        COUNT(CASE WHEN bd.comprehensive_data IS NOT NULL THEN 1 END) as bikes_with_data,
        COUNT(CASE WHEN bd.comprehensive_data->>'images' IS NOT NULL THEN 1 END) as with_images_field,
        COUNT(CASE WHEN bd.comprehensive_data->>'imageUrl' IS NOT NULL THEN 1 END) as with_imageUrl_field,
        COUNT(CASE WHEN bd.comprehensive_data->>'media' IS NOT NULL THEN 1 END) as with_media_field,
        COUNT(CASE WHEN bd.comprehensive_data->'media'->>'images' IS NOT NULL THEN 1 END) as with_media_images
      FROM bikes_catalog bc
      LEFT JOIN bikes_data bd ON bc.keyid = bd.keyid;
    `;
    
    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];
    
    console.log(`  Total bikes in catalog: ${stats.total_bikes}`);
    console.log(`  Bikes with comprehensive_data: ${stats.bikes_with_data}`);
    console.log(`  Bikes with 'images' field: ${stats.with_images_field}`);
    console.log(`  Bikes with 'imageUrl' field: ${stats.with_imageUrl_field}`);
    console.log(`  Bikes with 'media' field: ${stats.with_media_field}`);
    console.log(`  Bikes with 'media.images': ${stats.with_media_images}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    console.log('\n✅ Done!');
  }
}

// Run the script
main().catch(console.error);