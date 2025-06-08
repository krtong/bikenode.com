#!/usr/bin/env node

import ElectrifiedBikeScraper from './electrified_bike_scraper.js';
import { electrifiedBikeSources } from './electrified_bike_sources.js';

// Test the electrified bike scraper with a limited set of brands
async function testScraper() {
  console.log('🧪 Testing Electrified Bike Scraper...\n');

  const scraper = new ElectrifiedBikeScraper();
  
  // Test with just a few brands for quick validation
  const testBrands = [
    {
      name: 'Sur-Ron',
      urls: ['https://sur-ronusa.com/collections/all'],
      selectors: {
        products: '.product-item',
        name: '.product-item__title',
        price: '.price',
        link: 'a'
      }
    },
    {
      name: 'Talaria', 
      urls: ['https://talaria.bike/pages/bikes'],
      selectors: {
        products: '.product-card',
        name: '.product-card__title',
        specs: '.product-card__description'
      }
    }
  ];

  try {
    await scraper.initialize();
    
    // Test spec extraction
    console.log('Testing spec extraction...');
    const testTexts = [
      'Motor: 6000W Peak Power, Battery: 60V 40Ah',
      'Top Speed: 45mph, Range: 75 miles',
      'Weight: 110 lbs, Price: $4,299',
      '3000W motor with 72V 32Ah battery'
    ];

    testTexts.forEach(text => {
      const specs = scraper.extractSpecs(text);
      console.log(`Text: "${text}"`);
      console.log('Extracted:', specs);
      console.log('---');
    });

    // Test scraping a single brand
    console.log('\nTesting single brand scrape...');
    const brandData = await scraper.scrapeBrand(testBrands[0]);
    console.log(`\nBrand: ${brandData.name}`);
    console.log(`Models found: ${brandData.models.length}`);
    
    if (brandData.models.length > 0) {
      console.log('\nFirst model:');
      console.log(JSON.stringify(brandData.models[0], null, 2));
    }

    // Test categorization
    console.log('\nTesting categorization...');
    const testModels = [
      { name: 'Light Bee', specs: { motor: '6000W' } },
      { name: 'Storm Bee', specs: { motor: '12000W' } },
      { name: 'X160', specs: { motor: '1500W' } },
      { name: 'Sting', specs: { motor: '8000W' } }
    ];

    testModels.forEach(model => {
      const category = scraper.extractSpecs(model.specs.motor).motor;
      console.log(`${model.name} (${model.specs.motor}): ${category}`);
    });

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await scraper.close();
  }
}

// Run test
testScraper().catch(console.error);