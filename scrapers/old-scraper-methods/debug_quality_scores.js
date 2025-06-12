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

async function debugQuality() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    // Compare high vs low quality brands
    const highQuality = await pool.query(`
      SELECT name, data_quality_score, year_established, headquarters_location, 
             founder, website_url, wikipedia_url, logo_url, company_description
      FROM bicycle_brands 
      WHERE data_quality_score >= 0.5
      ORDER BY data_quality_score DESC
      LIMIT 3
    `);
    
    const lowQuality = await pool.query(`
      SELECT name, data_quality_score, year_established, headquarters_location, 
             founder, website_url, wikipedia_url, logo_url, company_description
      FROM bicycle_brands 
      WHERE data_quality_score < 0.3
      ORDER BY id DESC
      LIMIT 3
    `);
    
    console.log(chalk.blue('🏆 HIGH QUALITY BRANDS:'));
    for (const brand of highQuality.rows) {
      console.log(`\n${chalk.bold(brand.name)} - Score: ${brand.data_quality_score}`);
      console.log(`  Year: ${brand.year_established || 'MISSING'}`);
      console.log(`  HQ: ${brand.headquarters_location || 'MISSING'}`);
      console.log(`  Founder: ${brand.founder || 'MISSING'}`);
      console.log(`  Website: ${brand.website_url ? 'YES' : 'MISSING'}`);
      console.log(`  Wikipedia: ${brand.wikipedia_url ? 'YES' : 'MISSING'}`);
      console.log(`  Logo: ${brand.logo_url ? 'YES' : 'MISSING'}`);
      console.log(`  Description: ${brand.company_description ? 'YES' : 'MISSING'}`);
    }
    
    console.log(chalk.red('\n📉 LOW QUALITY BRANDS:'));
    for (const brand of lowQuality.rows) {
      console.log(`\n${chalk.bold(brand.name)} - Score: ${brand.data_quality_score}`);
      console.log(`  Year: ${brand.year_established || 'MISSING'}`);
      console.log(`  HQ: ${brand.headquarters_location || 'MISSING'}`);
      console.log(`  Founder: ${brand.founder || 'MISSING'}`);
      console.log(`  Website: ${brand.website_url ? 'YES' : 'MISSING'}`);
      console.log(`  Wikipedia: ${brand.wikipedia_url ? 'YES' : 'MISSING'}`);
      console.log(`  Logo: ${brand.logo_url ? 'YES' : 'MISSING'}`);
      console.log(`  Description: ${brand.company_description ? 'YES' : 'MISSING'}`);
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
  } finally {
    await pool.end();
  }
}

debugQuality();