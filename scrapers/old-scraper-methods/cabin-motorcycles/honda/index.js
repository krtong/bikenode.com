const { scrapeHondaGyro, verifyGyroHistory } = require('./scraper');
const { upsertMotorcycle, startScrapingLog, completeScrapingLog } = require('../shared/database');

async function main() {
  console.log('Starting Honda Gyro Canopy scraper...');
  console.log('='.repeat(50));
  
  let modelsInserted = 0;
  let errors = [];
  let logId = null;
  
  try {
    // Get historical information
    const history = await verifyGyroHistory();
    
    // Start logging
    logId = await startScrapingLog('honda-gyro', 'Honda', {
      models: ['Gyro Canopy TA02', 'Gyro Canopy TA03'],
      production_years: '1990-present',
      history: history
    });
    
    // Scrape Honda Gyro models
    const results = await scrapeHondaGyro();
    
    // Process all models
    console.log('\nInserting Honda Gyro Canopy models...');
    let lastYear = null;
    let yearCount = 0;
    
    for (const model of results.models) {
      try {
        await upsertMotorcycle(model);
        
        // Only log every 5 years to avoid spam
        if (model.year !== lastYear) {
          yearCount++;
          if (yearCount % 5 === 0 || model.year === 1990 || model.year === 2008 || model.year === new Date().getFullYear()) {
            console.log(`✓ Inserted: ${model.year} ${model.make} ${model.model} ${model.package}`);
          }
          lastYear = model.year;
        }
        
        modelsInserted++;
      } catch (error) {
        console.error(`✗ Failed to insert ${model.year} ${model.model} ${model.package}:`, error.message);
        errors.push({ model, error: error.message });
      }
    }
    
    console.log(`✓ Inserted ${modelsInserted} total model entries`);
    
    // Complete logging
    const status = errors.length > 0 ? 'completed_with_errors' : 'success';
    await completeScrapingLog(
      logId,
      modelsInserted,
      status,
      errors.length > 0 ? JSON.stringify(errors) : null,
      {
        total_attempted: results.models.length,
        metadata: results.metadata,
        ta02_count: results.models.filter(m => m.package === 'TA02').length,
        ta03_count: results.models.filter(m => m.package === 'TA03').length
      }
    );
    
    console.log('\n' + '='.repeat(50));
    console.log(`Scraping completed!`);
    console.log(`Models inserted: ${modelsInserted}`);
    console.log(`Errors: ${errors.length}`);
    
    console.log('\nHonda Gyro Canopy Summary:');
    console.log('- Production: 1990-present (continuous)');
    console.log('- Total units: 62,000+ (as of 2002)');
    console.log('- TA02 (2-stroke): 1990-2008');
    console.log('- TA03 (4-stroke): 2008-present');
    console.log('- Type: Semi-enclosed three-wheeler');
    console.log('- Primary use: Commercial delivery');
    console.log('- Markets: Japan domestic');
    
    if (results.metadata.sources.length > 0) {
      console.log('\nData sources:');
      results.metadata.sources.forEach(source => {
        console.log(`- ${source}`);
      });
    }
    
  } catch (error) {
    console.error('Fatal error in Honda Gyro scraper:', error);
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