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
    data_quality_score: 0.8 // Default score
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
 * Clean JSON content more aggressively
 */
function cleanJsonContent(content) {
  // Split into lines and process each line
  const lines = content.split('\n');
  const cleanedLines = lines.map(line => {
    // Remove everything after // comments
    const commentIndex = line.indexOf('//');
    if (commentIndex !== -1) {
      line = line.substring(0, commentIndex);
    }
    return line.trim();
  });
  
  // Rejoin and remove trailing commas
  let cleaned = cleanedLines.join('\n');
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  return cleaned;
}

/**
 * Main function
 */
async function addToExistingTable() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(chalk.blue('🔄 Adding to existing bicycle_brands table...'));
    
    // Connect to database
    const client = await pool.connect();
    console.log(chalk.green('✅ Database connection established'));
    client.release();
    
    // Get existing brand names
    const existing = await getExistingBrandNames(pool);
    console.log(chalk.blue(`📊 Found ${existing.names.size} existing brands in database`));
    
    // Read JSON file
    const filePath = path.join(__dirname, '../scrapers/bicycle_brands.json');
    console.log(chalk.blue(`📂 Reading brands from: ${filePath}`));
    
    let rawContent;
    try {
      rawContent = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error(chalk.red('❌ Could not read bicycle_brands.json file'));
      process.exit(1);
    }
    
    // Clean and parse JSON
    let brandsData;
    try {
      const cleanContent = cleanJsonContent(rawContent);
      const parsedData = JSON.parse(cleanContent);
      
      // Handle both single object and array
      if (Array.isArray(parsedData)) {
        brandsData = parsedData;
      } else {
        brandsData = [parsedData];
      }
    } catch (parseError) {
      console.error(chalk.red('❌ JSON parsing failed:'), parseError.message);
      console.log(chalk.yellow('📝 Try cleaning the JSON file manually first'));
      process.exit(1);
    }
    
    console.log(chalk.blue(`📊 Found ${brandsData.length} brand(s) in JSON file`));
    
    // Filter new brands
    const newBrands = brandsData.filter(brand => {
      const normalizedName = normalizeBrandName(brand.brand_name);
      return !existing.names.has(brand.brand_name) && !existing.normalizedNames.has(normalizedName);
    });
    
    console.log(chalk.green(`✅ New brands to add: ${newBrands.length}`));
    
    if (newBrands.length === 0) {
      console.log(chalk.green('🎉 All brands are already in the database!'));
      return;
    }
    
    // Add new brands
    let successCount = 0;
    for (const brandData of newBrands) {
      try {
        const mappedData = mapToExistingSchema(brandData);
        await insertIntoExistingTable(pool, mappedData);
        
        console.log(chalk.green(`✅ Added: ${brandData.brand_name}`));
        successCount++;
      } catch (error) {
        console.error(chalk.red(`❌ Failed to add: ${brandData.brand_name} - ${error.message}`));
      }
    }
    
    console.log(chalk.blue(`\n📊 Successfully added ${successCount} brands`));
    
    const countResult = await pool.query('SELECT COUNT(*) FROM bicycle_brands');
    console.log(chalk.blue(`📈 Total bicycle brands in database: ${countResult.rows[0].count}`));
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addToExistingTable();