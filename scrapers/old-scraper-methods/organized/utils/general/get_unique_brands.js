#!/usr/bin/env node
import pg from 'pg';
import chalk from 'chalk';
import fs from 'fs/promises';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
};

async function getUniqueBrands() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    // Get unique brands from bikes_catalog
    const catalogBrands = await pool.query(`
      SELECT DISTINCT LOWER(make) as brand, COUNT(*) as bike_count
      FROM bikes_catalog 
      WHERE make IS NOT NULL AND make != ''
      GROUP BY LOWER(make)
      ORDER BY bike_count DESC
    `);
    
    // Get unique brands from bikes_data_2 (scraped data)
    const scrapedBrands = await pool.query(`
      SELECT 
        DISTINCT LOWER(extracted_data->>'manufacturer') as brand,
        COUNT(*) as scraped_count
      FROM bikes_data_2 
      WHERE extracted_data->>'manufacturer' IS NOT NULL 
        AND extracted_data->>'manufacturer' != ''
      GROUP BY LOWER(extracted_data->>'manufacturer')
      ORDER BY scraped_count DESC
    `);
    
    console.log(chalk.blue('📊 Bicycle Brands from bikes_catalog:'));
    console.log(`Total unique brands: ${chalk.yellow(catalogBrands.rows.length)}`);
    
    console.log(chalk.blue('\n🏆 Top 20 brands by bike count:'));
    for (const brand of catalogBrands.rows.slice(0, 20)) {
      console.log(`  ${brand.brand}: ${chalk.yellow(brand.bike_count)} bikes`);
    }
    
    console.log(chalk.blue('\n📊 Brands from scraped data (bikes_data_2):'));
    console.log(`Total unique brands: ${chalk.yellow(scrapedBrands.rows.length)}`);
    
    console.log(chalk.blue('\n🏆 Top 20 scraped brands:'));
    for (const brand of scrapedBrands.rows.slice(0, 20)) {
      console.log(`  ${brand.brand}: ${chalk.yellow(brand.scraped_count)} bikes`);
    }
    
    // Create a comprehensive brand list
    const allBrands = new Set();
    catalogBrands.rows.forEach(row => allBrands.add(row.brand));
    scrapedBrands.rows.forEach(row => allBrands.add(row.brand));
    
    const brandList = Array.from(allBrands).sort();
    
    // Save to file for the brand scraper
    await fs.writeFile('brand_list.json', JSON.stringify({
      generated_at: new Date().toISOString(),
      total_brands: brandList.length,
      brands: brandList.map(brand => ({
        name: brand,
        normalized_name: brand.replace(/[^a-z0-9]/g, '_'),
        catalog_count: catalogBrands.rows.find(b => b.brand === brand)?.bike_count || 0,
        scraped_count: scrapedBrands.rows.find(b => b.brand === brand)?.scraped_count || 0
      }))
    }, null, 2));
    
    console.log(chalk.green(`\n✅ Generated brand list with ${brandList.length} unique brands`));
    console.log(chalk.green('✅ Saved to brand_list.json'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
  } finally {
    await pool.end();
  }
}

getUniqueBrands();