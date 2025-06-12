const { scrapePeraves } = require('./peraves/scraper');
const { scrapeBMWC1 } = require('./bmw/scraper');
const { scrapeHondaGyro } = require('./honda/scraper');
const { scrapeLitMotors } = require('./lit-motors/scraper');
const { upsertMotorcycle, startScrapingLog, completeScrapingLog, pool } = require('./shared/database');

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
      const peravesCount = peravesResults.models.length;
      
      // Show metadata
      console.log(`   Source: ${peravesResults.metadata.source}`);
      if (peravesResults.metadata.source === 'seed_data') {
        console.warn('   ⚠️  Using seed data - real scraping failed!');
      }
      
      // Insert models
      let inserted = 0;
      for (const model of peravesResults.models) {
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
    
    // Scrape BMW C1
    console.log('\n[2/4] Scraping BMW C1...');
    try {
      const bmwResults = await scrapeBMWC1();
      const bmwCount = bmwResults.models.length;
      
      // Insert models
      let bmwInserted = 0;
      for (const model of bmwResults.models) {
        try {
          await upsertMotorcycle(model);
          bmwInserted++;
        } catch (error) {
          summary.errors.push({
            manufacturer: 'BMW',
            model: `${model.year} ${model.model} ${model.package}`,
            error: error.message
          });
        }
      }
      
      summary.byManufacturer['BMW'] = bmwInserted;
      summary.total += bmwInserted;
      console.log(`✓ BMW: ${bmwInserted}/${bmwCount} models processed`);
      
    } catch (error) {
      console.error('✗ BMW scraper failed:', error.message);
      summary.errors.push({
        manufacturer: 'BMW',
        error: error.message
      });
    }
    
    // Scrape Honda Gyro Canopy
    console.log('\n[3/4] Scraping Honda Gyro Canopy...');
    try {
      const hondaResults = await scrapeHondaGyro();
      const hondaCount = hondaResults.models.length;
      
      // Insert models
      let hondaInserted = 0;
      for (const model of hondaResults.models) {
        try {
          await upsertMotorcycle(model);
          hondaInserted++;
        } catch (error) {
          summary.errors.push({
            manufacturer: 'Honda',
            model: `${model.year} ${model.model} ${model.package}`,
            error: error.message
          });
        }
      }
      
      summary.byManufacturer['Honda'] = hondaInserted;
      summary.total += hondaInserted;
      console.log(`✓ Honda: ${hondaInserted}/${hondaCount} models processed`);
      
    } catch (error) {
      console.error('✗ Honda scraper failed:', error.message);
      summary.errors.push({
        manufacturer: 'Honda',
        error: error.message
      });
    }
    
    // Scrape Lit Motors
    console.log('\n[4/4] Scraping Lit Motors C-1...');
    try {
      const litResults = await scrapeLitMotors();
      const litCount = litResults.models.length;
      
      // Insert models
      let litInserted = 0;
      for (const model of litResults.models) {
        try {
          await upsertMotorcycle(model);
          litInserted++;
        } catch (error) {
          summary.errors.push({
            manufacturer: 'Lit Motors',
            model: `${model.year} ${model.model}`,
            error: error.message
          });
        }
      }
      
      summary.byManufacturer['Lit Motors'] = litInserted;
      summary.total += litInserted;
      console.log(`✓ Lit Motors: ${litInserted}/${litCount} models processed`);
      
    } catch (error) {
      console.error('✗ Lit Motors scraper failed:', error.message);
      summary.errors.push({
        manufacturer: 'Lit Motors',
        error: error.message
      });
    }
    
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