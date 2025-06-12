#!/usr/bin/env node

/**
 * Test Peraves Site Navigation
 * Demonstrates the full navigation and scraping capabilities
 */

const { scrapePeravesFull } = require('./peraves/full-scraper');
const PeravesSiteNavigator = require('./peraves/site-navigator');

async function testPeravesNavigation() {
  console.log('🧪 Testing Peraves Site Navigation');
  console.log('=' .repeat(60));
  
  // Test 1: Navigation only
  console.log('\n📋 Test 1: Site Navigation Only');
  console.log('-'.repeat(40));
  
  try {
    const navigator = new PeravesSiteNavigator({
      debug: true,
      maxDepth: 2
    });
    
    const navResults = await navigator.navigate();
    
    console.log('\nNavigation Results:');
    console.log(`- Pages visited: ${navResults.urls_discovered.length}`);
    console.log(`- Models found: ${navResults.models.length}`);
    console.log(`- Errors: ${navResults.errors.length}`);
    
    if (navResults.urls_discovered.length > 0) {
      console.log('\nSample URLs discovered:');
      navResults.urls_discovered.slice(0, 5).forEach(url => {
        console.log(`  - ${url}`);
      });
    }
    
    if (navResults.models.length > 0) {
      console.log('\nModels found through navigation:');
      navResults.models.forEach(model => {
        console.log(`  - ${model.model} (${model.year || 'year unknown'})`);
      });
    }
    
  } catch (error) {
    console.error('Navigation test failed:', error.message);
  }

  // Test 2: Full scraping with navigation
  console.log('\n\n📋 Test 2: Full Scraping (Navigation + Adaptive)');
  console.log('-'.repeat(40));
  
  try {
    const fullResults = await scrapePeravesFull({
      navigate: true,
      debug: true,
      maxDepth: 2
    });
    
    console.log('\nFull Scraping Results:');
    console.log(`- Total models: ${fullResults.models.length}`);
    console.log(`- Methods used: ${fullResults.metadata.methods_used.join(', ')}`);
    console.log(`- Confidence score: ${fullResults.metadata.confidence_score.toFixed(2)}%`);
    
    // Show model distribution
    if (fullResults.models.length > 0) {
      const families = {};
      fullResults.models.forEach(model => {
        const family = model.family || 'Unknown';
        families[family] = (families[family] || 0) + 1;
      });
      
      console.log('\nModel families found:');
      Object.entries(families).forEach(([family, count]) => {
        console.log(`  - ${family}: ${count} models`);
      });
      
      // Show sample models with details
      console.log('\nSample models with details:');
      fullResults.models.slice(0, 5).forEach(model => {
        console.log(`\n  ${model.model}:`);
        console.log(`    - Year: ${model.year || 'Unknown'}`);
        console.log(`    - Family: ${model.family || 'Unknown'}`);
        console.log(`    - Sources: ${model.sources.length}`);
        console.log(`    - Completeness: ${model.completeness.toFixed(0)}%`);
        console.log(`    - Specs: ${Object.keys(model.specifications || {}).length} fields`);
      });
    }
    
    // Show source distribution
    if (fullResults.sources.length > 0) {
      console.log('\nData sources used:');
      fullResults.sources.forEach(source => {
        console.log(`  - ${source.method}: ${source.count} models`);
        if (source.urls_visited) {
          console.log(`    (${source.urls_visited} pages visited)`);
        }
        if (source.sources_used) {
          console.log(`    Sources: ${source.sources_used.join(', ')}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Full scraping test failed:', error.message);
  }

  // Test 3: Compare with non-navigation scraping
  console.log('\n\n📋 Test 3: Comparison - Without Navigation');
  console.log('-'.repeat(40));
  
  try {
    const noNavResults = await scrapePeravesFull({
      navigate: false,
      debug: false
    });
    
    console.log(`Models found without navigation: ${noNavResults.models.length}`);
    console.log(`Methods used: ${noNavResults.metadata.methods_used.join(', ')}`);
    console.log(`Confidence: ${noNavResults.metadata.confidence_score.toFixed(2)}%`);
    
  } catch (error) {
    console.error('Comparison test failed:', error.message);
  }

  console.log('\n\n✅ All navigation tests complete!');
  console.log('\n💡 Tips:');
  console.log('- Check debug/navigation/ for detailed navigation reports');
  console.log('- Check debug/reports/ for full scraping reports and CSV exports');
  console.log('- Navigation discovers pages that static scraping might miss');
  console.log('- Full scraping combines multiple methods for best results');
}

// Run tests
if (require.main === module) {
  testPeravesNavigation().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testPeravesNavigation };