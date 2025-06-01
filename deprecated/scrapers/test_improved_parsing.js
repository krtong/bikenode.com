#!/usr/bin/env node

// Test script with improved parsing logic
import fs from "fs/promises";

// Load test data
async function loadTestData() {
  try {
    const data = await fs.readFile("comprehensive_bike_specs_backup_2025-05-29T10-57-35-065Z_session_start.json", "utf8");
    const specs = JSON.parse(data);
    console.log(`📂 Loaded ${Object.keys(specs).length} bike specifications for testing`);
    return specs;
  } catch (err) {
    console.error("❌ Error loading test data:", err.message);
    return {};
  }
}

// IMPROVED parsing logic
function improvedParseFromTitle(pageTitle) {
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
}

// Further clean family names
function cleanFamilyName(family, brand, year) {
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
}

// Test the improved parsing
function testImprovedParsing(variantId, comprehensiveData) {
  const pageTitle = comprehensiveData.pageInfo?.title || '';
  const url = comprehensiveData.pageInfo?.url || '';
  
  // Use improved parsing
  const parsed = improvedParseFromTitle(pageTitle);
  
  // Clean the family name
  const cleanedFamily = cleanFamilyName(parsed.family, parsed.brand, parsed.year);
  
  return {
    variantId,
    originalTitle: pageTitle,
    url,
    parsedBrand: parsed.brand,
    parsedFamily: cleanedFamily,
    parsedYear: parsed.year,
    // Issues
    hasParsingIssues: !parsed.brand || !cleanedFamily || !parsed.year,
    emptyTitle: !pageTitle || pageTitle.trim() === ''
  };
}

async function main() {
  console.log("🧪 TESTING IMPROVED BRAND/MODEL/YEAR/VARIANT PARSING");
  console.log("="*60);
  
  const specs = await loadTestData();
  const testResults = [];
  const issues = {
    noBrand: 0,
    noFamily: 0,
    noYear: 0,
    emptyTitle: 0,
    total: 0
  };
  
  // Test first 100 variants
  const variantIds = Object.keys(specs).slice(0, 100);
  
  for (const variantId of variantIds) {
    const result = testImprovedParsing(variantId, specs[variantId].comprehensiveData);
    testResults.push(result);
    
    issues.total++;
    if (!result.parsedBrand) issues.noBrand++;
    if (!result.parsedFamily) issues.noFamily++;
    if (!result.parsedYear) issues.noYear++;
    if (result.emptyTitle) issues.emptyTitle++;
  }
  
  console.log(`\n📊 IMPROVED PARSING RESULTS (${issues.total} variants tested):`);
  console.log(`   ✅ Brand extracted: ${issues.total - issues.noBrand}/${issues.total} (${Math.round((issues.total - issues.noBrand)/issues.total*100)}%)`);
  console.log(`   ✅ Family extracted: ${issues.total - issues.noFamily}/${issues.total} (${Math.round((issues.total - issues.noFamily)/issues.total*100)}%)`);
  console.log(`   ✅ Year extracted: ${issues.total - issues.noYear}/${issues.total} (${Math.round((issues.total - issues.noYear)/issues.total*100)}%)`);
  console.log(`   ⚠️  Empty titles: ${issues.emptyTitle}/${issues.total} (${Math.round(issues.emptyTitle/issues.total*100)}%)`);
  
  console.log(`\n🔍 SAMPLE IMPROVED PARSING RESULTS:`);
  console.log(`   ${"Variant ID".padEnd(30)} | ${"Brand".padEnd(15)} | ${"Family".padEnd(25)} | Year | Issues`);
  console.log(`   ${"-".repeat(30)} | ${"-".repeat(15)} | ${"-".repeat(25)} | ---- | ------`);
  
  // Show first 10 results
  for (let i = 0; i < Math.min(10, testResults.length); i++) {
    const r = testResults[i];
    const issuesList = [];
    if (!r.parsedBrand) issuesList.push("no-brand");
    if (!r.parsedFamily) issuesList.push("no-family");
    if (!r.parsedYear) issuesList.push("no-year");
    if (r.emptyTitle) issuesList.push("empty-title");
    
    console.log(`   ${r.variantId.substring(0,29).padEnd(30)} | ${(r.parsedBrand || "").padEnd(15)} | ${(r.parsedFamily || "").substring(0,24).padEnd(25)} | ${(r.parsedYear || "N/A").toString().padEnd(4)} | ${issuesList.join(", ")}`);
  }
  
  console.log(`\n🚨 REMAINING PROBLEMATIC EXAMPLES:`);
  const problematic = testResults.filter(r => r.hasParsingIssues);
  
  for (let i = 0; i < Math.min(5, problematic.length); i++) {
    const r = problematic[i];
    console.log(`   ${i+1}. "${r.originalTitle}"`);
    console.log(`      ➤ Brand: "${r.parsedBrand}" | Family: "${r.parsedFamily}" | Year: ${r.parsedYear || "None"}`);
    console.log(`      ➤ URL: ${r.url}`);
    console.log("");
  }
  
  console.log(`\n✅ IMPROVED EXAMPLES:`);
  const good = testResults.filter(r => !r.hasParsingIssues);
  
  for (let i = 0; i < Math.min(10, good.length); i++) {
    const r = good[i];
    console.log(`   ${i+1}. "${r.originalTitle}"`);
    console.log(`      ➤ Brand: "${r.parsedBrand}" | Family: "${r.parsedFamily}" | Year: ${r.parsedYear}`);
    console.log("");
  }
}

main().catch(console.error);