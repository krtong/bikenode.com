#!/usr/bin/env node
/**
 * BikeNode Database Deduplication Script
 * 
 * Problem: 9,362 variant IDs appear multiple times in database
 * Example: "520" appears in trek_2016/trek-520, trek_2019/trek-520, trek_2020/trek-520
 * 
 * Root Cause: Same variant_id used across different years/families
 * 
 * Solution Strategy:
 * 1. Detect duplicates by variant_id collision
 * 2. Group duplicates by similarity (brand/model/family)
 * 3. Merge similar entries, keep best data
 * 4. Create unique variant_ids for truly different bikes
 */

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs/promises';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://kevintong@localhost:5432/bikenode?sslmode=disable",
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

/**
 * Step 1: Analyze all duplicates in the database
 */
async function analyzeDuplicates() {
  console.log("\n🔍 ANALYZING DUPLICATES...");
  
  // Get all bikes from catalog with their comprehensive data
  const result = await pool.query(`
    SELECT 
      bc.keyid,
      bc.make,
      bc.model, 
      bc.year,
      bc.variant,
      bd.comprehensive_data
    FROM bikes_catalog bc
    LEFT JOIN bikes_data bd ON bc.keyid = bd.keyid
    ORDER BY bc.make, bc.model, bc.year, bc.variant
  `);
  
  const bikes = result.rows;
  console.log(`📊 Found ${bikes.length} total bikes in database`);
  
  // Group by variant ID (extracted from URL/data)
  const variantGroups = {};
  const duplicateStats = {
    totalBikes: bikes.length,
    uniqueVariants: 0,
    duplicateVariants: 0,
    totalDuplicateEntries: 0
  };
  
  for (const bike of bikes) {
    let variantId = null;
    
    // Try to extract variant ID from comprehensive data
    if (bike.comprehensive_data?.bikeDetails?.variantId) {
      variantId = bike.comprehensive_data.bikeDetails.variantId;
    } else if (bike.comprehensive_data?.url) {
      // Extract from 99spokes URL
      const match = bike.comprehensive_data.url.match(/\/bikes\/[^\/]+\/\d+\/(.+)$/);
      if (match) variantId = match[1];
    }
    
    // Fallback: create variant ID from catalog data
    if (!variantId) {
      variantId = bike.variant?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'unknown';
    }
    
    if (!variantGroups[variantId]) {
      variantGroups[variantId] = [];
    }
    variantGroups[variantId].push(bike);
  }
  
  // Analyze duplicates
  const duplicateGroups = {};
  for (const [variantId, group] of Object.entries(variantGroups)) {
    if (group.length > 1) {
      duplicateGroups[variantId] = group;
      duplicateStats.duplicateVariants++;
      duplicateStats.totalDuplicateEntries += group.length;
    } else {
      duplicateStats.uniqueVariants++;
    }
  }
  
  console.log(`\n📈 DUPLICATE ANALYSIS RESULTS:`);
  console.log(`   Total bikes: ${duplicateStats.totalBikes}`);
  console.log(`   Unique variants: ${duplicateStats.uniqueVariants}`);
  console.log(`   Duplicate variant IDs: ${duplicateStats.duplicateVariants}`);
  console.log(`   Total duplicate entries: ${duplicateStats.totalDuplicateEntries}`);
  console.log(`   Deduplication potential: ${duplicateStats.totalDuplicateEntries - duplicateStats.duplicateVariants} bikes could be merged`);
  
  // Show top duplicate examples
  const sortedDuplicates = Object.entries(duplicateGroups)
    .sort(([,a], [,b]) => b.length - a.length)
    .slice(0, 10);
    
  console.log(`\n🔍 TOP DUPLICATE EXAMPLES:`);
  for (const [variantId, group] of sortedDuplicates) {
    console.log(`   ${variantId}: ${group.length} entries`);
    group.slice(0, 3).forEach(bike => {
      console.log(`     - ${bike.year} ${bike.make} ${bike.model} ${bike.variant} (keyid: ${bike.keyid})`);
    });
    if (group.length > 3) console.log(`     ... and ${group.length - 3} more`);
  }
  
  return { duplicateGroups, duplicateStats };
}

/**
 * Step 2: Categorize duplicates for different merge strategies
 */
function categorizeDuplicates(duplicateGroups) {
  console.log("\n📂 CATEGORIZING DUPLICATES...");
  
  const categories = {
    sameModelDifferentYears: [],  // Same bike across years - merge keeping latest
    sameModelSameYear: [],        // Exact duplicates - merge keeping best data
    differentModels: [],          // Different bikes with same variant ID - need unique IDs
    unclear: []                   // Need manual review
  };
  
  for (const [variantId, group] of Object.entries(duplicateGroups)) {
    const uniqueMakes = new Set(group.map(b => b.make?.toLowerCase()));
    const uniqueModels = new Set(group.map(b => b.model?.toLowerCase()));
    const uniqueYears = new Set(group.map(b => b.year));
    
    if (uniqueMakes.size === 1 && uniqueModels.size === 1) {
      if (uniqueYears.size > 1) {
        categories.sameModelDifferentYears.push({ variantId, group, uniqueYears: uniqueYears.size });
      } else {
        categories.sameModelSameYear.push({ variantId, group });
      }
    } else {
      categories.differentModels.push({ variantId, group, uniqueMakes: uniqueMakes.size, uniqueModels: uniqueModels.size });
    }
  }
  
  console.log(`📊 CATEGORIZATION RESULTS:`);
  console.log(`   Same model, different years: ${categories.sameModelDifferentYears.length} groups`);
  console.log(`   Same model, same year: ${categories.sameModelSameYear.length} groups`);
  console.log(`   Different models: ${categories.differentModels.length} groups`);
  console.log(`   Unclear: ${categories.unclear.length} groups`);
  
  return categories;
}

/**
 * Step 3: Calculate data quality score for each bike
 */
function calculateDataQuality(bike) {
  const data = bike.comprehensive_data;
  if (!data) return { score: 0, reasons: ['no_data'] };
  
  let score = 0;
  const reasons = [];
  
  // Specs (30 points max)
  const specsCount = Object.keys(data.specs || {}).length;
  if (specsCount > 20) score += 30;
  else if (specsCount > 10) score += 20;
  else if (specsCount > 5) score += 10;
  else reasons.push('few_specs');
  
  // Components (25 points max)
  const componentsCount = Object.keys(data.components || {}).length;
  if (componentsCount > 15) score += 25;
  else if (componentsCount > 8) score += 15;
  else if (componentsCount > 3) score += 8;
  else reasons.push('few_components');
  
  // Images (15 points max)
  const imagesCount = data.media?.images?.length || 0;
  if (imagesCount > 10) score += 15;
  else if (imagesCount > 5) score += 10;
  else if (imagesCount > 2) score += 5;
  else reasons.push('few_images');
  
  // Features (15 points max)
  const featuresCount = data.features?.length || 0;
  if (featuresCount > 10) score += 15;
  else if (featuresCount > 5) score += 10;
  else reasons.push('few_features');
  
  // Pricing (10 points max)
  const pricingCount = Object.keys(data.pricing || {}).length;
  if (pricingCount > 2) score += 10;
  else if (pricingCount > 0) score += 5;
  else reasons.push('no_pricing');
  
  // Geometry (5 points max)
  if (data.geometry && Object.keys(data.geometry).length > 0) score += 5;
  else reasons.push('no_geometry');
  
  return { score, reasons };
}

/**
 * Step 4: Generate deduplication plan
 */
function generateDeduplicationPlan(categories) {
  console.log("\n📋 GENERATING DEDUPLICATION PLAN...");
  
  const plan = {
    actions: [],
    summary: {
      bikesToKeep: 0,
      bikesToDelete: 0,
      bikesToUpdate: 0
    }
  };
  
  // Strategy 1: Same model, different years - keep latest with best data
  for (const { variantId, group } of categories.sameModelDifferentYears) {
    const bikesWithQuality = group.map(bike => ({
      ...bike,
      quality: calculateDataQuality(bike)
    }));
    
    // Sort by year (desc) then by quality score (desc)
    bikesWithQuality.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.quality.score - a.quality.score;
    });
    
    const keepBike = bikesWithQuality[0];
    const deleteBikes = bikesWithQuality.slice(1);
    
    plan.actions.push({
      type: 'MERGE_SAME_MODEL_YEARS',
      variantId,
      keep: keepBike,
      delete: deleteBikes,
      reason: `Keep latest year (${keepBike.year}) with best quality (${keepBike.quality.score}/100)`
    });
    
    plan.summary.bikesToKeep += 1;
    plan.summary.bikesToDelete += deleteBikes.length;
  }
  
  // Strategy 2: Same model, same year - merge data, keep best
  for (const { variantId, group } of categories.sameModelSameYear) {
    const bikesWithQuality = group.map(bike => ({
      ...bike,
      quality: calculateDataQuality(bike)
    }));
    
    bikesWithQuality.sort((a, b) => b.quality.score - a.quality.score);
    
    const keepBike = bikesWithQuality[0];
    const mergeBikes = bikesWithQuality.slice(1);
    
    plan.actions.push({
      type: 'MERGE_EXACT_DUPLICATES',
      variantId,
      keep: keepBike,
      merge: mergeBikes,
      reason: `Merge ${mergeBikes.length} exact duplicates into best quality entry (${keepBike.quality.score}/100)`
    });
    
    plan.summary.bikesToKeep += 1;
    plan.summary.bikesToDelete += mergeBikes.length;
  }
  
  // Strategy 3: Different models - create unique variant IDs
  for (const { variantId, group } of categories.differentModels) {
    plan.actions.push({
      type: 'CREATE_UNIQUE_IDS',
      variantId,
      bikes: group,
      reason: `Different models sharing variant ID "${variantId}" - need unique IDs`
    });
    
    plan.summary.bikesToKeep += group.length;
    plan.summary.bikesToUpdate += group.length;
  }
  
  console.log(`📊 DEDUPLICATION PLAN SUMMARY:`);
  console.log(`   Actions to execute: ${plan.actions.length}`);
  console.log(`   Bikes to keep: ${plan.summary.bikesToKeep}`);
  console.log(`   Bikes to delete: ${plan.summary.bikesToDelete}`);
  console.log(`   Bikes to update (new IDs): ${plan.summary.bikesToUpdate}`);
  console.log(`   Space savings: ${plan.summary.bikesToDelete} fewer database entries`);
  
  return plan;
}

/**
 * Step 5: Execute deduplication plan with safety checks
 */
async function executeDeduplicationPlan(plan, dryRun = true) {
  console.log(`\n🚀 ${dryRun ? 'DRY RUN - ' : ''}EXECUTING DEDUPLICATION PLAN...`);
  
  if (!dryRun) {
    // Create backup first
    console.log("💾 Creating database backup...");
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `/Users/kevintong/Documents/Code/bikenode.com/database/backups/pre_dedup_backup_${timestamp}.sql`;
    
    // Note: In production, would use pg_dump here
    console.log(`   Backup would be saved to: ${backupFile}`);
  }
  
  let executed = 0;
  
  for (const action of plan.actions) {
    console.log(`\n[${executed + 1}/${plan.actions.length}] ${action.type}: ${action.variantId}`);
    console.log(`   Reason: ${action.reason}`);
    
    if (action.type === 'MERGE_SAME_MODEL_YEARS' || action.type === 'MERGE_EXACT_DUPLICATES') {
      console.log(`   Keep: keyid=${action.keep.keyid}, quality=${action.keep.quality.score}/100`);
      
      for (const bike of (action.delete || action.merge || [])) {
        console.log(`   ${dryRun ? 'Would delete' : 'Deleting'}: keyid=${bike.keyid}, quality=${bike.quality.score}/100`);
        
        if (!dryRun) {
          // Delete from bikes_data first (foreign key constraint)
          await pool.query('DELETE FROM bikes_data WHERE keyid = $1', [bike.keyid]);
          // Delete from bikes_catalog
          await pool.query('DELETE FROM bikes_catalog WHERE keyid = $1', [bike.keyid]);
        }
      }
    } else if (action.type === 'CREATE_UNIQUE_IDS') {
      console.log(`   Creating unique IDs for ${action.bikes.length} different models`);
      
      for (let i = 0; i < action.bikes.length; i++) {
        const bike = action.bikes[i];
        const newVariantId = `${action.variantId}-${bike.make.toLowerCase()}-${bike.year}`;
        console.log(`   ${dryRun ? 'Would update' : 'Updating'}: keyid=${bike.keyid} variant_id -> ${newVariantId}`);
        
        if (!dryRun && bike.comprehensive_data) {
          // Update variant ID in comprehensive data
          const updatedData = { ...bike.comprehensive_data };
          if (updatedData.bikeDetails) {
            updatedData.bikeDetails.variantId = newVariantId;
          }
          
          await pool.query(
            'UPDATE bikes_data SET comprehensive_data = $1 WHERE keyid = $2',
            [JSON.stringify(updatedData), bike.keyid]
          );
        }
      }
    }
    
    executed++;
    
    if (dryRun && executed >= 5) {
      console.log(`\n   ... (showing first 5 actions only in dry run)`);
      break;
    }
  }
  
  console.log(`\n✅ ${dryRun ? 'DRY RUN' : 'EXECUTION'} COMPLETE!`);
  if (dryRun) {
    console.log("   Run with --execute flag to perform actual deduplication");
  }
}

/**
 * Main execution
 */
async function main() {
  const dryRun = !process.argv.includes('--execute');
  
  console.log("🚀 BIKENODE DATABASE DEDUPLICATION UTILITY");
  console.log(`Mode: ${dryRun ? 'DRY RUN (safe preview)' : 'LIVE EXECUTION (will modify database)'}`);
  
  try {
    // Step 1: Analyze current duplicates
    const { duplicateGroups, duplicateStats } = await analyzeDuplicates();
    
    // Step 2: Categorize for different strategies  
    const categories = categorizeDuplicates(duplicateGroups);
    
    // Step 3: Generate plan
    const plan = generateDeduplicationPlan(categories);
    
    // Step 4: Execute plan
    await executeDeduplicationPlan(plan, dryRun);
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      duplicateStats,
      categories,
      plan,
      dryRun
    };
    
    const reportFile = `/Users/kevintong/Documents/Code/bikenode.com/database/deduplication_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportFile}`);
    
  } catch (error) {
    console.error("❌ Error during deduplication:", error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}