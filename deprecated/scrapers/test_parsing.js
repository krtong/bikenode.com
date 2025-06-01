#!/usr/bin/env node

// Test script to analyze brand/model/year/variant parsing accuracy
import fs from "fs/promises";

// Load test data from one of the comprehensive specs files
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

// Test brand/family parsing with the same logic from the scraper
function parseBrandAndFamily(brandField) {
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
}

// Extract bike data from scraped content and analyze parsing accuracy
function analyzeParsingAccuracy(variantId, comprehensiveData) {
  // Extract basic info from comprehensive data
  const pageTitle = comprehensiveData.pageInfo?.title || '';
  const url = comprehensiveData.pageInfo?.url || '';
  
  // Try to parse brand, model, year from the title or URL
  let brand = '';
  let model = '';
  let year = null;
  
  // Extract year from title (look for 4-digit year between 2010-2030)
  const yearMatch = pageTitle.match(/\b(20[1-3]\d)\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
  }
  
  // Extract brand and model from title
  // Common patterns: "2024 Trek Fuel EX 8" or "Specialized Stumpjumper Comp"
  const titleParts = pageTitle.replace(/\b20[1-3]\d\b/, '').trim().split(' ');
  if (titleParts.length >= 2) {
    brand = titleParts[0];
    model = titleParts.slice(1).join(' ');
  }
  
  // If no brand found in title, try to extract from URL
  if (!brand && url) {
    const urlMatch = url.match(/\/bikes\/([^\/]+)/);
    if (urlMatch) {
      brand = urlMatch[1];
    }
  }
  
  // Parse and clean brand/family
  let parsedBrand = brand;
  let parsedFamily = model;
  
  if (brand && model) {
    const [cleanBrand, familyPart] = parseBrandAndFamily(brand + model);
    parsedBrand = cleanBrand;
    parsedFamily = familyPart || model;
  }
  
  return {
    variantId,
    originalTitle: pageTitle,
    url,
    extractedBrand: brand,
    extractedModel: model,
    extractedYear: year,
    parsedBrand,
    parsedFamily,
    // Issues
    brandInModel: model && model.toLowerCase().includes(brand.toLowerCase()),
    yearInModel: year && model && model.includes(year.toString()),
    hasParsingIssues: !brand || !model || !year
  };
}

async function main() {
  console.log("🧪 TESTING BRAND/MODEL/YEAR/VARIANT PARSING ACCURACY");
  console.log("="*60);
  
  const specs = await loadTestData();
  const testResults = [];
  const issues = {
    noBrand: 0,
    noModel: 0,
    noYear: 0,
    brandInModel: 0,
    yearInModel: 0,
    total: 0
  };
  
  // Test a sample of variants
  const variantIds = Object.keys(specs).slice(0, 100); // Test first 100
  
  for (const variantId of variantIds) {
    const result = analyzeParsingAccuracy(variantId, specs[variantId].comprehensiveData);
    testResults.push(result);
    
    issues.total++;
    if (!result.extractedBrand) issues.noBrand++;
    if (!result.extractedModel) issues.noModel++;
    if (!result.extractedYear) issues.noYear++;
    if (result.brandInModel) issues.brandInModel++;
    if (result.yearInModel) issues.yearInModel++;
  }
  
  console.log(`\n📊 PARSING ACCURACY RESULTS (${issues.total} variants tested):`);
  console.log(`   ✅ Brand extracted: ${issues.total - issues.noBrand}/${issues.total} (${Math.round((issues.total - issues.noBrand)/issues.total*100)}%)`);
  console.log(`   ✅ Model extracted: ${issues.total - issues.noModel}/${issues.total} (${Math.round((issues.total - issues.noModel)/issues.total*100)}%)`);
  console.log(`   ✅ Year extracted: ${issues.total - issues.noYear}/${issues.total} (${Math.round((issues.total - issues.noYear)/issues.total*100)}%)`);
  console.log(`   ⚠️  Brand duplicated in model: ${issues.brandInModel}/${issues.total} (${Math.round(issues.brandInModel/issues.total*100)}%)`);
  console.log(`   ⚠️  Year duplicated in model: ${issues.yearInModel}/${issues.total} (${Math.round(issues.yearInModel/issues.total*100)}%)`);
  
  console.log(`\n🔍 SAMPLE PARSING RESULTS:`);
  console.log(`   ${"Variant ID".padEnd(30)} | ${"Brand".padEnd(12)} | ${"Family".padEnd(25)} | Year | Issues`);
  console.log(`   ${"-".repeat(30)} | ${"-".repeat(12)} | ${"-".repeat(25)} | ---- | ------`);
  
  // Show first 10 results
  for (let i = 0; i < Math.min(10, testResults.length); i++) {
    const r = testResults[i];
    const issuesList = [];
    if (!r.extractedBrand) issuesList.push("no-brand");
    if (!r.extractedModel) issuesList.push("no-model");
    if (!r.extractedYear) issuesList.push("no-year");
    if (r.brandInModel) issuesList.push("brand-dup");
    if (r.yearInModel) issuesList.push("year-dup");
    
    console.log(`   ${r.variantId.substring(0,29).padEnd(30)} | ${(r.parsedBrand || "").padEnd(12)} | ${(r.parsedFamily || "").substring(0,24).padEnd(25)} | ${(r.extractedYear || "N/A").toString().padEnd(4)} | ${issuesList.join(", ")}`);
  }
  
  console.log(`\n🚨 PROBLEMATIC EXAMPLES:`);
  const problematic = testResults.filter(r => r.hasParsingIssues || r.brandInModel || r.yearInModel);
  
  for (let i = 0; i < Math.min(5, problematic.length); i++) {
    const r = problematic[i];
    console.log(`   ${i+1}. "${r.originalTitle}"`);
    console.log(`      ➤ Brand: "${r.parsedBrand}" | Family: "${r.parsedFamily}" | Year: ${r.extractedYear || "None"}`);
    console.log(`      ➤ URL: ${r.url}`);
    console.log("");
  }
  
  console.log(`\n✅ GOOD EXAMPLES:`);
  const good = testResults.filter(r => !r.hasParsingIssues && !r.brandInModel && !r.yearInModel);
  
  for (let i = 0; i < Math.min(5, good.length); i++) {
    const r = good[i];
    console.log(`   ${i+1}. "${r.originalTitle}"`);
    console.log(`      ➤ Brand: "${r.parsedBrand}" | Family: "${r.parsedFamily}" | Year: ${r.extractedYear}`);
    console.log("");
  }
}

main().catch(console.error);