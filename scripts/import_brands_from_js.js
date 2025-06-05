#!/usr/bin/env node
import pg from 'pg';
import chalk from 'chalk';
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
 * Get list of existing brand names from database
 */
async function getExistingBrandNames(pool) {
  try {
    const result = await pool.query('SELECT name, normalized_name FROM bicycle_brands');
    return {
      names: new Set(result.rows.map(row => row.name)),
      normalizedNames: new Set(result.rows.map(row => row.normalized_name))
    };
  } catch (error) {
    console.error('Error getting existing brands:', error.message);
    return { names: new Set(), normalizedNames: new Set() };
  }
}

/**
 * Normalize brand name for comparison
 */
function normalizeBrandName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Map your JSON structure to existing table schema
 */
function mapToExistingSchema(brandJson) {
  const normalizedName = normalizeBrandName(brandJson.brand_name);
  
  return {
    name: brandJson.brand_name,
    normalized_name: normalizedName,
    official_name: brandJson.brand_name,
    year_established: brandJson.founding?.year || null,
    founder: Array.isArray(brandJson.founders) ? brandJson.founders.join(', ') : null,
    headquarters_location: brandJson.headquarters?.city && brandJson.headquarters?.state_province 
      ? `${brandJson.headquarters.city}, ${brandJson.headquarters.state_province}, ${brandJson.headquarters.country}`
      : null,
    country: brandJson.founding?.location?.country || brandJson.headquarters?.country || null,
    parent_company: brandJson.parent_company || null,
    subsidiaries: brandJson.subsidiaries || [],
    website_url: brandJson.website || null,
    wikipedia_url: brandJson.wikipedia_url || null,
    logo_url: brandJson.logo?.logo_url || null,
    logo_icon_url: brandJson.logo?.icon_url || null,
    company_description: brandJson.description || null,
    social_media: JSON.stringify(brandJson.social_media || {}),
    specialties: brandJson.famous_models || [],
    scraped_at: new Date(),
    data_quality_score: 0.9 // High score since this is curated data
  };
}

/**
 * Insert brand into existing bicycle_brands table
 */
async function insertIntoExistingTable(pool, brandData) {
  const query = `
    INSERT INTO bicycle_brands (
      name, normalized_name, official_name, year_established, founder,
      headquarters_location, country, parent_company, subsidiaries,
      website_url, wikipedia_url, logo_url, logo_icon_url,
      company_description, social_media, specialties, scraped_at, data_quality_score
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
    )
  `;
  
  const values = [
    brandData.name, brandData.normalized_name, brandData.official_name,
    brandData.year_established, brandData.founder, brandData.headquarters_location,
    brandData.country, brandData.parent_company, brandData.subsidiaries,
    brandData.website_url, brandData.wikipedia_url, brandData.logo_url,
    brandData.logo_icon_url, brandData.company_description, brandData.social_media,
    brandData.specialties, brandData.scraped_at, brandData.data_quality_score
  ];
  
  await pool.query(query, values);
}

/**
 * Main function
 */
async function importBrandsFromJS() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(chalk.blue('🔄 Importing brands from bicycle_brands.js...'));
    
    // Connect to database
    const client = await pool.connect();
    console.log(chalk.green('✅ Database connection established'));
    client.release();
    
    // Get existing brand names
    const existing = await getExistingBrandNames(pool);
    console.log(chalk.blue(`📊 Found ${existing.names.size} existing brands in database`));
    
    // Import the JS file (using dynamic import since we're using ES modules)
    const brandFilePath = path.join(__dirname, '../scrapers/bicycle_brands.js');
    console.log(chalk.blue(`📂 Loading brands from: ${brandFilePath}`));
    
    // Convert to file URL for dynamic import
    const { default: brandinfo } = await import(`file://${brandFilePath}`);
    
    if (!Array.isArray(brandinfo)) {
      console.error(chalk.red('❌ Expected brandinfo to be an array'));
      process.exit(1);
    }
    
    console.log(chalk.blue(`📊 Found ${brandinfo.length} brand(s) in JS file`));
    
    // Filter new brands
    const newBrands = brandinfo.filter(brand => {
      const normalizedName = normalizeBrandName(brand.brand_name);
      return !existing.names.has(brand.brand_name) && !existing.normalizedNames.has(normalizedName);
    });
    
    const existingBrands = brandinfo.filter(brand => {
      const normalizedName = normalizeBrandName(brand.brand_name);
      return existing.names.has(brand.brand_name) || existing.normalizedNames.has(normalizedName);
    });
    
    console.log(chalk.blue('\n📋 Import Analysis:'));
    console.log(chalk.green(`✅ New brands to add: ${newBrands.length}`));
    console.log(chalk.yellow(`⚠️  Already in database: ${existingBrands.length}`));
    
    if (existingBrands.length > 0) {
      console.log(chalk.gray(`   Skipping: ${existingBrands.map(b => b.brand_name).slice(0, 5).join(', ')}${existingBrands.length > 5 ? '...' : ''}`));
    }
    
    if (newBrands.length === 0) {
      console.log(chalk.green('🎉 All brands are already in the database!'));
      return;
    }
    
    console.log(chalk.blue(`\n🚀 Adding ${newBrands.length} new brand(s)...`));
    
    // Add new brands
    let successCount = 0;
    let errorCount = 0;
    
    for (const brandData of newBrands) {
      try {
        const mappedData = mapToExistingSchema(brandData);
        await insertIntoExistingTable(pool, mappedData);
        
        console.log(chalk.green(`✅ Added: ${brandData.brand_name}`));
        successCount++;
      } catch (error) {
        console.error(chalk.red(`❌ Failed to add: ${brandData.brand_name} - ${error.message}`));
        errorCount++;
      }
    }
    
    console.log(chalk.blue('\n📊 Import Summary:'));
    console.log(chalk.green(`✅ Successfully added: ${successCount} brands`));
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

importBrandsFromJS();