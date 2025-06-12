#!/usr/bin/env node
import pg from 'pg';
import chalk from 'chalk';
import { default as makerIds } from './maker_ids.js';

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
});

async function checkKZBrands() {
  try {
    // Get all brands from K-Z that have been scraped
    const scrapedResult = await pool.query(`
      SELECT normalized_name, name, data_quality_score, scraped_at 
      FROM bicycle_brands 
      WHERE normalized_name >= 'k' AND normalized_name < 'zz'
      ORDER BY normalized_name
    `);
    
    console.log(chalk.bold('\n✅ K-Z Brands Already Scraped (' + scrapedResult.rows.length + '):\n'));
    
    const scrapedNames = new Set();
    for (const row of scrapedResult.rows) {
      console.log(`  • ${row.name} (${row.normalized_name}) - Quality: ${row.data_quality_score}`);
      scrapedNames.add(row.normalized_name);
    }
    
    // Get all K-Z brands from maker_ids
    const kzBrands = Object.entries(makerIds)
      .filter(([id, name]) => id >= 'k' && id < 'zz')
      .sort();
    
    console.log(chalk.bold('\n❌ K-Z Brands NOT Scraped Yet (' + (kzBrands.length - scrapedResult.rows.length) + '):\n'));
    
    const unscrapedBrands = [];
    for (const [id, name] of kzBrands) {
      if (!scrapedNames.has(id)) {
        unscrapedBrands.push({ id, name });
        console.log(`  • ${name} (${id})`);
      }
    }
    
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(`  Total K-Z brands: ${kzBrands.length}`);
    console.log(`  Scraped: ${scrapedResult.rows.length}`);
    console.log(`  Remaining: ${kzBrands.length - scrapedResult.rows.length}`);
    
    // Save unscraped brands to a file for easy reference
    if (unscrapedBrands.length > 0) {
      const fs = await import('fs/promises');
      const content = unscrapedBrands.map(b => `${b.id}: ${b.name}`).join('\n');
      await fs.writeFile('./unscraped_kz_brands.txt', content);
      console.log(chalk.green('\n📝 Saved unscraped K-Z brands to unscraped_kz_brands.txt'));
    }
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
  } finally {
    await pool.end();
  }
}

checkKZBrands();