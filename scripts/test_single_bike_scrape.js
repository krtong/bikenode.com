#!/usr/bin/env node
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from 'dotenv';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../scrapers/.env') });

// Import the scraper
import EnhancedBikeScraper from '../scrapers/04.5_enhanced_scraper_fixed.js';

async function testSingleBike() {
  const scraper = new EnhancedBikeScraper();
  
  try {
    console.log('🚀 Testing single bike scrape\n');
    
    // Initialize the scraper
    await scraper.initialize();
    
    // Get one bike to test
    const bikes = await scraper.getBikesToScrape(1);
    
    if (bikes.length === 0) {
      console.log('No bikes found to scrape');
      return;
    }
    
    const bike = bikes[0];
    console.log('Testing with bike:', bike.make, bike.model, bike.year);
    console.log('URL:', bike.url);
    
    // Extract data
    console.log('\nExtracting data...');
    const scrapedData = await scraper.extractBikeData(bike.url);
    
    console.log('\nExtracted data summary:');
    console.log('  Has embedded data:', scrapedData.hasEmbeddedData);
    console.log('  Has bike data:', !!scrapedData.bike);
    
    if (scrapedData.bike) {
      console.log('  Bike ID:', scrapedData.bike.id);
      console.log('  Manufacturer:', scrapedData.bike.manufacturer);
      console.log('  Model:', scrapedData.bike.model);
      console.log('  Year:', scrapedData.bike.year);
    }
    
    // Try to save data manually to debug
    console.log('\nAttempting to save data...');
    
    try {
      await scraper.saveScrapedData(bike.keyid, scrapedData);
      console.log('✅ Data saved successfully!');
    } catch (saveError) {
      console.error('❌ Save error:', saveError.message);
      console.error('Error stack:', saveError.stack);
      
      // Check what's causing the JSON error
      console.log('\nDebugging JSON issue...');
      console.log('Type of scrapedData:', typeof scrapedData);
      console.log('Type of scrapedData.bike:', typeof scrapedData.bike);
      console.log('Type of scrapedData.raw:', typeof scrapedData.raw);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await scraper.cleanup();
  }
}

testSingleBike();