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

async function showDetailedBrandData() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    const result = await pool.query(`
      SELECT 
        name, 
        normalized_name,
        year_established, 
        founder,
        headquarters_location, 
        parent_company,
        website_url, 
        wikipedia_url,
        logo_url,
        company_description,
        data_quality_score,
        raw_scrape_data,
        scraped_at
      FROM bicycle_brands 
      WHERE name IN ('3T', 'AddMotor', 'Aegis')
      ORDER BY data_quality_score DESC
    `);
    
    console.log(chalk.bold('\n🔍 Detailed Scraped Brand Analysis:\n'));
    
    for (const brand of result.rows) {
      console.log(chalk.bold.blue(`━━━ ${brand.name} (${brand.normalized_name}) ━━━`));
      console.log(chalk.green(`Quality Score: ${brand.data_quality_score}`));
      console.log('');
      
      // Basic company info
      console.log(chalk.yellow('📋 Company Information:'));
      console.log(`  Year Founded: ${chalk.white(brand.year_established || 'NOT FOUND')}`);
      console.log(`  Founder: ${chalk.white(brand.founder || 'NOT FOUND')}`);
      console.log(`  Headquarters: ${chalk.white(brand.headquarters_location || 'NOT FOUND')}`);
      console.log(`  Parent Company: ${chalk.white(brand.parent_company || 'NOT FOUND')}`);
      console.log('');
      
      // Web presence
      console.log(chalk.yellow('🌐 Web Presence:'));
      console.log(`  Official Website: ${chalk.white(brand.website_url || 'NOT FOUND')}`);
      console.log(`  Wikipedia Page: ${chalk.white(brand.wikipedia_url || 'NOT FOUND')}`);
      console.log(`  Logo URL: ${chalk.white(brand.logo_url || 'NOT FOUND')}`);
      console.log('');
      
      // Description
      console.log(chalk.yellow('📝 Description:'));
      if (brand.company_description) {
        const desc = brand.company_description;
        console.log(`  ${chalk.white(desc.length > 200 ? desc.substring(0, 200) + '...' : desc)}`);
      } else {
        console.log(`  ${chalk.white('NOT FOUND')}`);
      }
      console.log('');
      
      // Raw scrape data analysis
      if (brand.raw_scrape_data) {
        const rawData = JSON.parse(brand.raw_scrape_data);
        console.log(chalk.yellow('🔧 Scrape Data Analysis:'));
        
        if (rawData.wikipedia_data) {
          console.log(`  ✅ Wikipedia: Found page "${rawData.wikipedia_data.title}"`);
          if (rawData.wikipedia_data.infobox) {
            const infoboxKeys = Object.keys(rawData.wikipedia_data.infobox);
            console.log(`  📊 Infobox fields: ${infoboxKeys.slice(0, 5).join(', ')}${infoboxKeys.length > 5 ? '...' : ''}`);
          }
        } else {
          console.log(`  ❌ Wikipedia: No data found`);
        }
        
        if (rawData.official_website && rawData.official_website.length > 0) {
          console.log(`  ✅ Website: Found ${rawData.official_website.length} candidates`);
          console.log(`  🔗 Best match: ${rawData.official_website[0].url}`);
        } else {
          console.log(`  ❌ Website: No official site found`);
        }
        
        if (rawData.logo_urls && rawData.logo_urls.length > 0) {
          console.log(`  ✅ Logos: Found ${rawData.logo_urls.length} logo candidates`);
        } else {
          console.log(`  ❌ Logos: No logos found`);
        }
      }
      
      console.log(chalk.gray(`\nScraped: ${brand.scraped_at}`));
      console.log(chalk.blue('━'.repeat(60)));
      console.log('');
    }
    
    // Show what fields are consistently missing
    console.log(chalk.bold.red('\n❌ Fields with Poor Population Rates:'));
    const fields = ['founder', 'parent_company'];
    for (const field of fields) {
      const count = await pool.query(`SELECT COUNT(*) as total FROM bicycle_brands WHERE ${field} IS NOT NULL`);
      const total = await pool.query(`SELECT COUNT(*) as total FROM bicycle_brands`);
      const rate = Math.round(count.rows[0].total / total.rows[0].total * 100);
      console.log(`  ${field}: ${count.rows[0].total}/${total.rows[0].total} (${rate}%)`);
    }
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
  } finally {
    await pool.end();
  }
}

showDetailedBrandData();