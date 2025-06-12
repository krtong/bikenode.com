#!/usr/bin/env node
import pg from 'pg';
import chalk from 'chalk';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
};

async function compareTablesProgress() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(chalk.bold('🔍 Comparing bikes_data vs bikes_data_2 Progress\n'));
    
    // Count total records in each table
    const bikesDataCount = await pool.query('SELECT COUNT(*) FROM bikes_data WHERE comprehensive_data IS NOT NULL');
    const bikesData2Count = await pool.query('SELECT COUNT(*) FROM bikes_data_2');
    const bikesTableCount = await pool.query('SELECT COUNT(*) FROM bikes');
    
    console.log(chalk.blue('📊 Record Counts:'));
    console.log(`  bikes_data (with comprehensive_data): ${chalk.yellow(bikesDataCount.rows[0].count)}`);
    console.log(`  bikes_data_2 (scraped/extracted): ${chalk.yellow(bikesData2Count.rows[0].count)}`);
    console.log(`  bikes (clean structured): ${chalk.yellow(bikesTableCount.rows[0].count)}`);
    
    const totalOriginal = parseInt(bikesDataCount.rows[0].count);
    const totalProcessed = parseInt(bikesData2Count.rows[0].count);
    const progressPercent = totalOriginal > 0 ? ((totalProcessed / totalOriginal) * 100).toFixed(1) : 0;
    
    console.log(`\n📈 Progress: ${chalk.green(progressPercent + '%')} (${totalProcessed}/${totalOriginal})`);
    
    // Check data quality comparison
    console.log(chalk.blue('\n🔍 Data Quality Analysis:'));
    
    // Sample a few records to compare data richness
    const sampleComparison = await pool.query(`
      SELECT 
        bd.keyid,
        bc.make,
        bc.model,
        bc.year,
        bd.comprehensive_data->'pageInfo'->>'url' as original_url,
        bd2.url as scraped_url,
        bd2.has_embedded_data,
        CASE 
          WHEN bd2.extracted_data IS NOT NULL THEN jsonb_typeof(bd2.extracted_data)
          ELSE NULL 
        END as extracted_data_type,
        CASE 
          WHEN bd2.extracted_data IS NOT NULL THEN array_length(array(SELECT jsonb_object_keys(bd2.extracted_data)), 1)
          ELSE NULL 
        END as extracted_field_count,
        CASE 
          WHEN bd.comprehensive_data IS NOT NULL THEN array_length(array(SELECT jsonb_object_keys(bd.comprehensive_data)), 1)
          ELSE NULL 
        END as original_field_count
      FROM bikes_data bd
      JOIN bikes_catalog bc ON bd.keyid = bc.keyid
      LEFT JOIN bikes_data_2 bd2 ON bd.keyid = bd2.keyid
      WHERE bd.comprehensive_data IS NOT NULL
      ORDER BY bd.keyid
      LIMIT 10
    `);
    
    console.log('\n📋 Sample Data Comparison (first 10 records):');
    for (const row of sampleComparison.rows) {
      const status = row.scraped_url ? '✅' : '⏳';
      console.log(`\n${status} KeyID ${row.keyid}: ${row.make} ${row.model} ${row.year}`);
      console.log(`  Original fields: ${row.original_field_count || 'N/A'}`);
      if (row.scraped_url) {
        console.log(`  Extracted fields: ${row.extracted_field_count || 'N/A'}`);
        console.log(`  Has embedded data: ${row.has_embedded_data ? '✅' : '❌'}`);
        console.log(`  URL match: ${row.original_url === row.scraped_url ? '✅' : '❌'}`);
      } else {
        console.log(`  Status: ${chalk.yellow('Not yet processed')}`);
      }
    }
    
    // Check for data enhancement (bikes_data_2 having more info than original)
    const enhancementCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_enhanced,
        AVG(CASE WHEN bd2.has_embedded_data THEN 1 ELSE 0 END) as embedded_data_rate
      FROM bikes_data bd
      JOIN bikes_data_2 bd2 ON bd.keyid = bd2.keyid
      WHERE bd.comprehensive_data IS NOT NULL
    `);
    
    if (enhancementCheck.rows.length > 0) {
      const enhancedCount = enhancementCheck.rows[0].total_enhanced;
      const embeddedRate = (parseFloat(enhancementCheck.rows[0].embedded_data_rate) * 100).toFixed(1);
      
      console.log(chalk.blue('\n🚀 Data Enhancement:'));
      console.log(`  Records with enhanced data: ${chalk.green(enhancedCount)}`);
      console.log(`  Embedded data success rate: ${chalk.green(embeddedRate + '%')}`);
    }
    
    // Check recent scraping activity
    const recentActivity = await pool.query(`
      SELECT 
        DATE(scraped_at) as scrape_date,
        COUNT(*) as records_scraped
      FROM bikes_data_2 
      WHERE scraped_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(scraped_at)
      ORDER BY scrape_date DESC
    `);
    
    if (recentActivity.rows.length > 0) {
      console.log(chalk.blue('\n📅 Recent Activity (last 7 days):'));
      for (const row of recentActivity.rows) {
        console.log(`  ${row.scrape_date}: ${chalk.green(row.records_scraped)} records`);
      }
    }
    
    // Find gaps that still need processing
    const remainingWork = await pool.query(`
      SELECT COUNT(*) as remaining
      FROM bikes_data bd
      LEFT JOIN bikes_data_2 bd2 ON bd.keyid = bd2.keyid
      WHERE bd.comprehensive_data IS NOT NULL
        AND bd.comprehensive_data->'pageInfo'->>'url' IS NOT NULL
        AND bd2.keyid IS NULL
    `);
    
    const remaining = parseInt(remainingWork.rows[0].remaining);
    console.log(chalk.blue('\n⏳ Remaining Work:'));
    console.log(`  Records still to process: ${chalk.yellow(remaining)}`);
    console.log(`  Estimated completion: ${remaining === 0 ? chalk.green('COMPLETE!') : chalk.yellow(remaining + ' records remaining')}`);
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
  } finally {
    await pool.end();
  }
}

compareTablesProgress();