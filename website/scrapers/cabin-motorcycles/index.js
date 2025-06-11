const { scrapePeraves } = require('./peraves/scraper');
const { upsertMotorcycle, logScrapingActivity, pool } = require('./shared/database');

// Import other scrapers as they are developed
// const { scrapeBMW } = require('./bmw/scraper');
// const { scrapeHonda } = require('./honda/scraper');
// const { scrapeLitMotors } = require('./lit-motors/scraper');

async function scrapeAll() {
  console.log('Starting Cabin Motorcycles Scraper');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  const summary = {
    total: 0,
    byManufacturer: {},
    errors: []
  };
  
  try {
    // Scrape Peraves
    console.log('\n[1/4] Scraping Peraves...');
    try {
      const peravesResults = await scrapePeraves();
      const peravesCount = peravesResults.historical.length + peravesResults.current.length;
      
      // Insert models
      let inserted = 0;
      for (const model of [...peravesResults.historical, ...peravesResults.current]) {
        try {
          await upsertMotorcycle(model);
          inserted++;
        } catch (error) {
          summary.errors.push({
            manufacturer: 'Peraves',
            model: `${model.year} ${model.model}`,
            error: error.message
          });
        }
      }
      
      summary.byManufacturer['Peraves'] = inserted;
      summary.total += inserted;
      console.log(`✓ Peraves: ${inserted}/${peravesCount} models processed`);
      
    } catch (error) {
      console.error('✗ Peraves scraper failed:', error.message);
      summary.errors.push({
        manufacturer: 'Peraves',
        error: error.message
      });
    }
    
    // Placeholder for other manufacturers
    console.log('\n[2/4] BMW C1 scraper - Not yet implemented');
    console.log('[3/4] Honda Gyro Canopy scraper - Not yet implemented');
    console.log('[4/4] Lit Motors scraper - Not yet implemented');
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('SCRAPING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total models processed: ${summary.total}`);
    console.log('\nBy Manufacturer:');
    for (const [manufacturer, count] of Object.entries(summary.byManufacturer)) {
      console.log(`  ${manufacturer}: ${count} models`);
    }
    
    if (summary.errors.length > 0) {
      console.log(`\nErrors encountered: ${summary.errors.length}`);
      summary.errors.forEach(err => {
        console.log(`  - ${err.manufacturer} ${err.model || ''}: ${err.error}`);
      });
    }
    
    // Log overall activity
    await logScrapingActivity(
      'cabin-motorcycles-all',
      summary.total,
      summary.errors.length > 0 ? 'completed_with_errors' : 'success',
      summary.errors.length > 0 ? JSON.stringify(summary.errors) : null
    );
    
  } catch (error) {
    console.error('\nFatal error in cabin motorcycles scraper:', error);
    await logScrapingActivity(
      'cabin-motorcycles-all',
      0,
      'failed',
      error.message
    );
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const shouldScrapeAll = args.includes('--all');

if (require.main === module) {
  if (shouldScrapeAll) {
    scrapeAll().then(() => {
      console.log('\nScraping completed.');
      process.exit(0);
    }).catch(error => {
      console.error('Scraping failed:', error);
      process.exit(1);
    });
  } else {
    console.log('Cabin Motorcycles Scraper');
    console.log('\nUsage:');
    console.log('  npm start          - Show this help');
    console.log('  npm run scrape:all - Scrape all manufacturers');
    console.log('  npm run scrape:peraves - Scrape only Peraves');
    console.log('\nOr:');
    console.log('  node index.js --all');
  }
}

module.exports = { scrapeAll };