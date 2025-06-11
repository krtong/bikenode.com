#!/usr/bin/env node
/*  Extract bike families and variants for each maker/year combination  */

import fs from "fs/promises";
import { Stagehand } from "@browserbasehq/stagehand";
import "dotenv/config.js";

/* ---------- config ---------- */
const NAV_DELAY = 800;   // ms after each navigation
const FAMILY_DELAY = 600; // ms between family extractions
const SEL_DIALOG = 'div[role="dialog"]';

/* ---------- helpers ---------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- set-up ---------- */
if (!process.env.OPENAI_API_KEY) {
  console.error("✖  OPENAI_API_KEY missing"); 
  process.exit(1);
}

const stage = new Stagehand({ 
  env: "LOCAL", 
  apiKey: process.env.OPENAI_API_KEY,
  verbose: 1
});
await stage.init();
const page = stage.page;

/* ---------- load existing data ---------- */
let bikeData = {};
try {
  const existingData = await fs.readFile("bike_variants.json", "utf8");
  bikeData = JSON.parse(existingData);
  const totalFamilies = Object.values(bikeData).reduce((sum, data) => sum + (data.families?.length || 0), 0);
  const totalVariants = Object.values(bikeData).reduce((sum, data) => 
    sum + (data.families?.reduce((famSum, fam) => famSum + (fam.variants?.length || 0), 0) || 0), 0);
  console.log(`📂 Loaded existing data:`);
  console.log(`   ${Object.keys(bikeData).length} maker/year combinations`);
  console.log(`   ${totalFamilies} bike families`);
  console.log(`   ${totalVariants} bike variants`);
} catch (err) {
  console.log("📄 Starting with empty bike_variants.json");
}

// Load maker years data
let makerYears = {};
try {
  const data = await fs.readFile("maker_years.json", "utf8");
  makerYears = JSON.parse(data);
  console.log(`📂 Loaded maker/year data for ${Object.keys(makerYears).length} makers`);
} catch (err) {
  console.error("✖  maker_years.json not found. Run extract_bike_families.js first.");
  process.exit(1);
}

/* ---------- extract bike families for a maker/year ---------- */
async function extractBikeFamilies(makerId, year) {
  const url = `https://99spokes.com/bikes?makerId=${makerId}&year=${year}`;
  
  try {
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30_000
    });
    await sleep(NAV_DELAY);

    // Extract bike family links using query parameter pattern
    const families = await page.$$eval('a[href*="/bikes?"]', links => {
      return links
        .filter(link => {
          const href = link.getAttribute('href');
          // Filter for family-specific URLs (has family parameter)
          return href && href.includes('family=') && 
                 link.textContent.trim().length > 0;
        })
        .map(link => {
          const href = link.getAttribute('href');
          const url = new URL(`https://99spokes.com${href}`);
          const familyName = url.searchParams.get('family');
          
          return {
            name: link.textContent.trim(),
            url: `https://99spokes.com${href}`,
            familyId: familyName
          };
        });
    });

    // Remove duplicates based on URL
    const uniqueFamilies = families.filter((family, index, self) => 
      self.findIndex(f => f.url === family.url) === index
    );

    console.log(`  → Found ${uniqueFamilies.length} bike families`);
    return uniqueFamilies;

  } catch (error) {
    console.log(`  ! Failed to extract families: ${error.message}`);
    return [];
  }
}

/* ---------- extract variants for a bike family ---------- */
async function extractBikeVariants(familyUrl, familyName) {
  try {
    await page.goto(familyUrl, {
      waitUntil: "networkidle", 
      timeout: 30_000
    });
    await sleep(NAV_DELAY);

    // Extract variant links from the family page (path-based URLs)
    const variants = await page.$$eval('a[href*="/bikes"]', links => {
      return links
        .filter(link => {
          const href = link.getAttribute('href');
          // Look for variant-specific URLs (path pattern without family parameter)
          return href && (
            href.match(/^\/bikes\/[^\/]+\/\d{4}\/[^\/]+$/) &&
            !href.includes('family=') &&
            link.textContent.trim().length > 0
          );
        })
        .map(link => ({
          name: link.textContent.trim(),
          url: `https://99spokes.com${link.getAttribute('href')}`,
          variantId: link.getAttribute('href').split('/').pop()
        }));
    });

    // Remove duplicates
    const uniqueVariants = variants.filter((variant, index, self) =>
      self.findIndex(v => v.url === variant.url) === index
    );

    console.log(`    → Found ${uniqueVariants.length} variants`);
    return uniqueVariants;

  } catch (error) {
    console.log(`    ! Failed to extract variants: ${error.message}`);
    return [];
  }
}

/* ---------- main scraping loop ---------- */
const processedCount = { total: 0, families: 0, variants: 0 };

for (const [makerId, years] of Object.entries(makerYears)) {
  console.log(`\n========== ${makerId.toUpperCase()} ==========`);
  
  for (const year of years) {
    const key = `${makerId}_${year}`;
    
    // Skip if we already have complete data for this maker/year
    if (bikeData[key] && bikeData[key].families?.length > 0 && bikeData[key].extractedAt) {
      const familiesCount = bikeData[key].families.length;
      const variantsCount = bikeData[key].families.reduce((sum, fam) => sum + (fam.variants?.length || 0), 0);
      console.log(`  ✅ ${year}: Already have ${familiesCount} families (${variantsCount} variants) - skipping`);
      continue;
    }

    console.log(`  🔍 ${year}: Extracting bike families...`);
    
    const families = await extractBikeFamilies(makerId, year);
    
    if (families.length === 0) {
      bikeData[key] = {
        makerId,
        year,
        url: `https://99spokes.com/bikes?makerId=${makerId}&year=${year}`,
        families: [],
        extractedAt: new Date().toISOString()
      };
      continue;
    }

    // Initialize the data structure for this maker/year
    bikeData[key] = {
      makerId,
      year,
      url: `https://99spokes.com/bikes?makerId=${makerId}&year=${year}`,
      families: [],
      extractedAt: new Date().toISOString()
    };

    // Extract variants for each family
    for (const family of families) {
      console.log(`    📋 ${family.name}: Extracting variants...`);
      
      const variants = await extractBikeVariants(family.url, family.name);
      
      bikeData[key].families.push({
        ...family,
        variants,
        variantCount: variants.length
      });
      
      processedCount.families++;
      processedCount.variants += variants.length;
      
      await sleep(FAMILY_DELAY);
    }
    
    processedCount.total++;
    
    // Save progress after each maker/year combination
    try {
      await fs.writeFile("bike_variants.json", JSON.stringify(bikeData, null, 2));
      const totalVariantsForYear = families.reduce((sum, f) => sum + (f.variants?.length || 0), 0);
      console.log(`  ✅ ${year}: Saved ${families.length} families with ${totalVariantsForYear} total variants`);
    } catch (saveError) {
      console.log(`  ⚠️  ${year}: Failed to save data: ${saveError.message}`);
    }
    
    await sleep(NAV_DELAY);
  }
}

/* ---------- summary and cleanup ---------- */
const finalTotalFamilies = Object.values(bikeData).reduce((sum, data) => sum + (data.families?.length || 0), 0);
const finalTotalVariants = Object.values(bikeData).reduce((sum, data) => 
  sum + (data.families?.reduce((famSum, fam) => famSum + (fam.variants?.length || 0), 0) || 0), 0);

console.log(`\n🎉 SCRAPING SESSION COMPLETE`);
console.log(`   This session processed: ${processedCount.total} new maker/year combinations`);
console.log(`   This session added: ${processedCount.families} families, ${processedCount.variants} variants`);
console.log(`\n📊 TOTAL DATABASE STATS:`);
console.log(`   Total combinations: ${Object.keys(bikeData).length}`);
console.log(`   Total families: ${finalTotalFamilies}`);
console.log(`   Total variants: ${finalTotalVariants}`);

// Create backup and save final data
try {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await fs.writeFile(`bike_variants_backup_${timestamp}.json`, JSON.stringify(bikeData, null, 2));
  await fs.writeFile("bike_variants.json", JSON.stringify(bikeData, null, 2));
  console.log(`\n✅ Data saved to bike_variants.json`);
  console.log(`📁 Backup created: bike_variants_backup_${timestamp}.json`);
} catch (saveError) {
  console.error(`❌ Failed to save final data: ${saveError.message}`);
}

await stage.close();
process.exit(0);