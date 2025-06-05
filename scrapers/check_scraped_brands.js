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

async function checkScrapedBrands() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    const result = await pool.query(`
      SELECT 
        name, 
        year_established, 
        headquarters_location, 
        website_url, 
        wikipedia_url, 
        data_quality_score,
        scraped_at
      FROM bicycle_brands 
      ORDER BY id DESC 
      LIMIT 5
    `);
    
    console.log(chalk.bold('\n📊 Recently Scraped Brands:\n'));
    
    for (const brand of result.rows) {
      console.log(chalk.blue(`${brand.name}:`));
      console.log(`  Quality Score: ${brand.data_quality_score}`);
      console.log(`  Year Founded: ${brand.year_established || 'N/A'}`);
      console.log(`  Location: ${brand.headquarters_location || 'N/A'}`);
      console.log(`  Website: ${brand.website_url || 'N/A'}`);
      console.log(`  Wikipedia: ${brand.wikipedia_url || 'N/A'}`);
      console.log(`  Scraped: ${brand.scraped_at}`);
      console.log('');
    }
    
    // Summary stats
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(year_established) as with_year,
        COUNT(headquarters_location) as with_location,
        COUNT(website_url) as with_website,
        COUNT(wikipedia_url) as with_wikipedia,
        AVG(data_quality_score::numeric) as avg_quality
      FROM bicycle_brands
    `);
    
    const s = stats.rows[0];
    console.log(chalk.bold('📈 Overall Field Population Rates:'));
    console.log(`  Total brands: ${s.total}`);
    console.log(`  Year founded: ${s.with_year}/${s.total} (${Math.round(s.with_year/s.total*100)}%)`);
    console.log(`  Location: ${s.with_location}/${s.total} (${Math.round(s.with_location/s.total*100)}%)`);
    console.log(`  Website: ${s.with_website}/${s.total} (${Math.round(s.with_website/s.total*100)}%)`);
    console.log(`  Wikipedia: ${s.with_wikipedia}/${s.total} (${Math.round(s.with_wikipedia/s.total*100)}%)`);
    console.log(`  Average quality: ${parseFloat(s.avg_quality).toFixed(2)}`);
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
  } finally {
    await pool.end();
  }
}

checkScrapedBrands();