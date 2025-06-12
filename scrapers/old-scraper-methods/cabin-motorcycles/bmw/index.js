const { scrapeBMWC1 } = require('./scraper');
const { upsertMotorcycle, startScrapingLog, completeScrapingLog } = require('../shared/database');

async function main() {
  console.log('Starting BMW C1 scraper...');
  console.log('='.repeat(50));
  
  let modelsInserted = 0;
  let errors = [];
  let logId = null;
  
  try {
    // Start logging
    logId = await startScrapingLog('bmw-c1', 'BMW', {
      models: ['C1 125', 'C1 200', 'C1 200 Executive'],
      production_years: '2000-2002',
      source: 'Historical data'
    });
    
    // Scrape BMW C1 models
    const results = await scrapeBMWC1();
    
    // Process all models
    console.log('\nInserting BMW C1 models...');
    for (const model of results.models) {
      try {
        await upsertMotorcycle(model);
        console.log(`✓ Inserted: ${model.year} ${model.make} ${model.model} ${model.package}`);
        modelsInserted++;
      } catch (error) {
        console.error(`✗ Failed to insert ${model.year} ${model.model} ${model.package}:`, error.message);
        errors.push({ model, error: error.message });
      }
    }
    
    // Complete logging
    const status = errors.length > 0 ? 'completed_with_errors' : 'success';
    await completeScrapingLog(
      logId,
      modelsInserted,
      status,
      errors.length > 0 ? JSON.stringify(errors) : null,
      {
        total_attempted: results.models.length,
        wikipedia_verified: results.metadata.wikipedia_data ? true : false
      }
    );
    
    console.log('\n' + '='.repeat(50));
    console.log(`Scraping completed!`);
    console.log(`Models inserted: ${modelsInserted}`);
    console.log(`Errors: ${errors.length}`);
    console.log('\nBMW C1 Summary:');
    console.log('- Production: 2000-2002');
    console.log('- Total units: 12,634');
    console.log('- Variants: 125cc, 200cc (176cc), Executive');
    console.log('- Type: Semi-enclosed cabin scooter');
    
  } catch (error) {
    console.error('Fatal error in BMW C1 scraper:', error);
    if (logId) {
      await completeScrapingLog(logId, 0, 'failed', error.message);
    }
    process.exit(1);
  }
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };