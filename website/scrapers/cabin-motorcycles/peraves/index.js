const { scrapePeraves } = require('./scraper');
const { upsertMotorcycle, logScrapingActivity } = require('../shared/database');

async function main() {
  console.log('Starting Peraves scraper...');
  console.log('='.repeat(50));
  
  let modelsInserted = 0;
  let errors = [];
  
  try {
    // Scrape Peraves models
    const results = await scrapePeraves();
    
    // Process historical models
    console.log('\nInserting historical models...');
    for (const model of results.historical) {
      try {
        await upsertMotorcycle(model);
        console.log(`✓ Inserted: ${model.year} ${model.make} ${model.model} ${model.package || ''}`);
        modelsInserted++;
      } catch (error) {
        console.error(`✗ Failed to insert ${model.year} ${model.model}:`, error.message);
        errors.push({ model, error: error.message });
      }
    }
    
    // Process current models
    console.log('\nInserting current models...');
    for (const model of results.current) {
      try {
        await upsertMotorcycle(model);
        console.log(`✓ Inserted: ${model.year} ${model.make} ${model.model} ${model.package || ''}`);
        modelsInserted++;
      } catch (error) {
        console.error(`✗ Failed to insert ${model.year} ${model.model}:`, error.message);
        errors.push({ model, error: error.message });
      }
    }
    
    // Log scraping activity
    await logScrapingActivity(
      'Peraves',
      modelsInserted,
      errors.length > 0 ? 'completed_with_errors' : 'success',
      errors.length > 0 ? JSON.stringify(errors) : null
    );
    
    console.log('\n' + '='.repeat(50));
    console.log(`Scraping completed!`);
    console.log(`Models inserted: ${modelsInserted}`);
    console.log(`Errors: ${errors.length}`);
    
  } catch (error) {
    console.error('Fatal error in Peraves scraper:', error);
    await logScrapingActivity('Peraves', 0, 'failed', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };