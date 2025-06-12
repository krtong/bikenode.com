#!/usr/bin/env node

/**
 * Test Adaptive Scraping
 * Demonstrates the adaptive scraping approach
 */

const { scrapePeravesAdaptive } = require('./peraves/adaptive-scraper');
const AdaptiveScraper = require('./shared/adaptive-scraper');

async function testAdaptiveScraping() {
  console.log('🧪 Testing Adaptive Scraping System');
  console.log('=' .repeat(60));
  
  // Test 1: Direct adaptive scraper on a single page
  console.log('\n📋 Test 1: Direct Adaptive Scraping');
  console.log('-'.repeat(40));
  
  const adaptiveScraper = new AdaptiveScraper({
    analyzeFirst: true,
    saveHTML: true
  });
  
  try {
    const testUrl = 'https://en.wikipedia.org/wiki/Peraves';
    console.log(`Testing on: ${testUrl}`);
    
    const result = await adaptiveScraper.scrape(testUrl, {
      enhance: true
    });
    
    console.log('\nResults:');
    console.log(`- Strategy used: ${result.metadata.strategy}`);
    console.log(`- Items found: ${result.data.length}`);
    console.log(`- Selectors used: ${result.metadata.selectors_used.join(', ')}`);
    
    if (result.data.length > 0) {
      console.log('\nSample data:');
      result.data.slice(0, 3).forEach((item, i) => {
        console.log(`\n  Item ${i + 1}:`);
        console.log(`  - Model: ${item.model || item.title || 'N/A'}`);
        console.log(`  - Year: ${item.year || 'N/A'}`);
        if (item.specifications) {
          console.log(`  - Specs: ${Object.keys(item.specifications).length} fields`);
        }
      });
    }
  } catch (error) {
    console.error('Test 1 failed:', error.message);
  }
  
  // Test 2: Full Peraves adaptive scraper
  console.log('\n\n📋 Test 2: Peraves Adaptive Scraper');
  console.log('-'.repeat(40));
  
  try {
    const peravesResults = await scrapePeravesAdaptive();
    
    console.log('\nResults:');
    console.log(`- Total models: ${peravesResults.models.length}`);
    console.log(`- Sources attempted: ${peravesResults.metadata.sources_attempted.join(', ')}`);
    console.log(`- Success rate: ${peravesResults.metadata.success_rate}`);
    
    if (peravesResults.metadata.sources_succeeded.length > 0) {
      console.log('\nSuccessful sources:');
      peravesResults.metadata.sources_succeeded.forEach(source => {
        console.log(`  - ${source.source}: ${source.count} models (${source.strategy} strategy)`);
      });
    }
    
    if (peravesResults.models.length > 0) {
      console.log('\nUnique models found:');
      const modelNames = [...new Set(peravesResults.models.map(m => m.model))];
      modelNames.forEach(name => {
        const count = peravesResults.models.filter(m => m.model === name).length;
        console.log(`  - ${name}: ${count} entries`);
      });
    }
    
    if (peravesResults.errors.length > 0) {
      console.log('\nErrors encountered:');
      peravesResults.errors.forEach(err => {
        console.log(`  - ${err.source}: ${err.error}`);
      });
    }
  } catch (error) {
    console.error('Test 2 failed:', error.message);
  }
  
  // Test 3: Compare strategies
  console.log('\n\n📋 Test 3: Strategy Comparison');
  console.log('-'.repeat(40));
  
  const testUrls = [
    { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/BMW_C1' },
    { name: 'Peraves Official', url: 'https://www.peravescz.com' }
  ];
  
  for (const test of testUrls) {
    console.log(`\nTesting ${test.name}...`);
    
    try {
      const result = await adaptiveScraper.scrape(test.url, {
        analyzeFirst: true
      });
      
      console.log(`- Strategy: ${result.metadata.strategy}`);
      console.log(`- Items found: ${result.data.length}`);
      console.log(`- Analyzed: ${result.metadata.analyzed ? 'Yes' : 'No'}`);
    } catch (error) {
      console.log(`- Failed: ${error.message}`);
    }
  }
  
  console.log('\n\n✅ Adaptive scraping tests complete!');
  console.log('\n💡 Tips:');
  console.log('- Check debug/analysis/ for detailed analysis reports');
  console.log('- Check scraping-profiles/ for saved successful patterns');
  console.log('- Run with NODE_ENV=production to disable seed data fallback');
}

// Run tests
if (require.main === module) {
  testAdaptiveScraping().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testAdaptiveScraping };