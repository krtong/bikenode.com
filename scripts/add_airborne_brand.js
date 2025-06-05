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

async function addAirborneBrand() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(chalk.blue('🚀 Adding Airborne Bicycles brand data...'));
    
    const airborneData = {
      brand_id: 'airborne',
      brand_name: 'Airborne Bicycles',
      wikipedia_url: null,
      description: 'Airborne Bicycles is an American direct-to-consumer bicycle brand founded in 1997, focusing on offering high-value bikes including hardtails, full-suspension, dirt jumpers, and balance bikes.',
      logo_url: 'https://seeklogo.com/images/A/airborne-bicycles-logo-5239E60740-seeklogo.com.png',
      icon_url: 'https://airbornebicycles.com/favicon.ico',
      founders: JSON.stringify(['Jamie Raddin']),
      founding_year: 1997,
      founding_full_date: null,
      founding_city: 'Dayton',
      founding_state_province: 'Ohio',
      founding_country: 'USA',
      history: 'Launched in 1997 as one of the first direct-to-consumer bike companies, Airborne began with titanium frames and value-focused offerings. Over time, it expanded its lineup to include mountain bikes (Plague 27.5, HobGoblin 29er), dirt jumpers (Cro-Hawk, Skyhawk), and introduced the Plague 27.5 in 2020. Airborne remains based in Dayton, Ohio.',
      parent_company: null,
      subsidiaries: JSON.stringify([]),
      headquarters_address: 'Dayton, Ohio, USA',
      headquarters_city: 'Dayton',
      headquarters_state_province: 'Ohio',
      headquarters_country: 'USA',
      headquarters_image_url: null,
      company_type: 'private',
      stock_exchange: null,
      stock_symbol: null,
      employee_headcount: 125,
      employee_headcount_as_of: '2025-06-02',
      annual_revenue_amount: null,
      annual_revenue_currency: null,
      annual_revenue_as_of: null,
      industry: 'Bicycle Manufacturing',
      industry_refined: 'Sporting Goods Manufacturing',
      industry_subcategory: 'Mountain Bikes & BMX',
      famous_models: JSON.stringify(['Cro-Hawk', 'Plague 27.5', 'Skyhawk DJ 26', 'HobGoblin 29er']),
      brand_hero_image_url: null,
      flagship_models: JSON.stringify([
        {
          name: 'Cro-Hawk',
          year: 2020,
          image_url: 'https://mtbdatabase.com/bikes/2020/airborne/cro-hawk/2020-airborne-cro-hawk-dj-26/',
          hero_image_url: 'https://www.vitalmtb.com/product/guide/Bikes%2C3/Airborne/Cro-Hawk-DJ-26%2C27415'
        },
        {
          name: 'Plague 27.5',
          year: 2020,
          image_url: 'https://mtbdatabase.com/bikes/2020/airborne/plague/2020-airborne-plague-27-5/',
          hero_image_url: 'https://airbornebicycles.com/blogs/news/tagged/plague-27-5'
        },
        {
          name: 'Skyhawk DJ 26',
          year: 2021,
          image_url: null,
          hero_image_url: null
        },
        {
          name: 'HobGoblin 29er',
          year: 2013,
          image_url: null,
          hero_image_url: null
        }
      ]),
      website: 'https://airbornebicycles.com',
      facebook_url: 'https://www.facebook.com/airbornebicycleco/',
      twitter_url: null,
      instagram_url: 'https://www.instagram.com/airbornebicycles/',
      linkedin_url: 'https://www.linkedin.com/company/airborne-bicycles',
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
      airborneData.brand_id, airborneData.brand_name, airborneData.wikipedia_url, airborneData.description,
      airborneData.logo_url, airborneData.icon_url, airborneData.founders, airborneData.founding_year,
      airborneData.founding_full_date, airborneData.founding_city, airborneData.founding_state_province,
      airborneData.founding_country, airborneData.history, airborneData.parent_company, airborneData.subsidiaries,
      airborneData.headquarters_address, airborneData.headquarters_city, airborneData.headquarters_state_province,
      airborneData.headquarters_country, airborneData.headquarters_image_url, airborneData.company_type,
      airborneData.stock_exchange, airborneData.stock_symbol, airborneData.employee_headcount,
      airborneData.employee_headcount_as_of, airborneData.annual_revenue_amount, airborneData.annual_revenue_currency,
      airborneData.annual_revenue_as_of, airborneData.industry, airborneData.industry_refined,
      airborneData.industry_subcategory, airborneData.famous_models, airborneData.brand_hero_image_url,
      airborneData.flagship_models, airborneData.website, airborneData.facebook_url, airborneData.twitter_url,
      airborneData.instagram_url, airborneData.linkedin_url, airborneData.youtube_url, airborneData.pinterest_url,
      airborneData.additional_notes
    ]);
    
    console.log(chalk.green('✅ Inserted Airborne Bicycles brand data'));
    
    // Verify the insertion
    const result = await pool.query('SELECT brand_id, brand_name, founding_year, headquarters_city FROM brands WHERE brand_id = $1', ['airborne']);
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
    
    console.log(chalk.green('\n🎉 Airborne Bicycles brand added successfully!'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error adding Airborne brand:'), error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

addAirborneBrand().catch(console.error);