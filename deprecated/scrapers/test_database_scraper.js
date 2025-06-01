#!/usr/bin/env node

// Test the database-aware scraper with a small subset
import fs from "fs/promises";
import { Stagehand } from "@browserbasehq/stagehand";
import "dotenv/config.js";
import pkg from 'pg';
const { Pool } = pkg;

// Test with variants that don't exist in database yet
const TEST_VARIANTS = [
  {
    "variantId": "test-variant-1",
    "name": "2024 Trek Fuel EX 9.8",
    "url": "https://99spokes.com/bikes/trek/2024/fuel-ex-9-8"
  },
  {
    "variantId": "test-variant-2", 
    "name": "2024 Specialized Stumpjumper Expert",
    "url": "https://99spokes.com/bikes/specialized/2024/stumpjumper-expert"
  }
];

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/bikenode?sslmode=disable",
});

// Test database connection
try {
  const client = await pool.connect();
  console.log("✅ Database connection established");
  client.release();
} catch (err) {
  console.error("❌ Database connection failed:", err.message);
  process.exit(1);
}

// Check if variant exists in database
const checkVariantExistsInDatabase = async (variantId) => {
  try {
    const result = await pool.query(`
      SELECT variant_id FROM bikes WHERE variant_id = $1
    `, [variantId]);
    
    return result.rows.length > 0;
  } catch (error) {
    console.error(`❌ Error checking variant ${variantId} in database:`, error.message);
    return false;
  }
};

// Basic extraction test (simplified version)
async function testExtractBikeData(variant, page) {
  try {
    console.log(`    🌐 Navigating to: ${variant.url}`);
    
    const response = await page.goto(variant.url, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    
    if (response && response.status() >= 400) {
      throw new Error(`HTTP_${response.status()}: ${response.statusText()}`);
    }
    
    await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds
    
    const pageTitle = await page.title();
    console.log(`    📄 Page title: "${pageTitle}"`);
    
    // Simple success check
    if (pageTitle && pageTitle.length > 10) {
      return {
        pageInfo: { title: pageTitle, url: variant.url },
        extractionSuccess: true,
        extractedAt: new Date().toISOString()
      };
    } else {
      throw new Error("No meaningful page title found");
    }
    
  } catch (error) {
    console.log(`    ❌ Error: ${error.message}`);
    return {
      error: error.message,
      extractionSuccess: false,
      extractedAt: new Date().toISOString()
    };
  }
}

// Improved parsing functions from the main scraper
const improvedParseFromTitle = (pageTitle) => {
  if (!pageTitle || pageTitle.trim() === '') {
    return { brand: null, family: null, year: null };
  }

  // Clean the title first - remove 99spokes junk
  let cleanTitle = pageTitle
    .replace(/\s*–\s*Specs.*$/i, '') // Remove "– Specs, Comparisons, Reviews – 99 Spokes"
    .replace(/\s*-\s*Specs.*$/i, '')  // Alternative format
    .replace(/\s*\|\s*99\s*Spokes.*$/i, '') // Another format
    .trim();

  if (!cleanTitle) {
    return { brand: null, family: null, year: null };
  }

  // Extract year first (4-digit year between 2000-2030)
  let year = null;
  const yearMatch = cleanTitle.match(/\b(20[0-3]\d)\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
    // Remove the year from the title
    cleanTitle = cleanTitle.replace(yearMatch[0], '').trim();
  }

  // If title starts with year+brand concatenated (like "2007Trek"), handle it
  if (cleanTitle.match(/^20[0-3]\d[A-Z]/)) {
    const match = cleanTitle.match(/^(20[0-3]\d)([A-Z][a-z]+)(.*)$/);
    if (match) {
      year = parseInt(match[1]);
      const brand = match[2];
      const family = match[3].trim();
      return { brand, family, year };
    }
  }

  // Split by spaces and parse normally
  const parts = cleanTitle.split(/\s+/).filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return { brand: null, family: null, year: null };
  }

  // First part should be brand
  const brand = parts[0];
  
  // Rest is family/model
  const family = parts.slice(1).join(' ').trim();

  return { 
    brand: brand || null, 
    family: family || null, 
    year 
  };
};

// Further clean family names
const cleanFamilyNameImproved = (family, brand, year) => {
  if (!family) return family;
  
  let cleaned = family;
  
  // Remove brand if it appears in family
  if (brand) {
    const brandPattern = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    cleaned = cleaned.replace(brandPattern, '').trim();
  }
  
  // Remove year if it appears in family
  if (year) {
    cleaned = cleaned.replace(year.toString(), '').trim();
  }
  
  // Remove common junk patterns
  cleaned = cleaned
    .replace(/\s*–\s*Specs.*$/i, '')
    .replace(/\s*-\s*Specs.*$/i, '')
    .replace(/\s*\|\s*99\s*Spokes.*$/i, '')
    .replace(/\s*Specs.*$/i, '')
    .replace(/\s*Comparisons.*$/i, '')
    .replace(/\s*Reviews.*$/i, '')
    .trim();
  
  // Remove leading/trailing punctuation
  cleaned = cleaned.replace(/^[^\w]+|[^\w]+$/g, '');
  
  return cleaned || family; // Fallback to original if we cleaned too much
};

// Extract and clean bike data for database insertion
const extractAndCleanBikeData = (variantId, comprehensiveData) => {
  // Extract basic info from comprehensive data
  const pageTitle = comprehensiveData.pageInfo?.title || '';
  const url = comprehensiveData.pageInfo?.url || '';
  
  // Use improved parsing
  const parsed = improvedParseFromTitle(pageTitle);
  
  // Clean the family name further
  const cleanedFamily = cleanFamilyNameImproved(parsed.family, parsed.brand, parsed.year);
  
  let brand = parsed.brand;
  let model = cleanedFamily;
  let year = parsed.year;
  let bikeType = '';
  
  // Determine bike type from content
  const contentText = JSON.stringify(comprehensiveData).toLowerCase();
  if (contentText.includes('mountain') || contentText.includes('mtb')) {
    bikeType = 'mountain';
  } else if (contentText.includes('road') || contentText.includes('racing')) {
    bikeType = 'road';
  } else if (contentText.includes('gravel') || contentText.includes('cyclocross')) {
    bikeType = 'gravel';
  } else if (contentText.includes('hybrid') || contentText.includes('commuter')) {
    bikeType = 'hybrid';
  } else if (contentText.includes('electric') || contentText.includes('e-bike') || contentText.includes('ebike')) {
    bikeType = 'electric';
  } else {
    bikeType = 'other';
  }
  
  return {
    variantId,
    brand: brand || null,
    model: model || null,
    year,
    bikeType: bikeType || null,
    url,
    fullName: pageTitle || null,
    manufacturer: brand || null,
    comprehensiveData: JSON.stringify(comprehensiveData)
  };
};

// Simplified save to database with proper parsing
const saveToDatabase = async (variantId, comprehensiveData) => {
  try {
    // Check if exists
    const exists = await checkVariantExistsInDatabase(variantId);
    
    if (exists) {
      console.log(`    💾 Variant ${variantId} already exists in database - skipping`);
      return true;
    }
    
    // Extract and clean bike data
    const bikeData = extractAndCleanBikeData(variantId, comprehensiveData);
    
    // Validate required fields
    if (!bikeData.brand || !bikeData.model) {
      console.log(`    ⚠️  Skipping ${variantId} - missing required fields (brand: ${bikeData.brand}, model: ${bikeData.model})`);
      return false;
    }
    
    console.log(`    🔍 Parsed: Brand="${bikeData.brand}", Model="${bikeData.model}", Year=${bikeData.year}`);
    
    // Insert with proper bike data structure
    await pool.query(`
      INSERT INTO bikes (
        variant_id, brand, model, year, bike_type, url, full_name, manufacturer, comprehensive_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      bikeData.variantId,
      bikeData.brand,
      bikeData.model,
      bikeData.year,
      bikeData.bikeType,
      bikeData.url,
      bikeData.fullName,
      bikeData.manufacturer,
      bikeData.comprehensiveData
    ]);
    
    console.log(`    💾 Saved ${variantId} to database`);
    return true;
    
  } catch (error) {
    console.error(`    ❌ Error saving ${variantId} to database:`, error.message);
    return false;
  }
};

async function runTest() {
  console.log("🧪 TESTING DATABASE-AWARE SCRAPER");
  console.log("=====================================");
  
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY missing"); 
    process.exit(1);
  }
  
  const stage = new Stagehand({ 
    env: "LOCAL", 
    apiKey: process.env.OPENAI_API_KEY,
    verbose: 0
  });
  
  await stage.init();
  const page = stage.page;
  
  console.log(`\n📊 Testing with ${TEST_VARIANTS.length} variants...`);
  
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < TEST_VARIANTS.length; i++) {
    const variant = TEST_VARIANTS[i];
    
    console.log(`\n🔍 [${i + 1}/${TEST_VARIANTS.length}] Testing ${variant.name}`);
    console.log(`    ID: ${variant.variantId}`);
    
    // Check if already in database
    const exists = await checkVariantExistsInDatabase(variant.variantId);
    if (exists) {
      console.log(`    ⏭️  Already in database - skipping scrape`);
      skipCount++;
      continue;
    }
    
    // Attempt to scrape
    const comprehensiveData = await testExtractBikeData(variant, page);
    
    if (comprehensiveData.extractionSuccess) {
      const saved = await saveToDatabase(variant.variantId, comprehensiveData);
      if (saved) {
        successCount++;
      } else {
        failCount++;
      }
    } else {
      failCount++;
    }
    
    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log(`\n📊 TEST RESULTS:`);
  console.log(`   ✅ Successfully scraped and saved: ${successCount}`);
  console.log(`   ⏭️  Already in database (skipped): ${skipCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📈 Success rate: ${Math.round((successCount / (successCount + failCount)) * 100)}%`);
  
  if (successCount > 0) {
    console.log(`\n✅ DATABASE-AWARE SCRAPER TEST PASSED`);
    console.log(`   The scraper successfully:`)
    console.log(`   - Connected to database`);
    console.log(`   - Checked for existing variants`);
    console.log(`   - Scraped new bike data`);
    console.log(`   - Saved data to database`);
    console.log(`\n🚀 Ready to run on full dataset!`);
  } else {
    console.log(`\n❌ DATABASE-AWARE SCRAPER TEST FAILED`);
    console.log(`   No variants were successfully scraped and saved.`);
  }
  
  await pool.end();
  await stage.close();
  process.exit(0);
}

runTest().catch(console.error);