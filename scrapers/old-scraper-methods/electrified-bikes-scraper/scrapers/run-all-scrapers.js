const fs = require('fs').promises;
const path = require('path');

// Import all scrapers
const scrapers = [
  require('./segway-scraper'),
  require('./rawrr-scraper'),
  require('./eridepro-scraper'),
  require('./arctic-leopard-scraper'),
  require('./rev-rides-scraper'),
  require('./happyrun-scraper'),
  require('./electric-bike-review-scraper')
];

async function runAllScrapers() {
  console.log('🚀 Starting Electrified Bikes Scraper Suite');
  console.log('=' .repeat(50));
  
  const results = {
    summary: {
      totalBrands: 0,
      totalModels: 0,
      totalErrors: 0,
      successfulBrands: [],
      failedBrands: []
    },
    brandResults: {}
  };
  
  // Run scrapers sequentially to avoid overwhelming sites
  for (const ScraperClass of scrapers) {
    const scraper = new ScraperClass();
    console.log(`\n📋 Running ${scraper.brand} scraper...`);
    console.log('-'.repeat(40));
    
    try {
      const brandResults = await scraper.scrape();
      
      results.brandResults[scraper.brand] = {
        models: brandResults.models.length,
        errors: brandResults.errors.length,
        metadata: brandResults.metadata
      };
      
      if (brandResults.models.length > 0) {
        results.summary.successfulBrands.push(scraper.brand);
        results.summary.totalModels += brandResults.models.length;
      } else {
        results.summary.failedBrands.push(scraper.brand);
      }
      
      results.summary.totalErrors += brandResults.errors.length;
      results.summary.totalBrands++;
      
      // Add a delay between scrapers to be respectful
      console.log(`\n⏳ Waiting 5 seconds before next scraper...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error(`❌ Failed to run ${scraper.brand} scraper:`, error);
      results.summary.failedBrands.push(scraper.brand);
      results.summary.totalErrors++;
    }
  }
  
  // Generate summary report
  console.log('\n\n📊 SCRAPING COMPLETE - SUMMARY REPORT');
  console.log('=' .repeat(50));
  console.log(`Total Brands Scraped: ${results.summary.totalBrands}`);
  console.log(`Successful Brands: ${results.summary.successfulBrands.length}`);
  console.log(`Failed Brands: ${results.summary.failedBrands.length}`);
  console.log(`Total Models Found: ${results.summary.totalModels}`);
  console.log(`Total Errors: ${results.summary.totalErrors}`);
  
  if (results.summary.successfulBrands.length > 0) {
    console.log('\n✅ Successful Brands:');
    for (const brand of results.summary.successfulBrands) {
      const brandData = results.brandResults[brand];
      console.log(`   - ${brand}: ${brandData.models} models`);
    }
  }
  
  if (results.summary.failedBrands.length > 0) {
    console.log('\n❌ Failed Brands:');
    for (const brand of results.summary.failedBrands) {
      console.log(`   - ${brand}`);
    }
  }
  
  // Save summary report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, '../data/reports', `scraping-report-${timestamp}.json`);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  
  console.log(`\n💾 Full report saved to: ${reportPath}`);
  
  // Create consolidated data file
  await consolidateData();
}

async function consolidateData() {
  console.log('\n📦 Consolidating all scraped data...');
  
  const dataDir = path.join(__dirname, '../data/raw');
  const consolidatedData = {
    brands: {},
    metadata: {
      created: new Date().toISOString(),
      totalBrands: 0,
      totalModels: 0
    }
  };
  
  try {
    // Read all brand directories
    const brands = await fs.readdir(dataDir);
    
    for (const brand of brands) {
      const brandPath = path.join(dataDir, brand);
      const stat = await fs.stat(brandPath);
      
      if (stat.isDirectory()) {
        // Read all JSON files in brand directory
        const files = await fs.readdir(brandPath);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        if (jsonFiles.length > 0) {
          // Use the most recent file
          jsonFiles.sort().reverse();
          const latestFile = jsonFiles[0];
          
          const data = JSON.parse(
            await fs.readFile(path.join(brandPath, latestFile), 'utf8')
          );
          
          // Format brand name properly
          const brandName = brand.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          
          consolidatedData.brands[brandName] = {
            models: data.models || [],
            source: data.metadata?.source || 'Unknown',
            lastUpdated: latestFile.match(/\d{4}-\d{2}-\d{2}/) ? 
              latestFile.match(/\d{4}-\d{2}-\d{2}/)[0] : new Date().toISOString()
          };
          
          consolidatedData.metadata.totalModels += (data.models || []).length;
        }
      }
    }
    
    consolidatedData.metadata.totalBrands = Object.keys(consolidatedData.brands).length;
    
    // Save consolidated data
    const consolidatedPath = path.join(__dirname, '../data/final', 'electrified-bikes-database.json');
    await fs.mkdir(path.dirname(consolidatedPath), { recursive: true });
    await fs.writeFile(consolidatedPath, JSON.stringify(consolidatedData, null, 2));
    
    console.log(`✅ Consolidated data saved to: ${consolidatedPath}`);
    console.log(`   Total brands: ${consolidatedData.metadata.totalBrands}`);
    console.log(`   Total models: ${consolidatedData.metadata.totalModels}`);
    
  } catch (error) {
    console.error('❌ Error consolidating data:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runAllScrapers().catch(console.error);
}

module.exports = { runAllScrapers, consolidateData };