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

async function addAegisBrand() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(chalk.blue('🚀 Adding Aegis Bicycles brand data...'));
    
    const aegisData = {
      brand_id: 'aegis',
      brand_name: 'Aegis Bicycles',
      wikipedia_url: null,
      description: 'Aegis Bicycles is a Maine‐based boutique manufacturer known for pioneering the first all-carbon monocoque bicycle frame in the USA, specializing in high-performance racing and triathlon bikes.',
      logo_url: null,
      icon_url: 'https://www.aegisbicycles.com/favicon.ico',
      founders: JSON.stringify(['Delano Duplessis', 'Levite Duplessis']),
      founding_year: 1993,
      founding_full_date: null,
      founding_city: 'Van Buren',
      founding_state_province: 'Maine',
      founding_country: 'USA',
      history: 'Evolving from Simplex (a tennis racquet company) in the 1970s, the Duplessis brothers developed carbon-fiber technology for Trek, producing the first U.S. all-carbon monocoque frame in 1986. Aegis launched as an independent brand in 1993. After the brothers\' retirement in the mid-1990s, Keith Baumm acquired the company and expanded R&D. By 2007, Aegis Racing Bikes USA operated from 351 Champlain Street in Van Buren, Maine, with models like the Shaman gaining popularity among triathletes.',
      parent_company: null,
      subsidiaries: JSON.stringify([]),
      headquarters_address: '351 Champlain Street, Van Buren, ME 04785, USA',
      headquarters_city: 'Van Buren',
      headquarters_state_province: 'Maine',
      headquarters_country: 'USA',
      headquarters_image_url: null,
      company_type: 'private',
      stock_exchange: null,
      stock_symbol: null,
      employee_headcount: 5,
      employee_headcount_as_of: '2010-08-25',
      annual_revenue_amount: 25000000, // $250,000 in cents
      annual_revenue_currency: 'USD',
      annual_revenue_as_of: '2010-08-25',
      industry: 'Bicycle Manufacturing',
      industry_refined: 'Carbon-Fiber Road & Triathlon Bikes',
      industry_subcategory: 'High-Performance Racing Bikes',
      famous_models: JSON.stringify(['Aro Svelte', 'Shaman']),
      brand_hero_image_url: null,
      flagship_models: JSON.stringify([
        {
          name: 'Aro Svelte',
          year: 1993,
          image_url: 'https://www.pinkbike.com/buysell/2809531/',
          hero_image_url: 'https://neebu.net/~khuon/cycling/bikes/Aegis/2001-Aro_Svelte/'
        },
        {
          name: 'Shaman',
          year: 2000,
          image_url: 'https://bikepedia.azurewebsites.net/QuickBike/BikeSpecs.aspx?item=90312',
          hero_image_url: null
        }
      ]),
      website: 'https://www.aegisbicycles.com',
      facebook_url: 'https://www.facebook.com/AegisRacingBikesUSA',
      twitter_url: null,
      instagram_url: null,
      linkedin_url: null,
      youtube_url: null,
      pinterest_url: null,
      additional_notes: 'CNNMoney (Aug 2010): "The factory in Van Buren, Maine is currently mothballed. \'It is ready to go if we can get financing again,\' Orne said. Aegis, once a pioneer in carbon-fiber bikes, laid off workers after the 2008 crash. The company now makes its frames in Asia but still finishes every bike in Maine. Orne hopes to restart U.S. production if demand rebounds."'
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
      aegisData.brand_id, aegisData.brand_name, aegisData.wikipedia_url, aegisData.description,
      aegisData.logo_url, aegisData.icon_url, aegisData.founders, aegisData.founding_year,
      aegisData.founding_full_date, aegisData.founding_city, aegisData.founding_state_province,
      aegisData.founding_country, aegisData.history, aegisData.parent_company, aegisData.subsidiaries,
      aegisData.headquarters_address, aegisData.headquarters_city, aegisData.headquarters_state_province,
      aegisData.headquarters_country, aegisData.headquarters_image_url, aegisData.company_type,
      aegisData.stock_exchange, aegisData.stock_symbol, aegisData.employee_headcount,
      aegisData.employee_headcount_as_of, aegisData.annual_revenue_amount, aegisData.annual_revenue_currency,
      aegisData.annual_revenue_as_of, aegisData.industry, aegisData.industry_refined,
      aegisData.industry_subcategory, aegisData.famous_models, aegisData.brand_hero_image_url,
      aegisData.flagship_models, aegisData.website, aegisData.facebook_url, aegisData.twitter_url,
      aegisData.instagram_url, aegisData.linkedin_url, aegisData.youtube_url, aegisData.pinterest_url,
      aegisData.additional_notes
    ]);
    
    console.log(chalk.green('✅ Inserted Aegis Bicycles brand data'));
    
    // Verify the insertion
    const result = await pool.query('SELECT brand_id, brand_name, founding_year, headquarters_city FROM brands WHERE brand_id = $1', ['aegis']);
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
    
    console.log(chalk.green('\n🎉 Aegis Bicycles brand added successfully!'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error adding Aegis brand:'), error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

addAegisBrand().catch(console.error);