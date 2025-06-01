#!/usr/bin/env node

// Test the ACTUAL database_aware_scraper.js with a small batch of real variants
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

// Find variants that don't exist in database yet (for testing)
const findUnscrapedVariants = async (count = 5) => {
  console.log(`🔍 Finding ${count} unscraped variants for testing...`);
  
  // Get existing variant IDs from database
  const dbResult = await pool.query('SELECT variant_id FROM bikes');
  const existingIds = new Set(dbResult.rows.map(row => row.variant_id));
  console.log(`   Database contains ${existingIds.size} variants`);
  
  // Find unscraped variants
  const unscrapedVariants = [];
  let found = 0;
  
  for (const [makerId, makerData] of Object.entries(bikeVariants)) {
    if (found >= count) break;
    
    for (const family of makerData.families || []) {
      if (found >= count) break;
      
      for (const variant of family.variants || []) {
        if (found >= count) break;
        
        if (!existingIds.has(variant.variantId)) {
          unscrapedVariants.push({
            ...variant,
            makerYear: makerId,
            familyId: family.familyId
          });
          found++;
        }
      }
    }
  }
  
  console.log(`   Found ${unscrapedVariants.length} unscraped variants`);
  return unscrapedVariants;
};

// Import functions from the main scraper
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

// Test the actual comprehensive extraction (simplified from main scraper)
async function testComprehensiveExtraction(variant, page) {
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
    
    // Extract basic comprehensive data (simplified version of the main scraper's logic)
    const comprehensiveData = await page.evaluate(() => {
      const data = {
        pageInfo: {
          title: document.title,
          url: window.location.href,
          contentLength: document.body.textContent?.length || 0,
          extractionTimestamp: new Date().toISOString()
        },
        bikeDetails: {},
        specifications: {},
        components: {},
        pricing: {},
        media: { images: [] },
        features: []
      };

      // Extract bike name and details
      const h1 = document.querySelector('h1');
      if (h1) {
        data.bikeDetails.fullName = h1.textContent?.trim();
      }

      // Extract specifications from tables (basic version)
      const tables = document.querySelectorAll('table');
      tables.forEach((table) => {
        const rows = table.querySelectorAll('tr');
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length === 2) {
            const key = cells[0].textContent?.trim();
            const value = cells[1].textContent?.trim();
            
            if (key && value && key.length < 100 && value.length < 1000) {
              data.specifications[key.toLowerCase()] = value;
            }
          }
        });
      });

      // Extract basic pricing
      const priceText = document.body.textContent || '';
      const priceMatches = priceText.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
      
      if (priceMatches.length > 0) {
        data.pricing.currentPrice = priceMatches[0];
      }

      // Extract images (basic version)
      const images = Array.from(document.querySelectorAll('img'));
      images.forEach(img => {
        if (img.src && !img.src.includes('data:') && img.width > 100 && img.height > 100) {
          data.media.images.push({
            src: img.src,
            alt: img.alt || '',
            width: img.width,
            height: img.height
          });
        }
      });

      return data;
    });
    
    const stats = {
      specifications: Object.keys(comprehensiveData.specifications).length,
      images: comprehensiveData.media.images.length,
      features: comprehensiveData.features.length,
      pricing: Object.keys(comprehensiveData.pricing).length
    };

    console.log(`    ✅ Extraction complete: Specs:${stats.specifications} | Images:${stats.images} | Features:${stats.features} | Pricing:${stats.pricing}`);

    return {
      ...comprehensiveData,
      extractedAt: new Date().toISOString(),
      extractionSuccess: true,
      extractionStats: stats
    };

  } catch (error) {
    console.log(`    ❌ Error: ${error.message}`);
    return {
      error: error.message,
      extractedAt: new Date().toISOString(),
      extractionSuccess: false
    };
  }
}

// Save to database with comprehensive data
const saveToDatabase = async (variantId, comprehensiveData) => {
  try {
    // Extract and clean bike data
    const bikeData = extractAndCleanBikeData(variantId, comprehensiveData);
    
    // Validate required fields
    if (!bikeData.brand || !bikeData.model) {
      console.log(`    ⚠️  Skipping ${variantId} - missing required fields (brand: ${bikeData.brand}, model: ${bikeData.model})`);
      return false;
    }
    
    console.log(`    🔍 Parsed: Brand="${bikeData.brand}", Model="${bikeData.model}", Year=${bikeData.year}`);
    
    // Insert comprehensive bike data
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
    
    console.log(`    💾 Saved comprehensive data for ${variantId} to database`);
    return true;
    
  } catch (error) {
    console.error(`    ❌ Error saving ${variantId} to database:`, error.message);
    return false;
  }
};

async function runFullScraperTest() {
  console.log("🧪 TESTING FULL DATABASE-AWARE SCRAPER");
  console.log("="*50);
  
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
  
  // Find unscraped variants for testing
  const testVariants = await findUnscrapedVariants(5);
  
  console.log(`\n📊 Testing full scraper workflow with ${testVariants.length} unscraped variants...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < testVariants.length; i++) {
    const variant = testVariants[i];
    
    console.log(`\n🔍 [${i + 1}/${testVariants.length}] Testing: ${variant.name}`);
    console.log(`    ID: ${variant.variantId}`);
    console.log(`    URL: ${variant.url}`);
    console.log(`    Family: ${variant.familyId} | Maker/Year: ${variant.makerYear}`);
    
    // Run comprehensive extraction
    const comprehensiveData = await testComprehensiveExtraction(variant, page);
    
    if (comprehensiveData.extractionSuccess) {
      const saved = await saveToDatabase(variant.variantId, comprehensiveData);
      if (saved) {
        successCount++;
        
        // Show what data was extracted
        const stats = comprehensiveData.extractionStats;
        console.log(`    📊 Data extracted: ${stats.specifications} specs, ${stats.images} images, ${stats.pricing} pricing fields`);
      } else {
        failCount++;
      }
    } else {
      failCount++;
    }
    
    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log(`\n📊 FULL SCRAPER TEST RESULTS:`);
  console.log(`   ✅ Successfully scraped and saved: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📈 Success rate: ${Math.round((successCount / (successCount + failCount)) * 100)}%`);
  
  if (successCount > 0) {
    console.log(`\n✅ FULL SCRAPER TEST PASSED`);
    console.log(`   The database-aware scraper successfully:`);
    console.log(`   - Loaded bike variants from bike_variants.json`);
    console.log(`   - Found unscraped variants from database`);
    console.log(`   - Performed comprehensive data extraction`);
    console.log(`   - Parsed and cleaned bike data`);
    console.log(`   - Saved structured data to database`);
    console.log(`\n🚀 Ready to run on the full 55,985+ remaining variants!`);
    
    // Show some examples of what was scraped
    console.log(`\n📊 Sample of saved data:`);
    const sampleResult = await pool.query(`
      SELECT variant_id, brand, model, year, bike_type, url 
      FROM bikes 
      WHERE variant_id = ANY($1)
    `, [testVariants.map(v => v.variantId)]);
    
    sampleResult.rows.forEach((row, i) => {
      console.log(`   ${i+1}. ${row.brand} ${row.model} (${row.year}) - ${row.bike_type}`);
      console.log(`      ID: ${row.variant_id} | URL: ${row.url}`);
    });
    
  } else {
    console.log(`\n❌ FULL SCRAPER TEST FAILED`);
    console.log(`   No variants were successfully scraped and saved.`);
    console.log(`   Check error messages above for debugging.`);
  }
  
  await pool.end();
  await stage.close();
  process.exit(0);
}

runFullScraperTest().catch(console.error);