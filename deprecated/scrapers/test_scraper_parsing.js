#!/usr/bin/env node

// Test the scraper's extractAndCleanBikeData function
import fs from "fs/promises";

// Copy the improved parsing functions from the scraper
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

// Extract bike data from scraped content and clean it (copy from scraper)
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
  
  // Extract pricing
  let priceMin = null;
  let priceMax = null;
  
  if (comprehensiveData.pricing) {
    const pricing = comprehensiveData.pricing;
    const priceFields = [pricing.currentPrice, pricing.msrp, pricing.manufacturerPrice, pricing.salePrice];
    
    for (const priceField of priceFields) {
      if (priceField) {
        const priceMatch = priceField.match(/\$?([d,]+)/);
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

async function testScraperParsing() {
  console.log("🧪 TESTING SCRAPER'S extractAndCleanBikeData FUNCTION");
  console.log("="*60);
  
  // Load test data
  const data = await fs.readFile("comprehensive_bike_specs_backup_2025-05-29T10-57-35-065Z_session_start.json", "utf8");
  const specs = JSON.parse(data);
  
  console.log(`📂 Loaded ${Object.keys(specs).length} bike specifications for testing`);
  
  const testResults = [];
  const issues = {
    noBrand: 0,
    noModel: 0,
    noYear: 0,
    total: 0
  };
  
  // Test first 20 variants with the scraper's actual function
  const variantIds = Object.keys(specs).slice(0, 20);
  
  for (const variantId of variantIds) {
    const result = extractAndCleanBikeData(variantId, specs[variantId].comprehensiveData);
    testResults.push(result);
    
    issues.total++;
    if (!result.brand) issues.noBrand++;
    if (!result.model) issues.noModel++;
    if (!result.year) issues.noYear++;
  }
  
  console.log(`\n📊 SCRAPER PARSING RESULTS (${issues.total} variants tested):`);
  console.log(`   ✅ Brand extracted: ${issues.total - issues.noBrand}/${issues.total} (${Math.round((issues.total - issues.noBrand)/issues.total*100)}%)`);
  console.log(`   ✅ Model extracted: ${issues.total - issues.noModel}/${issues.total} (${Math.round((issues.total - issues.noModel)/issues.total*100)}%)`);
  console.log(`   ✅ Year extracted: ${issues.total - issues.noYear}/${issues.total} (${Math.round((issues.total - issues.noYear)/issues.total*100)}%)`);
  
  console.log(`\n🔍 SCRAPER PARSING RESULTS:`);
  console.log(`   ${"ID".padEnd(15)} | ${"Brand".padEnd(15)} | ${"Model/Family".padEnd(25)} | Year | Type`);
  console.log(`   ${"-".repeat(15)} | ${"-".repeat(15)} | ${"-".repeat(25)} | ---- | --------`);
  
  // Show all results
  for (let i = 0; i < testResults.length; i++) {
    const r = testResults[i];
    console.log(`   ${r.variantId.substring(0,14).padEnd(15)} | ${(r.brand || "").padEnd(15)} | ${(r.model || "").substring(0,24).padEnd(25)} | ${(r.year || "N/A").toString().padEnd(4)} | ${r.bikeType || ""}`);
  }
  
  console.log(`\n🚨 ACTUAL FAILURE ANALYSIS:`);
  const failed = testResults.filter(r => !r.brand || !r.model || !r.year);
  
  for (let i = 0; i < failed.length; i++) {
    const r = failed[i];
    console.log(`   ${i+1}. Variant ID: "${r.variantId}"`);
    console.log(`      ➤ Original Title: "${r.fullName}"`);
    console.log(`      ➤ URL: "${r.url || 'N/A'}"`);
    console.log(`      ➤ Brand: "${r.brand || 'MISSING'}" | Model: "${r.model || 'MISSING'}" | Year: ${r.year || 'MISSING'}`);
    console.log(`      ➤ Failure cause: ${!r.brand ? 'no-brand ' : ''}${!r.model ? 'no-model ' : ''}${!r.year ? 'no-year' : ''}`);
    console.log("");
  }

  console.log(`\n✅ DATABASE-READY EXAMPLES:`);
  const good = testResults.filter(r => r.brand && r.model && r.year);
  
  for (let i = 0; i < Math.min(5, good.length); i++) {
    const r = good[i];
    console.log(`   ${i+1}. "${r.fullName}"`);
    console.log(`      ➤ Brand: "${r.brand}" | Model: "${r.model}" | Year: ${r.year} | Type: ${r.bikeType}`);
    console.log(`      ➤ Ready for database insertion: ✅`);
    console.log("");
  }
}

testScraperParsing().catch(console.error);