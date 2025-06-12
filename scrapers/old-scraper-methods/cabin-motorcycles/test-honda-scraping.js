#!/usr/bin/env node

/**
 * Test Honda Gyro Comprehensive Scraping
 * Tests Japanese website scraping with encoding support
 */

const { scrapeHondaFull } = require('./honda/full-scraper');
const { scrapeHondaJapan } = require('./honda/honda-japan-scraper');
const { scrapeHondaDatabases } = require('./honda/motorcycle-db-scraper');

async function testHondaScraping() {
  console.log('🧪 Testing Honda Gyro Comprehensive Scraping');
  console.log('=' .repeat(60));
  
  // Test 1: Honda Japan website with Japanese encoding
  console.log('\n📋 Test 1: Honda Japan Official Website');
  console.log('-'.repeat(40));
  
  try {
    console.log('Testing Japanese encoding support...\n');
    const japanResults = await scrapeHondaJapan({ debug: true });
    
    console.log('\nHonda Japan Results:');
    console.log(`- Models found: ${japanResults.models.length}`);
    console.log(`- Sources scraped: ${japanResults.sources.length}`);
    console.log(`- Errors: ${japanResults.errors.length}`);
    
    if (japanResults.sources.length > 0) {
      console.log('\nSources accessed:');
      japanResults.sources.forEach(source => {
        console.log(`  - ${source.name}: ${source.count} models`);
        console.log(`    URL: ${source.url}`);
      });
    }
    
    if (japanResults.models.length > 0) {
      console.log('\nSample models from Honda Japan:');
      japanResults.models.slice(0, 3).forEach(model => {
        console.log(`\n  ${model.model} (${model.package || 'Current'}):`);
        console.log(`    - Year: ${model.year || 'Current model'}`);
        console.log(`    - Source: ${model.specifications.source}`);
        
        // Show some Japanese specs if present
        const japaneseKeys = Object.keys(model.specifications).filter(k => k.endsWith('_ja'));
        if (japaneseKeys.length > 0) {
          console.log(`    - Japanese labels found: ${japaneseKeys.length}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Honda Japan test failed:', error.message);
  }

  // Test 2: Motorcycle databases
  console.log('\n\n📋 Test 2: Motorcycle Specification Databases');
  console.log('-'.repeat(40));
  
  try {
    const dbResults = await scrapeHondaDatabases({ debug: true });
    
    console.log('\nDatabase Results:');
    console.log(`- Total models: ${dbResults.models.length}`);
    console.log(`- Sources used: ${dbResults.sources.length}`);
    console.log(`- Errors: ${dbResults.errors.length}`);
    
    if (dbResults.sources.length > 0) {
      console.log('\nDatabases scraped:');
      dbResults.sources.forEach(source => {
        console.log(`  - ${source.name}: ${source.count} models`);
      });
    }
    
    // Show year distribution
    if (dbResults.models.length > 0) {
      const yearDist = {};
      dbResults.models.forEach(model => {
        if (model.year) {
          const decade = Math.floor(model.year / 10) * 10;
          yearDist[`${decade}s`] = (yearDist[`${decade}s`] || 0) + 1;
        }
      });
      
      console.log('\nYear distribution:');
      Object.entries(yearDist).sort().forEach(([decade, count]) => {
        console.log(`  - ${decade}: ${count} models`);
      });
    }
    
  } catch (error) {
    console.error('Database test failed:', error.message);
  }

  // Test 3: Full comprehensive scraping
  console.log('\n\n📋 Test 3: Full Comprehensive Scraping');
  console.log('-'.repeat(40));
  
  try {
    const fullResults = await scrapeHondaFull({
      useJapanSite: true,
      useDatabases: true,
      generateHistorical: true,
      debug: true
    });
    
    console.log('\nFull Scraping Results:');
    console.log(`- Total unique models: ${fullResults.models.length}`);
    console.log(`- Methods used: ${fullResults.metadata.methods_used.join(', ')}`);
    console.log(`- Confidence score: ${fullResults.metadata.confidence_score.toFixed(2)}%`);
    console.log(`- Completeness: ${fullResults.metadata.completeness_score.toFixed(2)}%`);
    
    // Show model distribution
    if (fullResults.metadata.model_distribution) {
      const dist = fullResults.metadata.model_distribution;
      
      console.log('\nModel distribution by generation:');
      Object.entries(dist.by_generation).forEach(([gen, count]) => {
        console.log(`  - ${gen}: ${count} models`);
      });
      
      console.log('\nModel distribution by source:');
      Object.entries(dist.by_source).slice(0, 5).forEach(([source, count]) => {
        console.log(`  - ${source}: ${count} models`);
      });
    }
    
    // Show high-quality models
    const highQuality = fullResults.models
      .filter(m => m.data_quality && m.data_quality.score >= 70)
      .sort((a, b) => b.data_quality.score - a.data_quality.score);
    
    if (highQuality.length > 0) {
      console.log('\nHighest quality data:');
      highQuality.slice(0, 3).forEach(model => {
        console.log(`\n  ${model.model} ${model.package || ''} (${model.year || 'Current'}):`);
        console.log(`    - Quality Score: ${model.data_quality.score}%`);
        console.log(`    - Factors: ${model.data_quality.factors.join(', ')}`);
        console.log(`    - Sources: ${model.sources.join(', ')}`);
        if (model.generation) {
          console.log(`    - Generation: ${model.generation}`);
        }
      });
    }
    
    // Show electric models if found
    const electricModels = fullResults.models.filter(m => 
      m.model.includes('e:') || m.specifications?.propulsion === 'electric'
    );
    
    if (electricModels.length > 0) {
      console.log(`\nElectric models found: ${electricModels.length}`);
      electricModels.forEach(model => {
        console.log(`  - ${model.model} (${model.year || 'Current'})`);
        if (model.specifications?.range_km) {
          console.log(`    Range: ${model.specifications.range_km} km`);
        }
      });
    }
    
  } catch (error) {
    console.error('Full scraping test failed:', error.message);
  }

  // Test 4: Quick test without historical generation
  console.log('\n\n📋 Test 4: Quick Test (Current Models Only)');
  console.log('-'.repeat(40));
  
  try {
    const quickResults = await scrapeHondaFull({
      useJapanSite: true,
      useDatabases: true,
      generateHistorical: false, // Skip historical generation
      debug: false
    });
    
    console.log(`Models found: ${quickResults.models.length}`);
    console.log(`Methods used: ${quickResults.metadata.methods_used.join(', ')}`);
    console.log(`Time taken: ${
      (new Date(quickResults.metadata.end_time) - new Date(quickResults.metadata.start_time)) / 1000
    }s`);
    
  } catch (error) {
    console.error('Quick test failed:', error.message);
  }

  console.log('\n\n✅ All Honda Gyro scraping tests complete!');
  console.log('\n💡 Tips:');
  console.log('- Japanese encoding is handled automatically');
  console.log('- Historical generation fills in missing years');
  console.log('- Multiple sources increase data quality');
  console.log('- Check debug/reports/ for detailed reports and CSV exports');
}

// Run tests
if (require.main === module) {
  testHondaScraping().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testHondaScraping };