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

async function checkBrandData() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    // Get all scraped brands
    const brands = await pool.query(`
      SELECT 
        id, name, year_established, founder, headquarters_location,
        website_url, wikipedia_url, logo_url, data_quality_score,
        bike_count_in_db, company_description
      FROM bicycle_brands 
      ORDER BY data_quality_score DESC, id
    `);
    
    console.log(chalk.blue(`📊 Scraped Brand Data (${brands.rows.length} brands):\n`));
    
    for (const brand of brands.rows) {
      console.log(chalk.bold(`🚲 ${brand.name} (ID: ${brand.id})`));
      console.log(`  Quality Score: ${chalk.yellow(brand.data_quality_score)}`);
      console.log(`  Bikes in DB: ${chalk.blue(brand.bike_count_in_db)}`);
      
      if (brand.year_established) {
        console.log(`  Founded: ${chalk.green(brand.year_established)}`);
      }
      
      if (brand.founder) {
        console.log(`  Founder: ${chalk.cyan(brand.founder)}`);
      }
      
      if (brand.headquarters_location) {
        console.log(`  HQ: ${chalk.magenta(brand.headquarters_location)}`);
      }
      
      if (brand.website_url) {
        console.log(`  Website: ${chalk.blue(brand.website_url.substring(0, 50))}...`);
      }
      
      if (brand.wikipedia_url) {
        console.log(`  Wikipedia: ${chalk.blue(brand.wikipedia_url.substring(0, 50))}...`);
      }
      
      if (brand.logo_url) {
        console.log(`  Logo: ${chalk.green('Available')}`);
      }
      
      if (brand.company_description) {
        console.log(`  Description: ${chalk.gray(brand.company_description.substring(0, 100))}...`);
      }
      
      console.log(''); // Empty line between brands
    }
    
    // Show statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(year_established) as has_year,
        COUNT(founder) as has_founder,
        COUNT(headquarters_location) as has_headquarters,
        COUNT(website_url) as has_website,
        COUNT(wikipedia_url) as has_wikipedia,
        COUNT(logo_url) as has_logo,
        AVG(data_quality_score) as avg_quality
      FROM bicycle_brands
    `);
    
    const stat = stats.rows[0];
    console.log(chalk.bold('📈 Data Coverage Statistics:'));
    console.log(`  Total brands: ${chalk.yellow(stat.total)}`);
    console.log(`  Have founding year: ${chalk.green(stat.has_year)} (${((stat.has_year/stat.total)*100).toFixed(1)}%)`);
    console.log(`  Have founder info: ${chalk.green(stat.has_founder)} (${((stat.has_founder/stat.total)*100).toFixed(1)}%)`);
    console.log(`  Have headquarters: ${chalk.green(stat.has_headquarters)} (${((stat.has_headquarters/stat.total)*100).toFixed(1)}%)`);
    console.log(`  Have website: ${chalk.green(stat.has_website)} (${((stat.has_website/stat.total)*100).toFixed(1)}%)`);
    console.log(`  Have Wikipedia: ${chalk.green(stat.has_wikipedia)} (${((stat.has_wikipedia/stat.total)*100).toFixed(1)}%)`);
    console.log(`  Have logo: ${chalk.green(stat.has_logo)} (${((stat.has_logo/stat.total)*100).toFixed(1)}%)`);
    console.log(`  Average quality score: ${chalk.yellow(parseFloat(stat.avg_quality).toFixed(2))}`);
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
  } finally {
    await pool.end();
  }
}

checkBrandData();