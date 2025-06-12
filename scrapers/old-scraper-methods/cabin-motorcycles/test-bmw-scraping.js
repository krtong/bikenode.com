#!/usr/bin/env node

/**
 * Test BMW C1 Comprehensive Scraping
 * Tests Archive.org and motorcycle database scraping
 */

const { scrapeBMWFull } = require('./bmw/full-scraper');
const { scrapeBMWArchive } = require('./bmw/archive-scraper');
const { scrapeBMWDatabases } = require('./bmw/motorcycle-db-scraper');

async function testBMWScraping() {
  console.log('🧪 Testing BMW C1 Comprehensive Scraping');
  console.log('=' .repeat(60));
  
  // Test 1: Archive.org scraping only
  console.log('\n📋 Test 1: Archive.org Historical Data');
  console.log('-'.repeat(40));
  
  try {
    console.log('Searching Archive.org for BMW C1 pages...\n');
    const archiveResults = await scrapeBMWArchive({ debug: true });
    
    console.log('\nArchive.org Results:');
    console.log(`- Snapshots found: ${archiveResults.snapshots.length}`);
    console.log(`- Models extracted: ${archiveResults.models.length}`);
    console.log(`- Errors: ${archiveResults.errors.length}`);
    
    if (archiveResults.snapshots.length > 0) {
      console.log('\nSample snapshots:');
      archiveResults.snapshots.slice(0, 3).forEach(snapshot => {
        console.log(`  - ${snapshot.timestamp.substring(0, 4)}: ${snapshot.url}`);
      });
    }
    
    if (archiveResults.models.length > 0) {
      console.log('\nModels found in archives:');
      archiveResults.models.slice(0, 5).forEach(model => {
        console.log(`  - ${model.model} ${model.variant || ''} (${model.year || 'year unknown'})`);
        console.log(`    Source: ${model.specifications.snapshot_date || 'archive'}`);
      });
    }
    
  } catch (error) {
    console.error('Archive.org test failed:', error.message);
  }

  // Test 2: Motorcycle databases only
  console.log('\n\n📋 Test 2: Motorcycle Specification Databases');
  console.log('-'.repeat(40));
  
  try {
    const dbResults = await scrapeBMWDatabases({ debug: true });
    
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
    
    if (dbResults.models.length > 0) {
      console.log('\nSample models with specifications:');
      dbResults.models.slice(0, 3).forEach(model => {
        console.log(`\n  ${model.model} ${model.variant || ''} (${model.year}):`);
        const specs = model.specifications;
        if (specs.displacement_cc) console.log(`    - Displacement: ${specs.displacement_cc}cc`);
        if (specs.power) console.log(`    - Power: ${specs.power}`);
        if (specs.top_speed) console.log(`    - Top Speed: ${specs.top_speed}`);
        console.log(`    - Source: ${specs.source}`);
      });
    }
    
  } catch (error) {
    console.error('Database test failed:', error.message);
  }

  // Test 3: Full comprehensive scraping
  console.log('\n\n📋 Test 3: Full Comprehensive Scraping');
  console.log('-'.repeat(40));
  
  try {
    const fullResults = await scrapeBMWFull({
      useWikipedia: true,
      useArchive: true,
      useDatabases: true,
      debug: true
    });
    
    console.log('\nFull Scraping Results:');
    console.log(`- Total unique models: ${fullResults.models.length}`);
    console.log(`- Methods used: ${fullResults.metadata.methods_used.join(', ')}`);
    console.log(`- Confidence score: ${fullResults.metadata.confidence_score.toFixed(2)}%`);
    console.log(`- Completeness: ${fullResults.metadata.completeness_score.toFixed(2)}%`);
    console.log(`- Production years: ${fullResults.metadata.production_years.join(', ')}`);
    
    // Show variant distribution
    if (fullResults.models.length > 0) {
      const variants = {};
      fullResults.models.forEach(model => {
        const variant = model.variant_display || 'Standard';
        variants[variant] = (variants[variant] || 0) + 1;
      });
      
      console.log('\nVariants found:');
      Object.entries(variants).forEach(([variant, count]) => {
        console.log(`  - ${variant}: ${count} entries`);
      });
      
      // Show models with best data quality
      const highQuality = fullResults.models
        .filter(m => m.data_quality && m.data_quality.score >= 70)
        .sort((a, b) => b.data_quality.score - a.data_quality.score);
      
      if (highQuality.length > 0) {
        console.log('\nHighest quality data:');
        highQuality.slice(0, 3).forEach(model => {
          console.log(`\n  ${model.variant_display} (${model.year}):`);
          console.log(`    - Quality Score: ${model.data_quality.score}%`);
          console.log(`    - Factors: ${model.data_quality.factors.join(', ')}`);
          console.log(`    - Sources: ${model.sources.join(', ')}`);
          if (model.historical_context) {
            console.log(`    - Context: ${model.historical_context.significance}`);
          }
        });
      }
    }
    
    // Show source contribution
    if (fullResults.sources.length > 0) {
      console.log('\nData source contributions:');
      fullResults.sources.forEach(source => {
        console.log(`  - ${source.name}: ${source.count} models`);
        if (source.databases) {
          console.log(`    Databases: ${source.databases.join(', ')}`);
        }
        if (source.snapshots_analyzed) {
          console.log(`    Snapshots analyzed: ${source.snapshots_analyzed}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Full scraping test failed:', error.message);
  }

  // Test 4: Quick test without Archive.org (faster)
  console.log('\n\n📋 Test 4: Quick Test (No Archive.org)');
  console.log('-'.repeat(40));
  
  try {
    const quickResults = await scrapeBMWFull({
      useWikipedia: true,
      useArchive: false,  // Skip Archive.org for speed
      useDatabases: true,
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

  console.log('\n\n✅ All BMW C1 scraping tests complete!');
  console.log('\n💡 Tips:');
  console.log('- Archive.org scraping may be slow but provides historical data');
  console.log('- Motorcycle databases provide detailed specifications');
  console.log('- Multiple sources increase confidence in data accuracy');
  console.log('- Check debug/reports/ for detailed reports and CSV exports');
}

// Run tests
if (require.main === module) {
  testBMWScraping().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testBMWScraping };