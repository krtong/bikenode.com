#!/usr/bin/env node
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from scrapers directory
config({ path: path.join(__dirname, '../scrapers/.env') });

// Import the scraper
import EnhancedBikeScraper from '../scrapers/04.5_enhanced_scraper.js';

async function testScraper() {
  const scraper = new EnhancedBikeScraper();
  
  try {
    console.log('🚀 Testing Enhanced Bike Scraper v4.5\n');
    
    // Initialize the scraper
    await scraper.initialize();
    
    // Run with a small limit to test
    await scraper.processAll({
      limit: 5,  // Test with just 5 bikes
      saveToFile: true
    });
    
    console.log('\n✅ Test completed successfully!');
    console.log('Check the following:');
    console.log('1. Database table "bikes" should now exist with proper schema');
    console.log('2. Database table "scraped_bike_data" should contain raw scraped data');
    console.log('3. Check downloads folder for JSON output files');
    console.log('\nIf everything looks good, you can run the full scraper with:');
    console.log('node ../scrapers/04.5_enhanced_scraper.js --limit=100');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await scraper.cleanup();
  }
}

testScraper();