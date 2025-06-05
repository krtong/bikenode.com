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

async function add3TBrand() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(chalk.blue('🚀 Adding 3T Cycling brand data...'));
    
    const threeTData = {
      brand_id: '3t',
      brand_name: '3T Cycling',
      wikipedia_url: 'https://en.wikipedia.org/wiki/3T_Cycling',
      description: '3T Cycling is an Italian cycle sport company producing bicycles, bicycle frames, and related components.',
      logo_url: 'https://en.wikipedia.org/wiki/File:Logo_3T_Cycling.svg',
      icon_url: 'https://3t.bike/favicon.ico',
      founders: JSON.stringify(['Mario Dedioniggi']),
      founding_year: 1961,
      founding_full_date: null,
      founding_city: 'Bergamo',
      founding_state_province: 'Lombardy',
      founding_country: 'Italy',
      history: 'Originally founded in 1961 in Turin as Tecno Tubo Torino (3TTT), 3T switched to aluminum alloy tubing in 1970 and pioneered carbon-fiber composites by the late 1990s. In 2008 the company returned to pro cycling sponsorship, then introduced its first gravel bike (Exploro) in 2016 and followed with the Strada in 2017. In November 2022, 3T was acquired by UTurn Investments S.r.l., cementing its status as a leading Italian gravel brand.',
      parent_company: 'UTurn Investments S.r.l.',
      subsidiaries: JSON.stringify([]),
      headquarters_address: 'Via Giuseppe Verdi 12, 24121 Bergamo, Lombardy, Italy',
      headquarters_city: 'Bergamo',
      headquarters_state_province: 'Lombardy',
      headquarters_country: 'Italy',
      headquarters_image_url: null,
      company_type: 'private',
      stock_exchange: null,
      stock_symbol: null,
      employee_headcount: 40,
      employee_headcount_as_of: '2025-06-02',
      annual_revenue_amount: 2000000000, // 20,000,000 EUR in cents
      annual_revenue_currency: 'EUR',
      annual_revenue_as_of: '2022-12-31',
      industry: 'Bicycle industry',
      industry_refined: 'Sporting Goods Manufacturing',
      industry_subcategory: 'Gravel Bikes & Road Bikes',
      famous_models: JSON.stringify(['Exploro', 'Strada', 'Racemax Italia']),
      brand_hero_image_url: null,
      flagship_models: JSON.stringify([
        {
          name: 'Exploro',
          year: 2016,
          image_url: 'https://bikeindex.org/bikes/1283331',
          hero_image_url: 'https://www.tech-cycling.it/3t-exploro-primo-telaio-gravel-aerodinamico/'
        },
        {
          name: 'Strada',
          year: 2017,
          image_url: 'https://www.cxmagazine.com/3-t-exploro-aero-gravel-bike-press-release',
          hero_image_url: 'https://www.bikepacking.com/bikes/3t-exploro-review/'
        },
        {
          name: 'Racemax Italia',
          year: 2019,
          image_url: null,
          hero_image_url: null
        }
      ]),
      website: 'https://3t.bike',
      facebook_url: 'https://www.facebook.com/3Tbike/',
      twitter_url: 'https://twitter.com/3Tbike',
      instagram_url: 'https://www.instagram.com/3tbike/',
      linkedin_url: 'https://www.linkedin.com/company/3t-cycling',
      youtube_url: null,
      pinterest_url: null,
      additional_notes: '3T reinvests heavily in R&D and manufacturing in Bergamo, Taiwan, and California; acquired by UTurn Investments in November 2022 to support international expansion.'
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
      threeTData.brand_id, threeTData.brand_name, threeTData.wikipedia_url, threeTData.description,
      threeTData.logo_url, threeTData.icon_url, threeTData.founders, threeTData.founding_year,
      threeTData.founding_full_date, threeTData.founding_city, threeTData.founding_state_province,
      threeTData.founding_country, threeTData.history, threeTData.parent_company, threeTData.subsidiaries,
      threeTData.headquarters_address, threeTData.headquarters_city, threeTData.headquarters_state_province,
      threeTData.headquarters_country, threeTData.headquarters_image_url, threeTData.company_type,
      threeTData.stock_exchange, threeTData.stock_symbol, threeTData.employee_headcount,
      threeTData.employee_headcount_as_of, threeTData.annual_revenue_amount, threeTData.annual_revenue_currency,
      threeTData.annual_revenue_as_of, threeTData.industry, threeTData.industry_refined,
      threeTData.industry_subcategory, threeTData.famous_models, threeTData.brand_hero_image_url,
      threeTData.flagship_models, threeTData.website, threeTData.facebook_url, threeTData.twitter_url,
      threeTData.instagram_url, threeTData.linkedin_url, threeTData.youtube_url, threeTData.pinterest_url,
      threeTData.additional_notes
    ]);
    
    console.log(chalk.green('✅ Inserted 3T Cycling brand data'));
    
    // Verify the insertion
    const result = await pool.query('SELECT brand_id, brand_name, founding_year, headquarters_city FROM brands WHERE brand_id = $1', ['3t']);
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
    
    console.log(chalk.green('\n🎉 3T Cycling brand added successfully!'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error adding 3T brand:'), error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

add3TBrand().catch(console.error);