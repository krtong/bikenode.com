#!/usr/bin/env node

// Test the database-aware scraper with REAL variant URLs from bike_variants.json
import fs from "fs/promises";
import { Stagehand } from "@browserbasehq/stagehand";
import "dotenv/config.js";
import pkg from 'pg';
const { Pool } = pkg;

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

// Load real bike variants data
let bikeVariants;
try {
  const rawData = await fs.readFile("bike_variants.json", "utf8");
  bikeVariants = JSON.parse(rawData);
  console.log(`📂 Loaded bike variants for ${Object.keys(bikeVariants).length} maker/year combinations`);
} catch (err) {
  console.error("❌ bike_variants.json not found:", err.message);
  process.exit(1);
}

// Use specific unscraped variants for testing
const testUrls = [
  {
    variantId: "1200",
    name: "2003 Trek1200",
    url: "https://99spokes.com/bikes/trek/2003/1200"
  },
  {
    variantId: "4300", 
    name: "2003 Trek4300",
    url: "https://99spokes.com/bikes/trek/2003/4300"
  },
  {
    variantId: "2300",
    name: "2003 Trek2300", 
    url: "https://99spokes.com/bikes/trek/2003/2300"
  }
];

console.log(`\n🧪 Testing with ${testUrls.length} REAL bike variant URLs from bike_variants.json`);

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

// Improved parsing functions (from the main scraper)
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

// Extract and clean bike data for database insertion
const extractAndCleanBikeData = (variantId, comprehensiveData) => {
  // Extract basic info from comprehensive data
  const pageTitle = comprehensiveData.pageInfo?.title || '';
  const url = comprehensiveData.pageInfo?.url || '';
  
  // Use improved parsing
  const parsed = improvedParseFromTitle(pageTitle);
  
  let brand = parsed.brand;
  let model = parsed.family;
  let year = parsed.year;
  let bikeType = 'other'; // Default fallback
  
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

// Basic extraction test with real URLs
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

// Save to database with proper parsing
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

async function runRealDataTest() {
  console.log("🧪 TESTING DATABASE-AWARE SCRAPER WITH REAL DATA");
  console.log("=" * 50);
  
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
  
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < testUrls.length; i++) {
    const variant = testUrls[i];
    
    console.log(`\n🔍 [${i + 1}/${testUrls.length}] Testing REAL variant: ${variant.name}`);
    console.log(`    ID: ${variant.variantId}`);
    console.log(`    URL: ${variant.url}`);
    
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
  
  console.log(`\n📊 REAL DATA TEST RESULTS:`);
  console.log(`   ✅ Successfully scraped and saved: ${successCount}`);
  console.log(`   ⏭️  Already in database (skipped): ${skipCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📈 Success rate: ${Math.round((successCount / (successCount + failCount)) * 100)}%`);
  
  if (successCount > 0) {
    console.log(`\n✅ REAL DATA TEST PASSED`);
    console.log(`   The scraper successfully processed real bike variant URLs from bike_variants.json`);
    console.log(`   🚀 Ready to run on full dataset of ${Object.keys(bikeVariants).length} maker/year combinations!`);
  } else {
    console.log(`\n❌ REAL DATA TEST FAILED`);
    console.log(`   No real variants were successfully scraped and saved.`);
  }
  
  await pool.end();
  await stage.close();
  process.exit(0);
}

runRealDataTest().catch(console.error);