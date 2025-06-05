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

async function prepareDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'bikenode',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  });

  try {
    await client.connect();
    console.log('🔧 Preparing database...\n');
    
    // Check if old bikes table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bikes'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('⚠️  Found existing bikes table with different schema');
      
      // Check if bikes_old_schema already exists
      const oldTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'bikes_old_schema'
        );
      `);
      
      if (oldTableCheck.rows[0].exists) {
        console.log('📦 bikes_old_schema already exists, dropping current bikes table...');
        await client.query('DROP TABLE IF EXISTS bikes CASCADE');
      } else {
        // Rename old table to preserve data
        console.log('📦 Renaming existing bikes table to bikes_old_schema...');
        await client.query('ALTER TABLE IF EXISTS bikes RENAME TO bikes_old_schema');
      }
      console.log('✅ Old table handled successfully\n');
    }
    
    // Now the scraper can create its new bikes table
    console.log('✅ Database is ready for the enhanced scraper\n');
    
  } catch (error) {
    console.error('❌ Database preparation failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function runScraper() {
  // First prepare the database
  await prepareDatabase();
  
  // Now run the scraper
  const scraper = new EnhancedBikeScraper();
  
  try {
    console.log('🚀 Starting Enhanced Bike Scraper v4.5\n');
    
    await scraper.initialize();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const limit = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
    const noSave = args.includes('--no-save');
    
    if (args.includes('--help')) {
      console.log(`
Enhanced Bike Scraper v4.5 (Safe Mode)

Usage: node run_enhanced_scraper_safe.js [options]

Options:
  --limit=N     Process only N bikes (useful for testing)
  --no-save     Don't save results to files
  --help        Show this help message

This script safely handles existing tables and extracts ALL client-side 
data from 99spokes bike pages, including embedded JSON in script tags.
`);
      process.exit(0);
    }
    
    console.log(`Starting scrape with limit: ${limit || 'no limit'}\n`);
    
    await scraper.processAll({
      limit: limit ? parseInt(limit) : null,
      saveToFile: !noSave
    });
    
  } catch (error) {
    console.error('\n❌ Scraper failed:', error.message);
    console.error(error.stack);
  } finally {
    await scraper.cleanup();
  }
}

// Run the scraper
runScraper().catch(console.error);