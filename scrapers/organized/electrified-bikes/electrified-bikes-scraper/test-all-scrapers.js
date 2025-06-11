const fs = require('fs');
const path = require('path');

// Import all scrapers
const scrapers = [
  { name: 'Arctic Leopard', file: './scrapers/arctic-leopard-scraper.js' },
  { name: 'Electric Bike Review', file: './scrapers/electric-bike-review-scraper.js' },
  { name: 'EridePro', file: './scrapers/eridepro-scraper.js' },
  { name: 'HappyRun', file: './scrapers/happyrun-scraper.js' },
  { name: 'Rawrr', file: './scrapers/rawrr-scraper.js' },
  { name: 'Rev Rides', file: './scrapers/rev-rides-scraper.js' },
  { name: 'Segway', file: './scrapers/segway-scraper.js' },
  { name: 'Sur-Ron V4', file: './scrapers/surron-scraper-v4.js' }
];

async function testAllScrapers() {
  console.log('🧪 Testing all e-bike scrapers...\n');
  
  const results = {
    successful: [],
    failed: [],
    summary: {}
  };
  
  for (const scraperInfo of scrapers) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing ${scraperInfo.name} scraper...`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const ScraperClass = require(scraperInfo.file);
      const scraper = new ScraperClass();
      
      const startTime = Date.now();
      const scraperResults = await scraper.scrape();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      const summary = {
        name: scraperInfo.name,
        duration: `${duration}s`,
        modelsFound: scraperResults.models.length,
        errors: scraperResults.errors.length,
        avgSpecsPerModel: scraperResults.models.length > 0 
          ? (scraperResults.models.reduce((sum, m) => sum + (m.specCount || 0), 0) / scraperResults.models.length).toFixed(1)
          : 0,
        models: scraperResults.models.map(m => ({
          name: m.model,
          specs: m.specCount || Object.keys(m.specs || {}).length,
          price: m.price
        }))
      };
      
      results.successful.push(summary);
      results.summary[scraperInfo.name] = {
        status: '✅ Success',
        models: summary.modelsFound,
        avgSpecs: summary.avgSpecsPerModel,
        duration: summary.duration
      };
      
      console.log(`\n✅ ${scraperInfo.name} completed in ${duration}s`);
      console.log(`   Models: ${summary.modelsFound}`);
      console.log(`   Avg specs/model: ${summary.avgSpecsPerModel}`);
      
    } catch (error) {
      console.error(`\n❌ ${scraperInfo.name} failed: ${error.message}`);
      results.failed.push({
        name: scraperInfo.name,
        error: error.message
      });
      results.summary[scraperInfo.name] = {
        status: '❌ Failed',
        error: error.message
      };
    }
  }
  
  // Print summary
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📊 TESTING SUMMARY');
  console.log(`${'='.repeat(60)}`);
  
  console.log(`\nSuccessful: ${results.successful.length}/${scrapers.length}`);
  console.log(`Failed: ${results.failed.length}/${scrapers.length}\n`);
  
  // Create summary table
  console.log('Scraper Results:');
  console.log('-'.repeat(80));
  console.log('Scraper'.padEnd(20) + 'Status'.padEnd(15) + 'Models'.padEnd(10) + 'Avg Specs'.padEnd(12) + 'Duration');
  console.log('-'.repeat(80));
  
  for (const [name, data] of Object.entries(results.summary)) {
    const status = data.status.padEnd(15);
    const models = (data.models || '-').toString().padEnd(10);
    const avgSpecs = (data.avgSpecs || '-').toString().padEnd(12);
    const duration = data.duration || '-';
    console.log(`${name.padEnd(20)}${status}${models}${avgSpecs}${duration}`);
  }
  
  console.log('-'.repeat(80));
  
  // Save detailed results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = path.join(__dirname, 'test-results', `test-run-${timestamp}.json`);
  
  // Ensure test-results directory exists
  const testDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Detailed results saved to: ${resultsFile}`);
  
  // Show top performers
  if (results.successful.length > 0) {
    console.log('\n🏆 Top Performers:');
    const sorted = [...results.successful].sort((a, b) => b.modelsFound - a.modelsFound);
    sorted.slice(0, 3).forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.name}: ${s.modelsFound} models (${s.avgSpecsPerModel} specs/model)`);
    });
  }
  
  // Show models with best spec coverage
  console.log('\n📋 Best Spec Coverage:');
  const allModels = results.successful.flatMap(s => 
    s.models.map(m => ({ ...m, brand: s.name }))
  );
  const topSpecs = allModels.sort((a, b) => b.specs - a.specs).slice(0, 5);
  topSpecs.forEach(m => {
    console.log(`   - ${m.brand} ${m.name}: ${m.specs} specs`);
  });
}

// Run tests
testAllScrapers().catch(console.error);