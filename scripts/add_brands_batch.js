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

function mapBrandData(brandJson) {
  // Map nested JSON structure to flat database schema
  return {
    brand_id: brandJson.brand_id,
    brand_name: brandJson.brand_name,
    wikipedia_url: brandJson.wikipedia_url || null,
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
    
    // Website and social media nested object
    website: brandJson.website || null,
    facebook_url: brandJson.social_media?.facebook || null,
    twitter_url: brandJson.social_media?.twitter || null,
    instagram_url: brandJson.social_media?.instagram || null,
    linkedin_url: brandJson.social_media?.linkedin || brandJson.linkedin_url || null,
    youtube_url: brandJson.social_media?.youtube || null,
    pinterest_url: brandJson.social_media?.pinterest || null,
    
    // Additional notes
    additional_notes: brandJson.additional_notes || null
  };
}

async function insertBrand(pool, brandData) {
  const query = `
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
  `;
  
  const values = [
    brandData.brand_id, brandData.brand_name, brandData.wikipedia_url, brandData.description,
    brandData.logo_url, brandData.icon_url, brandData.founders, brandData.founding_year,
    brandData.founding_full_date, brandData.founding_city, brandData.founding_state_province,
    brandData.founding_country, brandData.history, brandData.parent_company, brandData.subsidiaries,
    brandData.headquarters_address, brandData.headquarters_city, brandData.headquarters_state_province,
    brandData.headquarters_country, brandData.headquarters_image_url, brandData.company_type,
    brandData.stock_exchange, brandData.stock_symbol, brandData.employee_headcount,
    brandData.employee_headcount_as_of, brandData.annual_revenue_amount, brandData.annual_revenue_currency,
    brandData.annual_revenue_as_of, brandData.industry, brandData.industry_refined,
    brandData.industry_subcategory, brandData.famous_models, brandData.brand_hero_image_url,
    brandData.flagship_models, brandData.website, brandData.facebook_url, brandData.twitter_url,
    brandData.instagram_url, brandData.linkedin_url, brandData.youtube_url, brandData.pinterest_url,
    brandData.additional_notes
  ];
  
  await pool.query(query, values);
}

async function addBrandsBatch() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    // Check if brands.json file exists, otherwise expect JSON input via stdin or args
    let brandsData;
    
    try {
      const jsonContent = await fs.readFile('./brands.json', 'utf8');
      brandsData = JSON.parse(jsonContent);
      console.log(chalk.blue(`📂 Found brands.json file with ${brandsData.length} brands`));
    } catch (error) {
      // If no file, expect single brand JSON as command line argument
      if (process.argv[2]) {
        try {
          brandsData = [JSON.parse(process.argv[2])];
          console.log(chalk.blue('📝 Processing brand from command line argument'));
        } catch (parseError) {
          console.error(chalk.red('❌ Invalid JSON provided as argument'));
          process.exit(1);
        }
      } else {
        console.log(chalk.yellow('ℹ️  Usage:'));
        console.log('  1. Create a brands.json file with an array of brand objects');
        console.log('  2. Or pass a single brand JSON as argument: node add_brands_batch.js \'{"brand_id": "..."}\'');
        process.exit(1);
      }
    }
    
    // Ensure brandsData is an array
    if (!Array.isArray(brandsData)) {
      brandsData = [brandsData];
    }
    
    console.log(chalk.blue(`🚀 Processing ${brandsData.length} brands...`));
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const brandJson of brandsData) {
      try {
        // Validate required fields
        if (!brandJson.brand_id || !brandJson.brand_name) {
          throw new Error('Missing required fields: brand_id and brand_name');
        }
        
        // Check if brand already exists
        const existingBrand = await pool.query('SELECT brand_id FROM brands WHERE brand_id = $1', [brandJson.brand_id]);
        if (existingBrand.rows.length > 0) {
          console.log(chalk.yellow(`⚠️  Brand '${brandJson.brand_id}' already exists, skipping...`));
          continue;
        }
        
        // Map and insert brand data
        const mappedData = mapBrandData(brandJson);
        await insertBrand(pool, mappedData);
        
        console.log(chalk.green(`✅ Added: ${brandJson.brand_name} (${brandJson.brand_id})`));
        successCount++;
        
      } catch (error) {
        console.error(chalk.red(`❌ Failed to add ${brandJson.brand_id || 'unknown'}: ${error.message}`));
        errors.push({ brand_id: brandJson.brand_id, error: error.message });
        errorCount++;
      }
    }
    
    // Final summary
    console.log(chalk.blue('\n📊 Summary:'));
    console.log(chalk.green(`  ✅ Successfully added: ${successCount} brands`));
    if (errorCount > 0) {
      console.log(chalk.red(`  ❌ Failed: ${errorCount} brands`));
      console.log(chalk.red('\n🔍 Errors:'));
      errors.forEach(err => {
        console.log(chalk.red(`  - ${err.brand_id}: ${err.error}`));
      });
    }
    
    // Show total brand count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM brands');
    console.log(chalk.blue(`\n📈 Total brands in database: ${countResult.rows[0].total}`));
    
  } catch (error) {
    console.error(chalk.red('❌ Error processing brands:'), error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

addBrandsBatch().catch(console.error);