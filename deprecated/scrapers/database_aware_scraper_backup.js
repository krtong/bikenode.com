#!/usr/bin/env node
/*  Database-aware comprehensive scraper - checks database instead of JSON files  */

// Suppress punycode deprecation warning from dependencies
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('punycode')) {
    return; // Ignore punycode deprecation warnings
  }
  console.warn(warning);
});

import fs from "fs/promises";
import { Stagehand } from "@browserbasehq/stagehand";
import "dotenv/config.js";
import pkg from 'pg';
const { Pool } = pkg;

/* ---------- Enhanced config ---------- */
const NAV_DELAY = 1000;
const VARIANT_DELAY = 800;
const SAVE_EVERY = 5; // Keep frequent saves for data safety 
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const TIMEOUT = 45000;
const MAX_FILE_SIZE = 400000000; // 400MB limit to prevent JSON stringify errors

/* ---------- Database connection ---------- */
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

/* ---------- Database functions ---------- */

// Load already scraped variants from database instead of JSON files
const loadScrapedVariantsFromDatabase = async () => {
  try {
    const result = await pool.query(`
      SELECT variant_id, url, comprehensive_data, updated_at
      FROM bikes 
      WHERE comprehensive_data IS NOT NULL
    `);
    
    const scrapedVariants = {};
    
    for (const row of result.rows) {
      // Convert database format to scraper format
      scrapedVariants[row.variant_id] = {
        variantId: row.variant_id,
        url: row.url,
        comprehensiveData: row.comprehensive_data,
        extractedAt: row.updated_at?.toISOString(),
        extractionSuccess: true
      };
    }
    
    console.log(`📂 Loaded ${result.rows.length} already-scraped variants from database`);
    return scrapedVariants;
    
  } catch (error) {
    console.error("❌ Error loading scraped variants from database:", error.message);
    return {};
  }
};

// Parse brand and family from scraped data (same logic as migration)
const parseBrandAndFamily = (brandField) => {
  // Special handling for common concatenated cases
  if (brandField.startsWith("TrekMadone")) {
    return ["Trek", brandField.replace("Trek", "")];
  }
  if (brandField.startsWith("TrekDomane")) {
    return ["Trek", brandField.replace("Trek", "")];
  }
  if (brandField.startsWith("TrekFuel")) {
    return ["Trek", brandField.replace("Trek", "")];
  }
  if (brandField.startsWith("SpecializedS-Works")) {
    return ["Specialized", brandField.replace("Specialized", "")];
  }
  if (brandField.startsWith("SpecializedStumpjumper")) {
    return ["Specialized", brandField.replace("Specialized", "")];
  }
  if (brandField.startsWith("SpecializedTarmac")) {
    return ["Specialized", brandField.replace("Specialized", "")];
  }
  if (brandField.startsWith("CUBESTEREO")) {
    return ["CUBE", brandField.replace("CUBE", "")];
  }
  if (brandField.startsWith("CUBEREACTION")) {
    return ["CUBE", brandField.replace("CUBE", "")];
  }
  
  // Try to identify Trek bikes that start with "Trek" + numbers/letters
  if (brandField.startsWith("Trek") && brandField.length > 4) {
    return ["Trek", brandField.replace("Trek", "")];
  }
  
  // Try to identify Specialized bikes
  if (brandField.startsWith("Specialized") && brandField.length > 11) {
    return ["Specialized", brandField.replace("Specialized", "")];
  }
  
  // Try to identify Cannondale bikes
  if (brandField.startsWith("Cannondale") && brandField.length > 10) {
    return ["Cannondale", brandField.replace("Cannondale", "")];
  }
  
  // Fallback: split on first space
  if (brandField.includes(" ")) {
    const parts = brandField.split(" ");
    return [parts[0], parts.slice(1).join(" ")];
  }
  
  // Try to split on capital letters (e.g., "TrekMadone" -> "Trek" + "Madone")
  const match = brandField.match(/([A-Z][a-z]+)([A-Z].*)/);
  if (match) {
    return [match[1], match[2]];
  }
  
  // If all else fails, treat the whole thing as the brand
  return [brandField, ""];
};

// Clean family name (same logic as migration)
const cleanFamilyName = (family, brand, year, variantId, comprehensiveData) => {
  const original = family;
  family = family.trim();
  
  // Remove brand name if it appears in family
  if (brand) {
    const brandPattern = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    family = family.replace(brandPattern, '').trim();
  }
  
  // Remove year if it appears in family
  if (year > 0) {
    family = family.replace(year.toString(), '').trim();
  }
  
  // Remove variant ID components if they appear in family
  if (variantId) {
    const variantParts = variantId.split(/[-_\s]+/);
    for (const part of variantParts) {
      if (part.length > 2) {
        const partPattern = new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        family = family.replace(partPattern, '').trim();
      }
    }
  }
  
  // Remove common non-family terms
  const termsToRemove = [
    'S-Works', 'Men\'s', 'Women\'s', 'Mens', 'Womens', 
    'Step-Through', 'Step Through', 'Trapeze', 'Diamant',
    'Frame', 'Frameset', 'Frame Kit', 'Complete',
    'Road', 'Mountain', 'Hybrid', 'Electric', 'E-Bike', 'Gravel',
    'Small', 'Medium', 'Large', 'XS', 'S', 'M', 'L', 'XL', 'XXL',
    '27.5', '29', '26', '700c', '650b', 'Disc', 'Rim'
  ];
  
  for (const term of termsToRemove) {
    const termPattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    family = family.replace(termPattern, '').trim();
  }
  
  // Clean up multiple spaces
  family = family.replace(/\s+/g, ' ').trim();
  
  // If we removed everything, fall back to original with basic cleanup
  if (!family || family.length < 2) {
    family = original.trim();
    if (brand) {
      family = family.replace(brand, '').trim();
    }
    if (year > 0) {
      family = family.replace(year.toString(), '').trim();
    }
    if (!family) {
      family = "Model";
    }
  }
  
  // Final length check
  if (family.length > 150) {
    const spaceIndex = family.lastIndexOf(' ', 150);
    family = spaceIndex > 20 ? family.substring(0, spaceIndex) : family.substring(0, 150);
  }
  
  return family;
};

// IMPROVED parsing from title
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

// Extract bike data from scraped content and clean it
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
  
  // Extract pricing
  let priceMin = null;
  let priceMax = null;
  
  if (comprehensiveData.pricing) {
    const pricing = comprehensiveData.pricing;
    const priceFields = [pricing.currentPrice, pricing.msrp, pricing.manufacturerPrice, pricing.salePrice];
    
    for (const priceField of priceFields) {
      if (priceField) {
        const priceMatch = priceField.match(/\$?([\d,]+)/);
        if (priceMatch) {
          const price = parseInt(priceMatch[1].replace(/,/g, '')) * 100; // Convert to cents
          if (!priceMin || price < priceMin) priceMin = price;
          if (!priceMax || price > priceMax) priceMax = price;
        }
      }
    }
  }
  
  // Extract other specs
  const weight = comprehensiveData.bikeDetails?.weight || null;
  const suspension = comprehensiveData.bikeDetails?.suspension || null;
  const frameMaterial = comprehensiveData.bikeDetails?.frameMaterial || null;
  const wheelSize = comprehensiveData.bikeDetails?.wheelSize || null;
  
  return {
    variantId,
    brand: brand || null,
    model: model || null,
    year,
    bikeType: bikeType || null,
    priceMin,
    priceMax,
    url,
    fullName: pageTitle || null,
    manufacturer: brand || null,
    description: comprehensiveData.bikeDetails?.description || null,
    weight: weight && weight.length <= 50 ? weight : null,
    frameMaterial: frameMaterial && frameMaterial.length <= 190 ? frameMaterial : frameMaterial?.substring(0, 190),
    wheelSize: wheelSize && wheelSize.length <= 50 ? wheelSize : null,
    suspension: suspension && suspension.length <= 100 ? suspension : suspension?.substring(0, 100),
    comprehensiveData: JSON.stringify(comprehensiveData)
  };
};

// Save scraped data to database with proper bike data extraction
const saveScrapedDataToDatabase = async (variantId, comprehensiveData) => {
  try {
    // Extract and clean the bike data
    const bikeData = extractAndCleanBikeData(variantId, comprehensiveData);
    
    // Check if bike already exists in database
    const existsResult = await pool.query(`
      SELECT variant_id FROM bikes WHERE variant_id = $1
    `, [variantId]);
    
    if (existsResult.rows.length > 0) {
      // Update existing bike
      await pool.query(`
        UPDATE bikes SET
          brand = $2,
          model = $3,
          year = $4,
          bike_type = $5,
          price_min = $6,
          price_max = $7,
          url = $8,
          full_name = $9,
          manufacturer = $10,
          description = $11,
          weight = $12,
          frame_material = $13,
          wheel_size = $14,
          suspension = $15,
          comprehensive_data = $16,
          updated_at = CURRENT_TIMESTAMP
        WHERE variant_id = $1
      `, [
        variantId, bikeData.brand, bikeData.model, bikeData.year, bikeData.bikeType,
        bikeData.priceMin, bikeData.priceMax, bikeData.url, bikeData.fullName,
        bikeData.manufacturer, bikeData.description, bikeData.weight,
        bikeData.frameMaterial, bikeData.wheelSize, bikeData.suspension,
        bikeData.comprehensiveData
      ]);
      
      console.log(`💾 Updated ${variantId} in database`);
    } else {
      // Insert new bike
      await pool.query(`
        INSERT INTO bikes (
          variant_id, brand, model, year, bike_type, price_min, price_max, url,
          full_name, manufacturer, description, weight, frame_material, wheel_size,
          suspension, comprehensive_data, scraped_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `, [
        variantId, bikeData.brand, bikeData.model, bikeData.year, bikeData.bikeType,
        bikeData.priceMin, bikeData.priceMax, bikeData.url, bikeData.fullName,
        bikeData.manufacturer, bikeData.description, bikeData.weight,
        bikeData.frameMaterial, bikeData.wheelSize, bikeData.suspension,
        bikeData.comprehensiveData
      ]);
      
      console.log(`💾 Inserted ${variantId} into database`);
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error saving ${variantId} to database:`, error.message);
    return false;
  }
};

// Check if a variant exists in database (even if not fully scraped)
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

/* ---------- helpers ---------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Safe JSON saving that handles large objects by using chunked saves when needed
const safeJsonSave = async (filename, data) => {
  try {
    // Skip the test stringify and go directly to chunked save for large datasets
    const variantCount = Object.keys(data).length;
    
    if (variantCount > 10000) { // If we have more than 10k variants, use chunked save
      console.log(`⚠️  Large dataset detected (${variantCount} variants), using chunked save for ${filename}`);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const chunkSize = 1000;
      const variants = Object.keys(data);
      
      for (let i = 0; i < variants.length; i += chunkSize) {
        const chunk = {};
        const chunkVariants = variants.slice(i, i + chunkSize);
        
        for (const variantId of chunkVariants) {
          chunk[variantId] = data[variantId];
        }
        
        const chunkNum = Math.floor(i / chunkSize) + 1;
        const chunkFilename = `${filename.replace('.json', '')}_chunk_${chunkNum}_${timestamp}.json`;
        
        try {
          await fs.writeFile(chunkFilename, JSON.stringify(chunk, null, 2));
          console.log(`💾 Saved chunk ${chunkNum}: ${chunkFilename}`);
        } catch (chunkError) {
          console.error(`❌ Chunk ${chunkNum} failed: ${chunkError.message}`);
        }
      }
      
      return true;
    } else {
      // For smaller datasets, try normal save
      await fs.writeFile(filename, JSON.stringify(data, null, 2));
      console.log(`💾 Saved: ${filename}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Save failed for ${filename}: ${error.message}`);
    
    // Emergency chunked save if normal save fails
    console.log(`🚨 Attempting emergency chunked save...`);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const chunkSize = 500;
    const variants = Object.keys(data);
    
    for (let i = 0; i < variants.length; i += chunkSize) {
      const chunk = {};
      const chunkVariants = variants.slice(i, i + chunkSize);
      
      for (const variantId of chunkVariants) {
        chunk[variantId] = data[variantId];
      }
      
      const chunkNum = Math.floor(i / chunkSize) + 1;
      const chunkFilename = `${filename.replace('.json', '')}_emergency_chunk_${chunkNum}_${timestamp}.json`;
      
      try {
        await fs.writeFile(chunkFilename, JSON.stringify(chunk, null, 2));
        console.log(`🚨 Emergency chunk ${chunkNum}: ${chunkFilename}`);
      } catch (chunkError) {
        console.error(`❌ Chunk ${chunkNum} failed: ${chunkError.message}`);
      }
    }
    
    return false;
  }
};

const logProgress = (current, total, successful, failed) => {
  const percent = Math.round((current / total) * 100);
  const successRate = current > 0 ? Math.round((successful / current) * 100) : 0;
  console.log(`📊 Progress: ${current}/${total} (${percent}%) | Success: ${successful} (${successRate}%) | Failed: ${failed}`);
};

const createBackup = async (data, suffix = '') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `comprehensive_bike_specs_backup_${timestamp}${suffix}.json`;
  const saved = await safeJsonSave(backupFile, data);
  if (saved) {
    console.log(`💾 Backup created: ${backupFile}`);
  } else {
    console.log(`💾 Chunked backup created with timestamp: ${timestamp}${suffix}`);
  }
};

// MODIFIED: Load existing data from DATABASE instead of files
const loadAllExistingData = async () => {
  console.log(`📂 Loading existing scraped data from database...`);
  return await loadScrapedVariantsFromDatabase();
};

// Load the URLs file - this contains all 68,000+ variants that need to be scraped
const loadVariantUrls = async () => {
  try {
    const rawData = await fs.readFile("bike_variants.json", "utf8");
    const bikeVariants = JSON.parse(rawData);
    console.log(`📂 Loaded bike variants for ${Object.keys(bikeVariants).length} maker/year combinations`);
    return bikeVariants;
  } catch (err) {
    console.error("✖  bike_variants.json not found - this file contains all the URLs to scrape");
    process.exit(1);
  }
};

// Quality assessment function (same as original)
const assessDataQuality = (existingSpec) => {
  if (!existingSpec || !existingSpec.extractionSuccess) {
    return { score: 0, priority: 1, reason: 'No data or extraction failed', issues: ['no_data'] };
  }

  const data = existingSpec;
  let score = 0;
  const issues = [];

  // Check for basic data
  if (data.pageInfo?.title) score += 10;
  else issues.push('no_title');

  // Check specifications
  const specCount = Object.keys(data.specifications || {}).length;
  if (specCount > 10) score += 20;
  else if (specCount > 5) score += 15;
  else if (specCount > 0) score += 10;
  else issues.push('no_specs');

  // Check components
  const compCount = Object.keys(data.components || {}).reduce((sum, comp) => 
    sum + Object.keys(data.components[comp] || {}).length, 0);
  if (compCount > 15) score += 20;
  else if (compCount > 10) score += 15;
  else if (compCount > 5) score += 10;
  else issues.push('few_components');

  // Check geometry
  const geoCount = Object.keys(data.geometry || {}).length;
  const geoBySizeCount = Object.keys(data.geometryBySize || {}).length;
  if (geoCount > 5 || geoBySizeCount > 0) score += 15;
  else if (geoCount > 2) score += 10;
  else issues.push('no_geometry');

  // Check images
  const imageCount = data.media?.images?.length || 0;
  if (imageCount > 5) score += 10;
  else if (imageCount > 2) score += 5;
  else issues.push('few_images');

  // Check features
  const featureCount = data.features?.length || 0;
  if (featureCount > 10) score += 10;
  else if (featureCount > 5) score += 5;
  else issues.push('few_features');

  // Check pricing
  const pricingCount = Object.keys(data.pricing || {}).length;
  if (pricingCount > 2) score += 10;
  else if (pricingCount > 0) score += 5;
  else issues.push('no_pricing');

  // Check reviews/pros/cons
  const reviewsProCount = data.reviews?.pros?.length || 0;
  const reviewsConCount = data.reviews?.cons?.length || 0;
  if (reviewsProCount > 3 || reviewsConCount > 3) score += 5;

  // Determine priority based on score
  let priority;
  if (score < 40) priority = 2; // Incomplete
  else if (score < 60) priority = 3; // Needs improvement
  else priority = 4; // Good enough, could be refreshed

  return { score, priority, issues, reason: `Score: ${score}/100` };
};

/* ---------- set-up ---------- */
if (!process.env.OPENAI_API_KEY) {
  console.error("✖  OPENAI_API_KEY missing"); 
  process.exit(1);
}

const stage = new Stagehand({ 
  env: "LOCAL", 
  apiKey: process.env.OPENAI_API_KEY,
  verbose: 0
});
await stage.init();
const page = stage.page;

/* ---------- Load bike variants and existing data ---------- */
let bikeVariants = {};
let comprehensiveSpecs = {};
let processingLog = {
  startTime: new Date().toISOString(),
  totalVariants: 0,
  processedVariants: 0,
  successfulExtractions: 0,
  failedExtractions: 0,
  errors: [],
  lastProcessedVariantId: null,
  sessionHistory: []
};

// Load bike variants from the URL file
try {
  const rawData = await fs.readFile("bike_variants.json", "utf8");
  bikeVariants = JSON.parse(rawData);
  console.log(`📂 Loaded bike variants for ${Object.keys(bikeVariants).length} maker/year combinations`);
} catch (err) {
  console.error("✖  bike_variants.json not found - this file contains all the URLs to scrape");
  process.exit(1);
}

// Load existing comprehensive specs from DATABASE instead of JSON files
comprehensiveSpecs = await loadScrapedVariantsFromDatabase();
console.log(`📂 Loaded existing comprehensive specs for ${Object.keys(comprehensiveSpecs).length} variants from database`);

// Load processing log
try {
  const logData = await fs.readFile("comprehensive_processing_log.json", "utf8");
  processingLog = { ...processingLog, ...JSON.parse(logData) };
  console.log(`📜 Loaded processing log - Last session: ${processingLog.sessionHistory.length > 0 ? processingLog.sessionHistory[processingLog.sessionHistory.length - 1].endTime : 'N/A'}`);
} catch (err) {
  console.log("📄 Starting with new processing log");
}

/* ---------- ACTUAL extraction function based on the original scraper ---------- */
async function extractActualBikeData(variant, retryCount = 0) {
  try {
    console.log(`    🌐 Navigating to: ${variant.url}`);
    
    // Handle potential network issues and redirects with improved loading strategy
    let response;
    try {
      response = await page.goto(variant.url, {
        waitUntil: "domcontentloaded",
        timeout: TIMEOUT
      });
      
      // For slow pages, wait a bit more for content to load
      await sleep(2000);
      
      // Check if we have meaningful content, if not wait a bit more
      const contentCheck = await page.evaluate(() => {
        return document.body.textContent?.length > 5000;
      });
      
      if (!contentCheck) {
        console.log(`    ⏳ Page loading slowly, waiting additional time...`);
        await sleep(3000);
      }
      
    } catch (timeoutError) {
      if (timeoutError.message.includes('Timeout')) {
        console.log(`    ⏳ Initial timeout, trying with longer wait...`);
        // Try again with just domcontentloaded and longer timeout
        response = await page.goto(variant.url, {
          waitUntil: "domcontentloaded", 
          timeout: TIMEOUT * 2
        });
        await sleep(5000); // Give extra time for slow content
      } else {
        throw timeoutError;
      }
    }
    
    // Check HTTP status code
    if (response && response.status() >= 400) {
      console.log(`    🌐 HTTP ERROR: ${response.status()} - ${variant.url}`);
      throw new Error(`HTTP_${response.status()}: ${response.statusText()}`);
    }
    
    await sleep(NAV_DELAY);

    // Check if page loaded properly - detect 404s and other errors
    const pageTitle = await page.title();
    const pageStatus = await page.evaluate(() => {
      return {
        title: document.title,
        hasContent: document.body.textContent?.length > 1000,
        has404Text: document.title?.toLowerCase().includes('404') || 
                   document.title?.toLowerCase().includes('not found') ||
                   document.title?.toLowerCase().includes('page not found'),
        hasErrorText: document.title?.toLowerCase().includes('error') ||
                     (document.body.textContent?.toLowerCase().includes('error') &&
                      document.body.textContent?.toLowerCase().includes('something went wrong')),
        contentLength: document.body.textContent?.length || 0
      };
    });
    
    // Log 404s and other issues for later fixing
    if (!pageTitle || pageTitle.includes('404') || pageStatus.has404Text) {
      console.log(`    🔍 404 DETECTED: ${variant.url}`);
      console.log(`       Title: "${pageTitle}" | Content: ${pageStatus.contentLength} chars`);
      throw new Error(`404_NOT_FOUND: ${pageTitle}`);
    }
    
    if (pageTitle.includes('Error') || pageStatus.hasErrorText) {
      console.log(`    ⚠️  PAGE ERROR: ${variant.url}`);
      console.log(`       Title: "${pageTitle}" | Content: ${pageStatus.contentLength} chars`);
      throw new Error(`PAGE_ERROR: ${pageTitle}`);
    }
    
    if (!pageStatus.hasContent) {
      console.log(`    📄 EMPTY PAGE: ${variant.url}`);
      console.log(`       Title: "${pageTitle}" | Content: ${pageStatus.contentLength} chars`);
      throw new Error(`EMPTY_PAGE: Content too short (${pageStatus.contentLength} chars)`);
    }

    // Extract comprehensive data using the same logic as the original scraper
    const comprehensiveData = await page.evaluate(() => {
      const data = {
        pageInfo: {
          title: document.title,
          url: window.location.href,
          contentLength: document.body.textContent?.length || 0,
          lastModified: document.lastModified || null,
          extractionTimestamp: new Date().toISOString()
        },
        bikeDetails: {},
        specifications: {},
        components: {},
        geometry: {},
        geometryBySize: {},
        pricing: {},
        media: { images: [], videos: [] },
        features: [],
        dealers: [],
        comparisons: [],
        reviews: { summary: '', pros: [], cons: [], keyQuotes: [], sources: [] },
        sizing: {},
        riderNotes: [],
        priceHistory: {},
        similarBikes: [],
        rideFeelData: {},
        gearingData: {},
        specLevelData: {}
      };

      // Extract bike name and details from actual page structure
      const h1 = document.querySelector('h1');
      if (h1) {
        data.bikeDetails.fullName = h1.textContent?.trim();
        
        // Parse year/make/model from title pattern: "2023 Trek Fuel EX 8"
        const titleMatch = data.bikeDetails.fullName?.match(/(\d{4})\s+(.+)/);
        if (titleMatch) {
          data.bikeDetails.year = titleMatch[1];
          const makeAndModel = titleMatch[2];
          const words = makeAndModel.split(' ');
          data.bikeDetails.manufacturer = words[0];
          data.bikeDetails.model = words.slice(1).join(' ');
        }
      }

      // Extract description from the actual content pattern
      const elements = document.querySelectorAll('p');
      for (const el of elements) {
        const text = el.textContent?.trim();
        if (text && text.length > 50 && text.length < 500 && 
            text.includes('bike') && !text.includes('Sign In') && 
            !text.includes('Compare') && !text.includes('Cookie')) {
          data.bikeDetails.description = text;
          break;
        }
      }

      // Detect if this is an electric bike
      const fullPageText = document.body.textContent?.toLowerCase() || '';
      const bikeTitle = (data.bikeDetails.fullName || '').toLowerCase();
      
      // Electric bike indicators
      const electricIndicators = [
        bikeTitle.includes('e-') || bikeTitle.includes('electric') || bikeTitle.includes('ebike'),
        fullPageText.includes('bosch') && fullPageText.includes('motor'),
        fullPageText.includes('shimano') && fullPageText.includes('motor'),
        fullPageText.includes('brose') && fullPageText.includes('motor'),
        fullPageText.includes('fazua') && fullPageText.includes('motor'),
        fullPageText.includes('yamaha') && fullPageText.includes('motor'),
        fullPageText.includes('wh battery') || fullPageText.includes('watt hour'),
        fullPageText.includes('pedal assist')
      ];
      
      data.bikeDetails.isElectric = electricIndicators.some(indicator => indicator);
      
      // If electric, try to extract key electric specs
      if (data.bikeDetails.isElectric) {
        data.bikeDetails.electricSpecs = {};
        
        const motorMatch = fullPageText.match(/(bosch|shimano|brose|fazua|yamaha|giant|specialized)\s*[^\n]*motor[^\n]*/i);
        if (motorMatch) {
          data.bikeDetails.electricSpecs.motor = motorMatch[0].trim();
        }
        
        const batteryMatch = fullPageText.match(/(\d+)\s*wh?\s*battery/i) || 
                           fullPageText.match(/battery[:\s]*(\d+)\s*wh?/i);
        if (batteryMatch) {
          data.bikeDetails.electricSpecs.battery = `${batteryMatch[1]}Wh`;
        }
        
        const rangeMatch = fullPageText.match(/range[:\s]*(\d+(?:-\d+)?)\s*miles?/i);
        if (rangeMatch) {
          data.bikeDetails.electricSpecs.range = `${rangeMatch[1]} miles`;
        }
      }

      // Extract specifications from tables
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
              
              const keyLower = key.toLowerCase();
              
              if (keyLower.includes('frame') || keyLower === 'frame') {
                if (!data.components.frame) data.components.frame = {};
                data.components.frame[keyLower] = value;
                data.bikeDetails.frameMaterial = value.includes('Aluminum') ? 'Aluminum' : 
                                                value.includes('Carbon') ? 'Carbon' : 
                                                value.includes('Steel') ? 'Steel' : value;
              } else if (keyLower.includes('fork') || keyLower === 'fork') {
                if (!data.components.fork) data.components.fork = {};
                data.components.fork[keyLower] = value;
              } else if (keyLower.includes('wheel') || keyLower === 'wheels') {
                if (!data.components.wheels) data.components.wheels = {};
                data.components.wheels[keyLower] = value;
                if (keyLower === 'wheels') data.bikeDetails.wheelSize = value;
              } else if (keyLower.includes('drivetrain') || keyLower === 'drivetrain') {
                if (!data.components.drivetrain) data.components.drivetrain = {};
                data.components.drivetrain[keyLower] = value;
              } else if (keyLower.includes('groupset') || keyLower === 'groupset') {
                if (!data.components.drivetrain) data.components.drivetrain = {};
                data.components.drivetrain[keyLower] = value;
              } else if (keyLower.includes('brake') || keyLower === 'brakes') {
                if (!data.components.brakes) data.components.brakes = {};
                data.components.brakes[keyLower] = value;
              } else if (keyLower.includes('derailleur') || keyLower.includes('shifter') || 
                        keyLower.includes('cassette') || keyLower.includes('crank')) {
                if (!data.components.drivetrain) data.components.drivetrain = {};
                data.components.drivetrain[keyLower] = value;
              } else if (keyLower.includes('stem') || keyLower.includes('handlebar') || 
                        keyLower.includes('saddle') || keyLower.includes('seatpost')) {
                if (!data.components.cockpit) data.components.cockpit = {};
                data.components.cockpit[keyLower] = value;
              } else if (keyLower.includes('tire') || keyLower === 'tires') {
                if (!data.components.tires) data.components.tires = {};
                data.components.tires[keyLower] = value;
              } else if (keyLower.includes('rim') || keyLower === 'rims') {
                if (!data.components.wheels) data.components.wheels = {};
                data.components.wheels[keyLower] = value;
              } else {
                if (!data.components.other) data.components.other = {};
                data.components.other[keyLower] = value;
              }
            }
          }
        });
      });

      // Extract pricing based on observed patterns
      const priceText = document.body.textContent || '';
      const priceMatches = priceText.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
      
      priceMatches.forEach(price => {
        const priceIndex = priceText.indexOf(price);
        const context = priceText.slice(Math.max(0, priceIndex - 50), priceIndex + 100).toLowerCase();
        
        if (context.includes('msrp') || context.includes('manufacturer') || context.includes('retail')) {
          data.pricing.msrp = price;
        } else if (context.includes('sale') || context.includes('now') || context.includes('current')) {
          data.pricing.salePrice = price;
        } else if (!data.pricing.currentPrice) {
          data.pricing.currentPrice = price;
        }
      });

      // Extract images with better filtering
      const images = Array.from(document.querySelectorAll('img'));
      images.forEach(img => {
        if (img.src && !img.src.includes('data:') && img.width > 100 && img.height > 100) {
          const imageData = {
            src: img.src,
            alt: img.alt || '',
            width: img.width,
            height: img.height
          };
          
          if (img.src.includes('cloudfront') || img.src.includes('bikes') || 
              img.src.includes('products') || img.src.includes('99spokes')) {
            data.media.images.push(imageData);
          }
        }
      });

      // Extract features from lists
      const lists = document.querySelectorAll('ul, ol');
      lists.forEach(list => {
        const items = Array.from(list.querySelectorAll('li'));
        items.forEach(item => {
          const text = item.textContent?.trim();
          if (text && text.length > 10 && text.length < 200 && 
              !text.includes('Sign In') && !text.includes('Compare') &&
              !text.includes('Privacy') && !text.includes('Cookie')) {
            data.features.push(text);
          }
        });
      });

      // Extract dealer/retailer links
      const links = Array.from(document.querySelectorAll('a'));
      links.forEach(link => {
        const text = link.textContent?.trim();
        const href = link.href;
        
        if (text && href && text.length > 2 && text.length < 100) {
          if (text.toLowerCase().includes('buy') || text.toLowerCase().includes('shop') || 
              text.toLowerCase().includes('dealer') || text.toLowerCase().includes('store') ||
              href.includes('shop') || href.includes('buy')) {
            data.dealers.push({
              name: text,
              url: href
            });
          } else if (href.includes('/bikes/') && href !== window.location.href) {
            data.comparisons.push({
              name: text,
              url: href
            });
          }
        }
      });

      // Extract geometry - this section would need the full geometry extraction logic
      // from the original scraper (lines 620-880) - copying the key parts:
      
      // Try to extract from JSON data embedded in scripts
      try {
        const scriptTags = Array.from(document.querySelectorAll('script'));
        let bikeData = null;
        
        for (const script of scriptTags) {
          if (script.textContent && script.textContent.includes('__NEXT_DATA__')) {
            const jsonMatch = script.textContent.match(/{.*}/);
            if (jsonMatch) {
              const pageData = JSON.parse(jsonMatch[0]);
              if (pageData.props?.pageProps?.bike) {
                bikeData = pageData.props.pageProps.bike;
                break;
              }
            }
          }
        }
        
        // Extract geometry organized by frame size
        if (bikeData && bikeData.sizes) {
          bikeData.sizes.forEach(size => {
            const frameSize = size.name || size.frameSize || size.label;
            if (frameSize && size.geometry) {
              data.geometryBySize[frameSize] = {
                frameSize: frameSize,
                riderHeight: size.riderHeight || null,
                wheelSize: size.wheelKinds || null,
                geometry: size.geometry
              };
              
              Object.entries(size.geometry).forEach(([key, value]) => {
                if (value && !data.geometry[key]) {
                  data.geometry[key] = value.toString();
                }
              });
            }
          });
        }
        
        if (bikeData && bikeData.geometry) {
          Object.entries(bikeData.geometry).forEach(([key, value]) => {
            if (value && typeof value === 'number') {
              data.geometry[key] = value.toString();
            } else if (value && typeof value === 'string') {
              data.geometry[key] = value;
            }
          });
        }
      } catch (e) {
        console.log('    ⚠️  Could not parse JSON data for geometry');
      }
      
      // Extract weight
      const weightMatch = fullPageText.match(/Weight\s*([\d.]+)\s*lbs/i);
      if (weightMatch) {
        data.bikeDetails.weight = `${weightMatch[1]} lbs`;
      }
      
      // Extract suspension details
      const suspensionMatch = fullPageText.match(/Suspension\s*([^\\n]*(?:mm|travel)[^\\n]*)/i);
      if (suspensionMatch) {
        data.bikeDetails.suspension = suspensionMatch[1].trim();
      }
      
      // Remove duplicates and clean up
      data.features = [...new Set(data.features)];
      data.reviews.pros = [...new Set(data.reviews.pros)];
      data.reviews.cons = [...new Set(data.reviews.cons)];
      data.reviews.keyQuotes = [...new Set(data.reviews.keyQuotes)];
      
      return data;
    });

    const stats = {
      specifications: Object.keys(comprehensiveData.specifications).length,
      images: comprehensiveData.media.images.length,
      features: comprehensiveData.features.length,
      geometry: Object.keys(comprehensiveData.geometry).length,
      geometryBySize: Object.keys(comprehensiveData.geometryBySize).length,
      components: Object.keys(comprehensiveData.components).reduce((sum, comp) => 
        sum + Object.keys(comprehensiveData.components[comp] || {}).length, 0),
      dealers: comprehensiveData.dealers.length,
      comparisons: comprehensiveData.comparisons.length,
      pricing: Object.keys(comprehensiveData.pricing).length
    };

    console.log(`    ✅ COMPREHENSIVE data extraction complete:`);
    console.log(`       Specs:${stats.specifications} | Images:${stats.images} | Features:${stats.features} | Geometry:${stats.geometry} | GeometryBySizes:${stats.geometryBySize}`);
    console.log(`       Components:${stats.components} | Dealers:${stats.dealers} | Comparisons:${stats.comparisons} | Pricing:${stats.pricing}`);

    return {
      ...comprehensiveData,
      extractedAt: new Date().toISOString(),
      extractionSuccess: true,
      extractionStats: stats
    };

  } catch (error) {
    console.log(`    ❌ Error (attempt ${retryCount + 1}): ${error.message}`);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`    🔄 Retrying in ${RETRY_DELAY}ms...`);
      await sleep(RETRY_DELAY);
      return await extractActualBikeData(variant, retryCount + 1);
    }
    
    return {
      error: error.message,
      extractedAt: new Date().toISOString(),
      extractionSuccess: false,
      retryCount: retryCount + 1,
      errorType: error.message.includes('404') ? '404_ERROR' :
                error.message.includes('HTTP_') ? 'HTTP_ERROR' :
                error.message.includes('Timeout') ? 'TIMEOUT_ERROR' :
                error.message.includes('NetworkError') ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR'
    };
  }
}

/* ---------- SMART RESUME AND QUALITY ASSESSMENT ---------- */

// Function to assess data quality and completeness (from original scraper)
function assessDataQuality(spec) {
  if (!spec?.extractionSuccess) {
    return { score: 0, reason: 'extraction_failed', priority: 1 };
  }
  
  const data = spec;
  let score = 0;
  let issues = [];
  
  // Core data scoring (40 points max)
  if (data.specifications && Object.keys(data.specifications).length > 0) score += 10;
  if (data.geometry && Object.keys(data.geometry).length > 0) score += 10;
  if (data.geometryBySize && Object.keys(data.geometryBySize).length > 0) score += 10;
  if (data.components && Object.keys(data.components).length > 0) score += 10;
  
  // Extended data scoring (30 points max)  
  if (data.pricing && Object.keys(data.pricing).length > 0) score += 5;
  if (data.bikeDetails && Object.keys(data.bikeDetails).length > 2) score += 5;
  if (data.media && data.media.images && data.media.images.length > 0) score += 5;
  if (data.reviews && (data.reviews.pros.length > 0 || data.reviews.cons.length > 0)) score += 5;
  if (data.sizing && Object.keys(data.sizing).length > 0) score += 5;
  if (data.similarBikes && data.similarBikes.length > 0) score += 5;
  
  // Bonus scoring (30 points max)
  if (data.riderNotes && data.riderNotes.length > 0) score += 10;
  if (data.rideFeelData && data.rideFeelData.hasData) score += 5;
  if (data.gearingData && (data.gearingData.lowestGear || data.gearingData.highestGear)) score += 5;
  if (data.specLevelData && data.specLevelData.hasVisualization) score += 5;
  if (data.priceHistory && data.priceHistory.hasData) score += 5;
  
  // Quality issues detection
  if (score < 30) issues.push('low_overall_score');
  if (!data.geometry || Object.keys(data.geometry).length === 0) issues.push('missing_geometry');
  if (!data.geometryBySize || Object.keys(data.geometryBySize).length === 0) issues.push('missing_geometry_by_size');
  if (!data.specifications || Object.keys(data.specifications).length < 5) issues.push('insufficient_specs');
  if (!data.media || !data.media.images || data.media.images.length === 0) issues.push('no_images');
  if (!data.pricing || Object.keys(data.pricing).length === 0) issues.push('missing_pricing');
  
  // Determine priority for re-scraping
  let priority = 4; // Default: no issues
  if (score < 20) priority = 1; // High priority: very incomplete
  else if (score < 40) priority = 2; // Medium priority: somewhat incomplete  
  else if (issues.length > 2) priority = 3; // Low priority: minor issues
  
  return { score, issues, priority, reason: issues.join(',') };
}

/* ---------- main processing ---------- */
console.log(`🚀 DATABASE-AWARE COMPREHENSIVE BIKE DATA EXTRACTION`);

// Assess existing data quality and categorize work
console.log(`📊 Analyzing existing data quality...`);
const workCategories = {
  failed: [],           // Priority 1: Failed extractions
  incomplete: [],       // Priority 2: Low quality/incomplete data  
  needsImprovement: [], // Priority 3: Missing some categories
  needsRescaping: [],   // Priority 4: Old data that should be refreshed
  notScraped: []        // Priority 5: Never been scraped
};

const qualityStats = { total: 0, scores: [] };

// Analyze all variants and categorize work needed
for (const [key, data] of Object.entries(bikeVariants)) {
  for (const family of data.families || []) {
    for (const variant of family.variants || []) {
      const existingSpec = comprehensiveSpecs[variant.variantId];
      const quality = assessDataQuality(existingSpec);
      
      qualityStats.total++;
      if (quality.score > 0) qualityStats.scores.push(quality.score);
      
      const workItem = {
        ...variant,
        makerYear: key,
        familyId: family.familyId,
        quality: quality,
        lastExtracted: existingSpec?.extractedAt
      };
      
      if (quality.priority === 1) {
        workCategories.failed.push(workItem);
      } else if (quality.priority === 2) {
        workCategories.incomplete.push(workItem);
      } else if (quality.priority === 3) {
        workCategories.needsImprovement.push(workItem);
      } else if (existingSpec && quality.score > 0) {
        // Check if data is old (more than 7 days) - could be refreshed
        const lastExtracted = new Date(workItem.lastExtracted || '2000-01-01');
        const daysSinceExtracted = (new Date() - lastExtracted) / (1000 * 60 * 60 * 24);
        if (daysSinceExtracted > 7) {
          workCategories.needsRescaping.push(workItem);
        }
      } else {
        workCategories.notScraped.push(workItem);
      }
    }
  }
}

// Sort each category by various criteria
workCategories.failed.sort((a, b) => a.quality.score - b.quality.score); // Worst first
workCategories.incomplete.sort((a, b) => a.quality.score - b.quality.score); // Worst first  
workCategories.needsImprovement.sort((a, b) => b.quality.score - a.quality.score); // Best first (easier wins)
workCategories.needsRescaping.sort((a, b) => new Date(a.lastExtracted || '2000-01-01') - new Date(b.lastExtracted || '2000-01-01')); // Oldest first

// Build prioritized work queue
const variantsToProcess = [
  ...workCategories.failed,
  ...workCategories.incomplete,
  ...workCategories.needsImprovement,
  ...workCategories.needsRescaping.slice(0, 100), // Limit re-scraping to avoid endless work
  ...workCategories.notScraped
];

console.log(`\n📈 WORK ANALYSIS COMPLETE:`);
console.log(`   Total bikes: ${qualityStats.total}`);
console.log(`   Previously scraped: ${qualityStats.scores.length}`);
console.log(`   Average quality score: ${qualityStats.scores.length > 0 ? Math.round(qualityStats.scores.reduce((a,b) => a+b, 0) / qualityStats.scores.length) : 0}/100`);

console.log(`\n🎯 WORK QUEUE PRIORITIZATION:`);
console.log(`   Priority 1 - Failed extractions: ${workCategories.failed.length}`);
console.log(`   Priority 2 - Incomplete data (score <40): ${workCategories.incomplete.length}`);
console.log(`   Priority 3 - Needs improvement (score 40-60): ${workCategories.needsImprovement.length}`);
console.log(`   Priority 4 - Re-scrape old data: ${Math.min(workCategories.needsRescaping.length, 100)}`);
console.log(`   Priority 5 - Never scraped: ${workCategories.notScraped.length}`);
console.log(`   Total work queue: ${variantsToProcess.length}`);

if (workCategories.failed.length > 0) {
  console.log(`\n⚠️  TOP FAILED EXTRACTIONS TO FIX:`);
  workCategories.failed.slice(0, 5).forEach((item, i) => {
    console.log(`   ${i+1}. ${item.name} (score: ${item.quality.score}, reason: ${item.quality.reason})`);
  });
}

if (workCategories.incomplete.length > 0) {
  console.log(`\n📉 TOP INCOMPLETE EXTRACTIONS TO IMPROVE:`);
  workCategories.incomplete.slice(0, 5).forEach((item, i) => {
    console.log(`   ${i+1}. ${item.name} (score: ${item.quality.score}, issues: ${item.quality.issues.join(', ')})`);
  });
}

const totalToProcess = variantsToProcess.length;
console.log(`📊 Found ${totalToProcess} variants needing comprehensive extraction`);
console.log(`🎯 Processing ALL ${totalToProcess} variants continuously...`);

let processedCount = 0;
let successCount = 0;
let failedCount = 0;

for (const variant of variantsToProcess) {
  // Determine what type of work this is
  let workType = '🆕 NEW';
  if (variant.quality.priority === 1) workType = '🔴 FAILED';
  else if (variant.quality.priority === 2) workType = '🟡 INCOMPLETE';
  else if (variant.quality.priority === 3) workType = '🟠 IMPROVE';
  else if (variant.lastExtracted) workType = '🔄 REFRESH';
  
  console.log(`\n🔍 [${processedCount + 1}/${totalToProcess}] ${workType} ${variant.name}`);
  console.log(`    ID: ${variant.variantId} | URL: ${variant.url}`);
  if (variant.quality.score > 0) {
    console.log(`    Previous quality: ${variant.quality.score}/100 (${variant.quality.reason})`);
  }
  
  const comprehensiveData = await extractActualBikeData(variant);
  
  // Save scraped data directly to database with family/variant name cleaning
  if (comprehensiveData.extractionSuccess) {
    await saveScrapedDataToDatabase(variant.variantId, comprehensiveData);
    successCount++;
    processingLog.successfulExtractions++;
  } else {
    failedCount++;
    processingLog.failedExtractions++;
  }
  
  processedCount++;
  processingLog.processedVariants++;
  processingLog.lastProcessedVariantId = variant.variantId;
  
  // Progress reporting
  if (processedCount % SAVE_EVERY === 0) {
    await fs.writeFile("comprehensive_processing_log.json", JSON.stringify(processingLog, null, 2));
    
    logProgress(processedCount, totalToProcess, successCount, failedCount);
    console.log(`💾 Progress saved: comprehensive_processing_log.json`);
  }
  
  await sleep(VARIANT_DELAY);
}

// Final save
await fs.writeFile("comprehensive_processing_log.json", JSON.stringify(processingLog, null, 2));

console.log(`\n🎉 DATABASE-AWARE EXTRACTION COMPLETE`);
console.log(`   Processed: ${processedCount} variants`);
console.log(`   Successful: ${successCount} (${Math.round(successCount/processedCount*100)}%)`);
console.log(`   Failed: ${failedCount} (${Math.round(failedCount/processedCount*100)}%)`);

// Close database connection and browser
await pool.end();
await stage.close();
process.exit(0);