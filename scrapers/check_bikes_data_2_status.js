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

async function checkStatus() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    // Check total records and keyid range
    const totalCount = await pool.query('SELECT COUNT(*) as count, MIN(keyid) as min_keyid, MAX(keyid) as max_keyid FROM bikes_data_2');
    
    console.log(chalk.blue('📊 bikes_data_2 Status:'));
    console.log(`  Total records: ${chalk.yellow(totalCount.rows[0].count)}`);
    console.log(`  KeyID range: ${chalk.yellow(totalCount.rows[0].min_keyid)} to ${chalk.yellow(totalCount.rows[0].max_keyid)}`);
    
    // Check for URL duplicates
    const duplicateUrls = await pool.query(`
      SELECT url, COUNT(*) as count 
      FROM bikes_data_2 
      GROUP BY url 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 5
    `);
    
    console.log(chalk.blue('\n🔍 URL Duplicates:'));
    if (duplicateUrls.rows.length > 0) {
      for (const row of duplicateUrls.rows) {
        console.log(`  ${row.url}: ${chalk.red(row.count)} duplicates`);
      }
    } else {
      console.log(`  ${chalk.green('No URL duplicates found')}`);
    }
    
    // Check for keyid gaps
    const gapCheck = await pool.query(`
      SELECT keyid + 1 as gap_start
      FROM bikes_data_2 bd1
      WHERE NOT EXISTS (
        SELECT 1 FROM bikes_data_2 bd2 
        WHERE bd2.keyid = bd1.keyid + 1
      )
      AND keyid < (SELECT MAX(keyid) FROM bikes_data_2)
      ORDER BY keyid
      LIMIT 5
    `);
    
    console.log(chalk.blue('\n🔍 KeyID Gaps (first 5):'));
    if (gapCheck.rows.length > 0) {
      for (const row of gapCheck.rows) {
        console.log(`  Gap starting at: ${chalk.yellow(row.gap_start)}`);
      }
    } else {
      console.log(`  ${chalk.green('No keyid gaps found')}`);
    }
    
    // Sample recent records
    const recentRecords = await pool.query(`
      SELECT keyid, url, scraped_at, has_embedded_data
      FROM bikes_data_2 
      ORDER BY keyid DESC 
      LIMIT 5
    `);
    
    console.log(chalk.blue('\n📋 Most Recent Records:'));
    for (const row of recentRecords.rows) {
      console.log(`  KeyID ${row.keyid}: ${row.url.substring(0, 60)}... (${row.scraped_at})`);
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
  } finally {
    await pool.end();
  }
}

checkStatus();