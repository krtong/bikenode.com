#!/usr/bin/env node
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../scrapers/.env') });

// Import the scraper
import EnhancedBikeScraper from '../scrapers/04.5_enhanced_scraper_fixed.js';

async function debugExtraction() {
  const scraper = new EnhancedBikeScraper();
  
  try {
    console.log('🔍 Debug extraction for KeyID 1\n');
    
    // Initialize the scraper
    await scraper.initialize();
    
    const url = 'https://99spokes.com/bikes/bulls/2023/cross-lite-evo-2-750';
    
    // Extract data
    console.log('Extracting data from:', url);
    const scrapedData = await scraper.extractBikeData(url);
    
    console.log('\n📊 Extraction Results:');
    console.log('Has embedded data:', scrapedData.hasEmbeddedData);
    
    if (scrapedData.bike) {
      console.log('\n🚲 Bike Data:');
      console.log('  ID:', scrapedData.bike.id);
      console.log('  Manufacturer:', scrapedData.bike.manufacturer);
      console.log('  Model:', scrapedData.bike.model);
      console.log('  Year:', scrapedData.bike.year);
      console.log('  Is E-bike:', scrapedData.bike.isebike);
      console.log('  Category:', scrapedData.bike.category);
      console.log('  Build Kind:', scrapedData.bike.buildkind);
      
      // Check specific fields that were NULL
      console.log('\n❓ Fields that were NULL:');
      console.log('  Frame Material:', scrapedData.bike.framematerial || 'NOT FOUND');
      console.log('  Family ID:', scrapedData.bike.familyid || 'NOT FOUND');
      console.log('  Family Name:', scrapedData.bike.familyname || 'NOT FOUND');
      console.log('  Model ID:', scrapedData.bike.modelid || 'NOT FOUND');
      console.log('  Spec Level:', scrapedData.bike.analysis?.speclevel?.value || 'NOT FOUND');
      
      // Check geometry details
      console.log('\n📐 Geometry Details:');
      if (scrapedData.bike.sizes && scrapedData.bike.sizes.length > 0) {
        const firstSize = scrapedData.bike.sizes[0];
        console.log('  First size:', JSON.stringify(firstSize, null, 2));
      }
      
      // Check suspension details
      console.log('\n🔧 Suspension Details:');
      console.log('  Suspension obj:', JSON.stringify(scrapedData.bike.suspension, null, 2));
      
      // Check pricing details
      console.log('\n💰 Pricing Details:');
      console.log('  MSRP:', scrapedData.bike.msrp);
      console.log('  Display Price:', JSON.stringify(scrapedData.bike.displayprice, null, 2));
      
      // Check if this is actually an e-bike (the name suggests it is)
      console.log('\n⚡ E-bike Analysis:');
      console.log('  Name contains "EVO":', scrapedData.bike.model.includes('EVO'));
      console.log('  Components.motor:', scrapedData.bike.components?.motor);
      console.log('  Components.battery:', scrapedData.bike.components?.battery);
      console.log('  Components.display:', scrapedData.bike.components?.display);
      
      // Save raw JSON for inspection
      const fs = await import('fs/promises');
      await fs.writeFile(
        path.join(__dirname, 'keyid_1_raw_extraction.json'),
        JSON.stringify(scrapedData, null, 2)
      );
      console.log('\n💾 Full raw data saved to: keyid_1_raw_extraction.json');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await scraper.cleanup();
  }
}

debugExtraction();