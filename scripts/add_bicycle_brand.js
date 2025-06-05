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

/**
 * Create the bicycle_brands table with comprehensive schema
 */
async function createBicycleBrandsTable(pool) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS bicycle_brands (
      -- Primary identifiers
      id SERIAL PRIMARY KEY,
      brand_id TEXT UNIQUE NOT NULL,
      brand_name TEXT NOT NULL,
      
      -- Basic information
      wikipedia_url TEXT,
      linkedin_url TEXT,
      description TEXT,
      
      -- Logo information (from nested object)
      logo_url TEXT,
      icon_url TEXT,
      
      -- Founders (JSON array)
      founders JSONB DEFAULT '[]'::jsonb,
      
      -- Founding information (from nested object)
      founding_year INTEGER,
      founding_full_date DATE,
      founding_city TEXT,
      founding_state_province TEXT,
      founding_country TEXT,
      
      -- Company history
      history TEXT,
      parent_company TEXT,
      subsidiaries JSONB DEFAULT '[]'::jsonb,
      
      -- Headquarters (from nested object)
      headquarters_address TEXT,
      headquarters_city TEXT,
      headquarters_state_province TEXT,
      headquarters_country TEXT,
      headquarters_image_url TEXT,
      
      -- Business information
      company_type TEXT,
      stock_exchange TEXT,
      stock_symbol TEXT,
      
      -- Employee information (from nested object)
      employee_headcount INTEGER,
      employee_headcount_as_of TEXT,
      
      -- Revenue information (from nested object)
      annual_revenue_amount BIGINT, -- in cents
      annual_revenue_currency TEXT,
      annual_revenue_as_of TEXT,
      
      -- Industry information
      industry TEXT,
      industry_refined TEXT,
      industry_subcategory TEXT,
      
      -- Product information
      famous_models JSONB DEFAULT '[]'::jsonb,
      brand_hero_image_url TEXT,
      flagship_models JSONB DEFAULT '[]'::jsonb,
      
      -- Online presence
      website TEXT,
      facebook_url TEXT,
      twitter_url TEXT,
      instagram_url TEXT,
      youtube_url TEXT,
      pinterest_url TEXT,
      
      -- Additional information
      additional_notes TEXT,
      
      -- Metadata
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await pool.query(createTableQuery);
  console.log(chalk.green('✅ bicycle_brands table created/verified'));
}

/**
 * Map nested JSON structure to flat database schema
 */
function mapBrandData(brandJson) {
  return {
    brand_id: brandJson.brand_id,
    brand_name: brandJson.brand_name,
    wikipedia_url: brandJson.wikipedia_url || null,
    linkedin_url: brandJson.linkedin_url || null,
    description: brandJson.description || null,
    
    // Logo nested object
    logo_url: brandJson.logo?.logo_url || null,
    icon_url: brandJson.logo?.icon_url || null,
    
    // Founders array
    founders: JSON.stringify(brandJson.founders || []),
    
    // Founding nested object
    founding_year: brandJson.founding?.year || null,
    founding_full_date: brandJson.founding?.full_date || null,
    founding_city: brandJson.founding?.location?.city || null,
    founding_state_province: brandJson.founding?.location?.state_province || null,
    founding_country: brandJson.founding?.location?.country || null,
    
    // Company info
    history: brandJson.history || null,
    parent_company: brandJson.parent_company || null,
    subsidiaries: JSON.stringify(brandJson.subsidiaries || []),
    
    // Headquarters nested object
    headquarters_address: brandJson.headquarters?.address || null,
    headquarters_city: brandJson.headquarters?.city || null,
    headquarters_state_province: brandJson.headquarters?.state_province || null,
    headquarters_country: brandJson.headquarters?.country || null,
    headquarters_image_url: brandJson.headquarters_image_url || null,
    
    // Business info
    company_type: brandJson.company_type || null,
    stock_exchange: brandJson.stock_exchange || null,
    stock_symbol: brandJson.stock_symbol || null,
    
    // Employee info nested object
    employee_headcount: brandJson.employee_headcount?.number || null,
    employee_headcount_as_of: brandJson.employee_headcount?.as_of || null,
    
    // Revenue nested object
    annual_revenue_amount: brandJson.annual_revenue?.amount ? brandJson.annual_revenue.amount * 100 : null, // Convert to cents
    annual_revenue_currency: brandJson.annual_revenue?.currency || null,
    annual_revenue_as_of: brandJson.annual_revenue?.as_of || null,
    
    // Industry info
    industry: brandJson.industry || null,
    industry_refined: brandJson.industry_refined || null,
    industry_subcategory: brandJson.industry_subcategory || null,
    
    // Products
    famous_models: JSON.stringify(brandJson.famous_models || []),
    brand_hero_image_url: brandJson.brand_hero_image_url || null,
    flagship_models: JSON.stringify(brandJson.flagship_models || []),
    
    // Website and social media
    website: brandJson.website || null,
    facebook_url: brandJson.social_media?.facebook || null,
    twitter_url: brandJson.social_media?.twitter || null,
    instagram_url: brandJson.social_media?.instagram || null,
    youtube_url: brandJson.social_media?.youtube || null,
    pinterest_url: brandJson.social_media?.pinterest || null,
    
    // Additional notes
    additional_notes: brandJson.additional_notes || null
  };
}

/**
 * Insert brand data into bicycle_brands table
 */
async function insertBicycleBrand(pool, brandData) {
  const query = `
    INSERT INTO bicycle_brands (
      brand_id, brand_name, wikipedia_url, linkedin_url, description, logo_url, icon_url,
      founders, founding_year, founding_full_date, founding_city, founding_state_province, founding_country,
      history, parent_company, subsidiaries, headquarters_address, headquarters_city, headquarters_state_province,
      headquarters_country, headquarters_image_url, company_type, stock_exchange, stock_symbol,
      employee_headcount, employee_headcount_as_of, annual_revenue_amount, annual_revenue_currency, annual_revenue_as_of,
      industry, industry_refined, industry_subcategory, famous_models, brand_hero_image_url, flagship_models,
      website, facebook_url, twitter_url, instagram_url, youtube_url, pinterest_url, additional_notes
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
      $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42
    )
    ON CONFLICT (brand_id) DO UPDATE SET
      brand_name = EXCLUDED.brand_name,
      wikipedia_url = EXCLUDED.wikipedia_url,
      linkedin_url = EXCLUDED.linkedin_url,
      description = EXCLUDED.description,
      logo_url = EXCLUDED.logo_url,
      icon_url = EXCLUDED.icon_url,
      founders = EXCLUDED.founders,
      founding_year = EXCLUDED.founding_year,
      founding_full_date = EXCLUDED.founding_full_date,
      founding_city = EXCLUDED.founding_city,
      founding_state_province = EXCLUDED.founding_state_province,
      founding_country = EXCLUDED.founding_country,
      history = EXCLUDED.history,
      parent_company = EXCLUDED.parent_company,
      subsidiaries = EXCLUDED.subsidiaries,
      headquarters_address = EXCLUDED.headquarters_address,
      headquarters_city = EXCLUDED.headquarters_city,
      headquarters_state_province = EXCLUDED.headquarters_state_province,
      headquarters_country = EXCLUDED.headquarters_country,
      headquarters_image_url = EXCLUDED.headquarters_image_url,
      company_type = EXCLUDED.company_type,
      stock_exchange = EXCLUDED.stock_exchange,
      stock_symbol = EXCLUDED.stock_symbol,
      employee_headcount = EXCLUDED.employee_headcount,
      employee_headcount_as_of = EXCLUDED.employee_headcount_as_of,
      annual_revenue_amount = EXCLUDED.annual_revenue_amount,
      annual_revenue_currency = EXCLUDED.annual_revenue_currency,
      annual_revenue_as_of = EXCLUDED.annual_revenue_as_of,
      industry = EXCLUDED.industry,
      industry_refined = EXCLUDED.industry_refined,
      industry_subcategory = EXCLUDED.industry_subcategory,
      famous_models = EXCLUDED.famous_models,
      brand_hero_image_url = EXCLUDED.brand_hero_image_url,
      flagship_models = EXCLUDED.flagship_models,
      website = EXCLUDED.website,
      facebook_url = EXCLUDED.facebook_url,
      twitter_url = EXCLUDED.twitter_url,
      instagram_url = EXCLUDED.instagram_url,
      youtube_url = EXCLUDED.youtube_url,
      pinterest_url = EXCLUDED.pinterest_url,
      additional_notes = EXCLUDED.additional_notes,
      updated_at = CURRENT_TIMESTAMP
  `;
  
  const values = [
    brandData.brand_id, brandData.brand_name, brandData.wikipedia_url, brandData.linkedin_url,
    brandData.description, brandData.logo_url, brandData.icon_url, brandData.founders,
    brandData.founding_year, brandData.founding_full_date, brandData.founding_city,
    brandData.founding_state_province, brandData.founding_country, brandData.history,
    brandData.parent_company, brandData.subsidiaries, brandData.headquarters_address,
    brandData.headquarters_city, brandData.headquarters_state_province, brandData.headquarters_country,
    brandData.headquarters_image_url, brandData.company_type, brandData.stock_exchange,
    brandData.stock_symbol, brandData.employee_headcount, brandData.employee_headcount_as_of,
    brandData.annual_revenue_amount, brandData.annual_revenue_currency, brandData.annual_revenue_as_of,
    brandData.industry, brandData.industry_refined, brandData.industry_subcategory,
    brandData.famous_models, brandData.brand_hero_image_url, brandData.flagship_models,
    brandData.website, brandData.facebook_url, brandData.twitter_url, brandData.instagram_url,
    brandData.youtube_url, brandData.pinterest_url, brandData.additional_notes
  ];
  
  await pool.query(query, values);
}

/**
 * Main function to add bicycle brand(s)
 */
async function addBicycleBrand() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(chalk.blue('🚀 Starting bicycle brand insertion...'));
    
    // Connect to database
    const client = await pool.connect();
    console.log(chalk.green('✅ Database connection established'));
    client.release();
    
    // Create table if it doesn't exist
    await createBicycleBrandsTable(pool);
    
    // Get brand data from command line argument or file
    let brandData;
    
    if (process.argv[2]) {
      // JSON provided as command line argument
      try {
        brandData = JSON.parse(process.argv[2]);
        console.log(chalk.blue(`📝 Processing brand from command line: ${brandData.brand_name}`));
      } catch (parseError) {
        console.error(chalk.red('❌ Invalid JSON provided as argument'));
        console.error(parseError.message);
        process.exit(1);
      }
    } else {
      // Try to read from bicycle_brand.json file
      try {
        const jsonContent = await fs.readFile('./bicycle_brand.json', 'utf8');
        brandData = JSON.parse(jsonContent);
        console.log(chalk.blue(`📂 Processing brand from file: ${brandData.brand_name}`));
      } catch (error) {
        console.log(chalk.yellow('ℹ️  Usage:'));
        console.log('  1. Create a bicycle_brand.json file with brand object');
        console.log('  2. Or pass brand JSON as argument:');
        console.log('     node add_bicycle_brand.js \'{"brand_id": "airborne", "brand_name": "Airborne Bicycles", ...}\'');
        process.exit(1);
      }
    }
    
    // Map and insert the brand data
    const mappedData = mapBrandData(brandData);
    await insertBicycleBrand(pool, mappedData);
    
    console.log(chalk.green(`✅ Successfully added/updated brand: ${brandData.brand_name} (${brandData.brand_id})`));
    
    // Show summary
    const countResult = await pool.query('SELECT COUNT(*) FROM bicycle_brands');
    console.log(chalk.blue(`📊 Total bicycle brands in database: ${countResult.rows[0].count}`));
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addBicycleBrand();
}

export { addBicycleBrand, mapBrandData, createBicycleBrandsTable };