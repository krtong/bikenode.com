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

async function addAirdropBrand() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(chalk.blue('🚀 Adding Airdrop Bikes brand data...'));
    
    const airdropData = {
      brand_id: 'airdrop',
      brand_name: 'Airdrop Bikes',
      wikipedia_url: null,
      description: 'Airdrop Bikes is an independent British mountain bike brand based in Sheffield, designing and hand-assembling trail and enduro frames built to order.',
      logo_url: 'https://seeklogo.com/images/A/airdrop-bikes-logo-0DDC0D90A7-seeklogo.com.png',
      icon_url: 'https://airdropbikes.com/favicon.ico',
      founders: JSON.stringify(['Ed Brazier']),
      founding_year: 2015,
      founding_full_date: null,
      founding_city: 'Sheffield',
      founding_state_province: 'England',
      founding_country: 'United Kingdom',
      history: 'Founded by former web/graphic designer Ed Brazier around 2015, Airdrop began as a rider-owned British mountain bike brand focused on Dirt Jump, Enduro, and Downhill frames. Hand-assembled in Sheffield with frames manufactured in Taiwan, they released the Fade (2020), Edit (trail/enduro), and Slacker (DH) lines, shipping worldwide.',
      parent_company: null,
      subsidiaries: JSON.stringify([]),
      headquarters_address: 'Epic House, 18 Darnall Road, Sheffield, England, S9 5AB, United Kingdom',
      headquarters_city: 'Sheffield',
      headquarters_state_province: 'England',
      headquarters_country: 'United Kingdom',
      headquarters_image_url: null,
      company_type: 'private',
      stock_exchange: null,
      stock_symbol: null,
      employee_headcount: 3,
      employee_headcount_as_of: '2025-06-02',
      annual_revenue_amount: null,
      annual_revenue_currency: null,
      annual_revenue_as_of: null,
      industry: 'Bicycle Manufacturing',
      industry_refined: 'Sporting Goods Manufacturing',
      industry_subcategory: 'Mountain Bikes',
      famous_models: JSON.stringify(['Fade', 'Edit MX', 'Slacker']),
      brand_hero_image_url: null,
      flagship_models: JSON.stringify([
        {
          name: 'Fade',
          year: 2020,
          image_url: 'turn4image0',
          hero_image_url: 'turn4image1'
        },
        {
          name: 'Edit MX',
          year: 2022,
          image_url: 'turn5image0',
          hero_image_url: 'turn5image1'
        },
        {
          name: 'Slacker',
          year: 2021,
          image_url: 'turn1image2',
          hero_image_url: 'turn1image1'
        }
      ]),
      website: 'https://airdropbikes.com',
      facebook_url: 'https://www.facebook.com/airdropbikes/',
      twitter_url: null,
      instagram_url: 'https://www.instagram.com/airdropbikes/',
      linkedin_url: null,
      youtube_url: null,
      pinterest_url: null,
      additional_notes: null
    };
    
    await pool.query(`
      INSERT INTO brands (
        brand_id, brand_name, wikipedia_url, description, logo_url, icon_url,
        founders, founding_year, founding_full_date, founding_city, founding_state_province, founding_country,
        history, parent_company, subsidiaries, headquarters_address, headquarters_city, headquarters_state_province,
        headquarters_country, headquarters_image_url, company_type, stock_exchange, stock_symbol,
        employee_headcount, employee_headcount_as_of, annual_revenue_amount, annual_revenue_currency, annual_revenue_as_of,
        industry, industry_refined, industry_subcategory, famous_models, brand_hero_image_url, flagship_models,
        website, facebook_url, twitter_url, instagram_url, linkedin_url, youtube_url, pinterest_url, additional_notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42
      )
    `, [
      airdropData.brand_id, airdropData.brand_name, airdropData.wikipedia_url, airdropData.description,
      airdropData.logo_url, airdropData.icon_url, airdropData.founders, airdropData.founding_year,
      airdropData.founding_full_date, airdropData.founding_city, airdropData.founding_state_province,
      airdropData.founding_country, airdropData.history, airdropData.parent_company, airdropData.subsidiaries,
      airdropData.headquarters_address, airdropData.headquarters_city, airdropData.headquarters_state_province,
      airdropData.headquarters_country, airdropData.headquarters_image_url, airdropData.company_type,
      airdropData.stock_exchange, airdropData.stock_symbol, airdropData.employee_headcount,
      airdropData.employee_headcount_as_of, airdropData.annual_revenue_amount, airdropData.annual_revenue_currency,
      airdropData.annual_revenue_as_of, airdropData.industry, airdropData.industry_refined,
      airdropData.industry_subcategory, airdropData.famous_models, airdropData.brand_hero_image_url,
      airdropData.flagship_models, airdropData.website, airdropData.facebook_url, airdropData.twitter_url,
      airdropData.instagram_url, airdropData.linkedin_url, airdropData.youtube_url, airdropData.pinterest_url,
      airdropData.additional_notes
    ]);
    
    console.log(chalk.green('✅ Inserted Airdrop Bikes brand data'));
    
    // Verify the insertion
    const result = await pool.query('SELECT brand_id, brand_name, founding_year, headquarters_city FROM brands WHERE brand_id = $1', ['airdrop']);
    if (result.rows.length > 0) {
      const brand = result.rows[0];
      console.log(chalk.blue('\n📋 Verification:'));
      console.log(`  Brand ID: ${brand.brand_id}`);
      console.log(`  Brand Name: ${brand.brand_name}`);
      console.log(`  Founded: ${brand.founding_year}`);
      console.log(`  Headquarters: ${brand.headquarters_city}`);
    }
    
    // Show current brand count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM brands');
    console.log(chalk.blue(`\n📊 Total brands in database: ${countResult.rows[0].total}`));
    
    console.log(chalk.green('\n🎉 Airdrop Bikes brand added successfully!'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error adding Airdrop brand:'), error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

addAirdropBrand().catch(console.error);