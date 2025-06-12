const { scrapeLitMotors, searchLitMotorsNews } = require('./scraper');
const { upsertMotorcycle, startScrapingLog, completeScrapingLog } = require('../shared/database');

async function main() {
  console.log('Starting Lit Motors C-1 scraper...');
  console.log('='.repeat(50));
  
  let modelsInserted = 0;
  let errors = [];
  let logId = null;
  
  try {
    // Get recent news/milestones
    const news = await searchLitMotorsNews();
    
    // Start logging
    logId = await startScrapingLog('lit-motors-c1', 'Lit Motors', {
      model: 'C-1',
      type: 'Self-balancing enclosed motorcycle',
      development_years: '2012-present',
      milestones: news.milestones
    });
    
    // Scrape Lit Motors models
    const results = await scrapeLitMotors();
    
    // Process all models (development timeline)
    console.log('\nInserting Lit Motors C-1 development timeline...');
    let lastStatus = null;
    
    for (const model of results.models) {
      try {
        await upsertMotorcycle(model);
        
        // Only log when development status changes
        if (model.specifications.development_status !== lastStatus) {
          console.log(`✓ ${model.year}: ${model.specifications.development_status}`);
          lastStatus = model.specifications.development_status;
        }
        
        modelsInserted++;
      } catch (error) {
        console.error(`✗ Failed to insert ${model.year} ${model.model}:`, error.message);
        errors.push({ model, error: error.message });
      }
    }
    
    console.log(`✓ Inserted ${modelsInserted} development timeline entries`);
    
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
        development_years: results.models.length,
        latest_status: results.metadata.summary.current_status
      }
    );
    
    console.log('\n' + '='.repeat(50));
    console.log(`Scraping completed!`);
    console.log(`Timeline entries inserted: ${modelsInserted}`);
    console.log(`Errors: ${errors.length}`);
    
    console.log('\nLit Motors C-1 Summary:');
    console.log('- Announced: 2012');
    console.log('- Status: Pre-production development');
    console.log('- Innovation: Gyroscopic self-balancing');
    console.log('- Configuration: Fully enclosed, side-by-side seating');
    console.log('- Power: Electric (40 kW dual motors)');
    console.log('- Range: 320 km / 200 miles');
    console.log('- Target price: $32,000 USD');
    console.log('- Production: TBD (seeking partners)');
    
    console.log('\nKey Features:');
    results.metadata.summary.unique_features.forEach(feature => {
      console.log(`- ${feature}`);
    });
    
    if (results.metadata.sources.length > 0) {
      console.log('\nData sources:');
      results.metadata.sources.forEach(source => {
        console.log(`- ${source}`);
      });
    }
    
  } catch (error) {
    console.error('Fatal error in Lit Motors scraper:', error);
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