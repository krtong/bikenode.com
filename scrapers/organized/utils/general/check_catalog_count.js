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

async function checkCounts() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    const catalogCount = await pool.query('SELECT COUNT(*) FROM bikes_catalog');
    const bikesDataCount = await pool.query('SELECT COUNT(*) FROM bikes_data');
    const bikesDataWithDataCount = await pool.query('SELECT COUNT(*) FROM bikes_data WHERE comprehensive_data IS NOT NULL');
    const urlCount = await pool.query(`SELECT COUNT(*) FROM bikes_data WHERE comprehensive_data->'pageInfo'->>'url' IS NOT NULL`);
    
    // Check for bikes_catalog entries without bikes_data
    const missingInBikesData = await pool.query(`
      SELECT COUNT(*) FROM bikes_catalog bc 
      LEFT JOIN bikes_data bd ON bc.keyid = bd.keyid 
      WHERE bd.keyid IS NULL
    `);
    
    // Check max keyid
    const maxKeyid = await pool.query('SELECT MAX(keyid) FROM bikes_catalog');
    
    console.log(chalk.blue('📊 Database Counts:'));
    console.log(`  Total bikes_catalog: ${chalk.yellow(catalogCount.rows[0].count)}`);
    console.log(`  Total bikes_data: ${chalk.yellow(bikesDataCount.rows[0].count)}`);
    console.log(`  bikes_data with comprehensive_data: ${chalk.yellow(bikesDataWithDataCount.rows[0].count)}`);
    console.log(`  bikes_data with URLs: ${chalk.yellow(urlCount.rows[0].count)}`);
    console.log(`  bikes_catalog missing from bikes_data: ${chalk.yellow(missingInBikesData.rows[0].count)}`);
    console.log(`  Max KeyID in bikes_catalog: ${chalk.yellow(maxKeyid.rows[0].max)}`);
    
    // Sample of bikes_catalog structure
    const sample = await pool.query('SELECT keyid, make, model, year, variant FROM bikes_catalog ORDER BY keyid LIMIT 5');
    console.log(chalk.blue('\n📋 Sample bikes_catalog records:'));
    for (const row of sample.rows) {
      console.log(`  KeyID ${row.keyid}: ${row.make} ${row.model} ${row.year} - ${row.variant}`);
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
  } finally {
    await pool.end();
  }
}

checkCounts();