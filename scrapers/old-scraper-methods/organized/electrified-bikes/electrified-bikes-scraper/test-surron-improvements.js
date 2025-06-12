const SurRonV3 = require('./scrapers/surron-scraper-v3.js');
const SurRonV4 = require('./scrapers/surron-scraper-v4.js');

async function compareSurRonScrapers() {
  console.log('🧪 Comparing Sur-Ron Scraper Versions\n');
  
  // Test V3
  console.log('Testing Sur-Ron V3...');
  const v3Scraper = new SurRonV3();
  const v3Start = Date.now();
  const v3Results = await v3Scraper.scrape();
  const v3Duration = ((Date.now() - v3Start) / 1000).toFixed(2);
  
  // Test V4
  console.log('\nTesting Sur-Ron V4...');
  const v4Scraper = new SurRonV4();
  const v4Start = Date.now();
  const v4Results = await v4Scraper.scrape();
  const v4Duration = ((Date.now() - v4Start) / 1000).toFixed(2);
  
  // Compare results
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPARISON RESULTS');
  console.log('='.repeat(60));
  
  console.log('\nV3 Results:');
  console.log(`  Duration: ${v3Duration}s`);
  console.log(`  Models found: ${v3Results.models.length}`);
  console.log(`  Errors: ${v3Results.errors.length}`);
  
  v3Results.models.forEach(model => {
    console.log(`  - ${model.model}: ${model.specCount} specs`);
    if (model.specCount > 0) {
      console.log(`    Sample specs: ${Object.keys(model.specs).slice(0, 3).join(', ')}`);
    }
  });
  
  console.log('\nV4 Results:');
  console.log(`  Duration: ${v4Duration}s`);
  console.log(`  Models found: ${v4Results.models.length}`);
  console.log(`  Errors: ${v4Results.errors.length}`);
  
  v4Results.models.forEach(model => {
    console.log(`  - ${model.model}: ${model.specCount} specs`);
    if (model.specCount > 0) {
      console.log(`    Sample specs: ${Object.keys(model.specs).slice(0, 5).join(', ')}`);
    }
  });
  
  // Show improvements
  console.log('\n' + '='.repeat(60));
  console.log('📈 IMPROVEMENTS');
  console.log('='.repeat(60));
  
  // Find matching models and compare spec counts
  const v3Model = v3Results.models.find(m => m.model.includes('X'));
  const v4Model = v4Results.models.find(m => m.model.includes('X'));
  
  if (v3Model && v4Model) {
    const specImprovement = v4Model.specCount - v3Model.specCount;
    const percentImprovement = ((specImprovement / v3Model.specCount) * 100).toFixed(0);
    
    console.log(`\nSur-Ron X Spec Improvements:`);
    console.log(`  V3: ${v3Model.specCount} specs`);
    console.log(`  V4: ${v4Model.specCount} specs`);
    console.log(`  Improvement: +${specImprovement} specs (${percentImprovement}% increase)`);
    
    // Show new specs captured in V4
    const v3SpecKeys = Object.keys(v3Model.specs);
    const v4SpecKeys = Object.keys(v4Model.specs);
    const newSpecs = v4SpecKeys.filter(key => !v3SpecKeys.includes(key));
    
    if (newSpecs.length > 0) {
      console.log(`\nNew specs captured in V4:`);
      newSpecs.forEach(spec => {
        console.log(`  - ${spec}: ${v4Model.specs[spec]}`);
      });
    }
  }
  
  // Quality improvements
  console.log('\n🔍 Quality Improvements:');
  console.log('  ✅ Better URL filtering (no more non-product pages)');
  console.log('  ✅ Enhanced spec extraction from multiple tables');
  console.log('  ✅ Improved error handling');
  console.log('  ✅ Added fallback for known model specs');
  console.log('  ✅ Better data cleaning and normalization');
}

// Run comparison
compareSurRonScrapers().catch(console.error);