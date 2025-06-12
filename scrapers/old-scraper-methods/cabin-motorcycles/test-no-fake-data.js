#!/usr/bin/env node

/**
 * Test script to verify no fake data is being generated
 * This runs all scrapers and validates the output
 */

const { validateNoFakeData } = require('./shared/validate-no-fake-data');
const { scrapeHondaFull } = require('./honda/full-scraper');
const { scrapePeraves } = require('./peraves/scraper');
const { scrapeBMWC1 } = require('./bmw/scraper');
const { scrapeLitMotors } = require('./lit-motors/scraper');

async function testAllScrapers() {
  console.log('🔍 Testing all scrapers for fake data generation...\n');
  
  const scrapers = [
    { name: 'Honda', fn: scrapeHondaFull },
    { name: 'Peraves', fn: scrapePeraves },
    { name: 'BMW', fn: scrapeBMWC1 },
    { name: 'Lit Motors', fn: scrapeLitMotors }
  ];
  
  let allPassed = true;
  
  for (const scraper of scrapers) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing ${scraper.name} scraper...`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      // Run scraper
      console.log(`Running ${scraper.name} scraper...`);
      const results = await scraper.fn();
      
      console.log(`\nResults: ${results.models.length} models found`);
      
      // Validate results
      if (results.models.length > 0) {
        console.log('\nValidating scraped data...');
        
        try {
          validateNoFakeData(results.models);
          console.log('✅ PASSED: No fake data detected!');
        } catch (validationError) {
          console.error(`❌ FAILED: ${validationError.message}`);
          allPassed = false;
          
          // Show the problematic data
          console.log('\nProblematic data:');
          console.log(JSON.stringify(results.models[0], null, 2));
        }
        
        // Additional checks
        console.log('\nAdditional validation:');
        results.models.forEach((model, i) => {
          // Check for required fields
          if (!model.specifications?.source_url) {
            console.error(`❌ Model ${i} missing source_url`);
            allPassed = false;
          }
          if (!model.specifications?.scraped_at) {
            console.error(`❌ Model ${i} missing scraped_at`);
            allPassed = false;
          }
          if (model.specifications?.source_type !== 'web_scraping') {
            console.error(`❌ Model ${i} has invalid source_type: ${model.specifications?.source_type}`);
            allPassed = false;
          }
        });
        
      } else {
        console.log('ℹ️  No models found - this is acceptable (no fake data was generated)');
      }
      
    } catch (error) {
      console.error(`\n❌ Error running ${scraper.name} scraper:`, error.message);
      allPassed = false;
    }
  }
  
  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('FINAL RESULTS');
  console.log(`${'='.repeat(60)}`);
  
  if (allPassed) {
    console.log('\n✅ ALL TESTS PASSED!');
    console.log('No fake data generation detected in any scraper.');
    console.log('All scrapers either return real data or empty results.');
  } else {
    console.log('\n❌ SOME TESTS FAILED!');
    console.log('Please review the errors above and fix any fake data generation.');
    process.exit(1);
  }
}

// Run tests
testAllScrapers().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});