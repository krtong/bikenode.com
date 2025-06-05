#!/usr/bin/env node
import pg from 'pg';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Get list of existing brand IDs from database
 */
async function getExistingBrandIds(pool) {
  try {
    const result = await pool.query('SELECT brand_id FROM bicycle_brands');
    return new Set(result.rows.map(row => row.brand_id));
  } catch (error) {
    // If table doesn't exist or column doesn't exist, return empty set
    if (error.code === '42P01' || error.code === '42703') {
      console.log(chalk.yellow('⚠️  bicycle_brands table or column does not exist yet'));
      return new Set();
    }
    throw error;
  }
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
 * Clean JSON content by removing comments and fixing trailing commas
 */
function cleanJsonContent(content) {
  // Remove single-line comments (//...) including any special characters
  content = content.replace(/\/\/.*$/gm, '');
  
  // Remove any remaining non-ASCII characters that might be causing issues
  content = content.replace(/[^\x00-\x7F]/g, '');
  
  // Remove trailing commas before closing braces/brackets
  content = content.replace(/,(\s*[}\]])/g, '$1');
  
  // Clean up multiple consecutive whitespace while preserving line structure
  content = content.replace(/[ \t]+/g, ' ');
  
  return content;
}

/**
 * Parse JSON content and convert to array format
 */
function parseJsonToArray(content) {
  const cleanContent = cleanJsonContent(content);
  const parsedData = JSON.parse(cleanContent);
  
  // Handle both single object and array formats
  if (Array.isArray(parsedData)) {
    return parsedData;
  } else if (parsedData && typeof parsedData === 'object') {
    return [parsedData];
  } else {
    throw new Error('Invalid JSON format - expected object or array');
  }
}

/**
 * Main function to sync bicycle brands from file to database
 */
async function syncBicycleBrands() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(chalk.blue('🔄 Starting bicycle brands sync...'));
    
    // Connect to database
    const client = await pool.connect();
    console.log(chalk.green('✅ Database connection established'));
    client.release();
    
    // Create table if it doesn't exist
    await createBicycleBrandsTable(pool);
    
    // Verify table was created by checking if it exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bicycle_brands'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      throw new Error('Failed to create bicycle_brands table');
    }
    
    // Get existing brand IDs from database
    const existingBrandIds = await getExistingBrandIds(pool);
    console.log(chalk.blue(`📊 Found ${existingBrandIds.size} existing brands in database`));
    
    if (existingBrandIds.size > 0) {
      console.log(chalk.gray(`   Existing brands: ${Array.from(existingBrandIds).join(', ')}`));
    }
    
    // Read the bicycle_brands.json file from scrapers directory
    const filePath = path.join(__dirname, '../scrapers/bicycle_brands.json');
    console.log(chalk.blue(`📂 Reading brands from: ${filePath}`));
    
    let rawContent;
    try {
      rawContent = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error(chalk.red('❌ Could not read bicycle_brands.json file'));
      console.error(chalk.red(`   Make sure the file exists at: ${filePath}`));
      process.exit(1);
    }
    
    // Parse JSON content
    let brandsData;
    try {
      brandsData = parseJsonToArray(rawContent);
    } catch (parseError) {
      console.error(chalk.red('❌ Invalid JSON in bicycle_brands.json'));
      console.error(chalk.red('   The file contains comments or invalid JSON syntax'));
      console.error(chalk.yellow('   Error details:'), parseError.message);
      process.exit(1);
    }
    
    console.log(chalk.blue(`📊 Found ${brandsData.length} brand(s) in JSON file`));
    
    // Filter out brands that already exist in database
    const newBrands = brandsData.filter(brand => !existingBrandIds.has(brand.brand_id));
    const existingBrands = brandsData.filter(brand => existingBrandIds.has(brand.brand_id));
    
    console.log(chalk.blue('\n📋 Sync Analysis:'));
    console.log(chalk.green(`✅ New brands to add: ${newBrands.length}`));
    console.log(chalk.yellow(`⚠️  Already in database: ${existingBrands.length}`));
    
    if (existingBrands.length > 0) {
      console.log(chalk.gray(`   Skipping: ${existingBrands.map(b => b.brand_id).join(', ')}`));
    }
    
    if (newBrands.length === 0) {
      console.log(chalk.green('\n🎉 All brands are already in the database - nothing to do!'));
      return;
    }
    
    console.log(chalk.blue(`\n🚀 Adding ${newBrands.length} new brand(s)...`));
    
    // Import new brands
    let successCount = 0;
    let errorCount = 0;
    
    for (const brandData of newBrands) {
      try {
        const mappedData = mapBrandData(brandData);
        await insertBicycleBrand(pool, mappedData);
        
        console.log(chalk.green(`✅ Added: ${brandData.brand_name} (${brandData.brand_id})`));
        successCount++;
      } catch (error) {
        console.error(chalk.red(`❌ Failed to add: ${brandData.brand_name || 'Unknown'} - ${error.message}`));
        errorCount++;
      }
    }
    
    // Show final summary
    console.log(chalk.blue('\n📊 Sync Summary:'));
    console.log(chalk.green(`✅ Successfully added: ${successCount} new brands`));
    if (errorCount > 0) {
      console.log(chalk.red(`❌ Failed to add: ${errorCount} brands`));
    }
    
    const countResult = await pool.query('SELECT COUNT(*) FROM bicycle_brands');
    console.log(chalk.blue(`📈 Total bicycle brands in database: ${countResult.rows[0].count}`));
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncBicycleBrands();
}

export { syncBicycleBrands };