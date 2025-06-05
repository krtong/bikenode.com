#!/usr/bin/env node

/**
 * Concurrent Batch Process K-L Bicycle Brands
 * Processes multiple bicycle brands simultaneously
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ProductionBrandResearcher from './production_brand_researcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// K-L brands from the todo list
const klBrands = [
    { name: "K2", id: "k2" },
    { name: "Kavenz", id: "kavenz" },
    { name: "Kellys", id: "kellys" },
    { name: "Kestrel", id: "kestrel" },
    { name: "Kettler", id: "kettler" },
    { name: "KHS", id: "khs" },
    { name: "Kids Ride Shotgun", id: "kidsrideshotgun" },
    { name: "Knolly", id: "knolly" },
    { name: "Kona", id: "kona" },
    { name: "KTM", id: "ktm" },
    { name: "Kuota", id: "kuota" },
    { name: "Lapierre", id: "lapierre" },
    { name: "Last", id: "last" },
    { name: "Lauf", id: "lauf" },
    { name: "Lectric", id: "lectric" },
    { name: "Lectric eBikes", id: "lectricebikes" },
    { name: "Lee Cougan", id: "leecougan" },
    { name: "Lekker", id: "lekker" },
    { name: "LeMond Bicycles", id: "lemondbicycles" },
    { name: "Liberty Trike", id: "libertytrike" },
    { name: "Lightweight", id: "lightweight" },
    { name: "Litespeed", id: "litespeed" },
    { name: "Liteville", id: "liteville" },
    { name: "Liv", id: "liv" },
    { name: "Lombardo", id: "lombardo" },
    { name: "Look", id: "look" },
    { name: "Lynskey", id: "lynskey" }
];

// Mock web search function for demonstration
async function mockWebSearch(query) {
    console.log(`🔍 WebSearch: "${query}"`);
    
    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    return [
        {
            title: `${query} - Search Results`,
            url: `https://example.com/search?q=${encodeURIComponent(query)}`,
            snippet: `Information about ${query}`
        }
    ];
}

async function processSingleBrand(brand, researcher) {
    console.log(`🚴 Starting research for: ${brand.name}`);
    
    try {
        // Research the brand
        const researchResults = await researcher.researchBrandComplete(brand.name + " bicycles");
        
        // Save individual results
        const saved = researcher.saveProductionResults(researchResults, brand.name);
        
        console.log(`✅ Completed ${brand.name} (Confidence: ${researchResults.confidence_scores.overall}%)`);
        
        return {
            brand: brand.name,
            brand_id: brand.id,
            success: true,
            confidence: researchResults.confidence_scores.overall,
            file: saved.file_path
        };
        
    } catch (error) {
        console.error(`❌ Failed ${brand.name}: ${error.message}`);
        return {
            brand: brand.name,
            brand_id: brand.id,
            success: false,
            error: error.message
        };
    }
}

async function processBrandsConcurrently(brands, concurrency = 5) {
    const researcher = new ProductionBrandResearcher();
    researcher.setWebSearchFunction(mockWebSearch);
    
    console.log(`\n🚀 Processing ${brands.length} brands with concurrency level: ${concurrency}\n`);
    
    const results = [];
    const errors = [];
    const startTime = Date.now();
    
    // Process brands in batches
    for (let i = 0; i < brands.length; i += concurrency) {
        const batch = brands.slice(i, Math.min(i + concurrency, brands.length));
        console.log(`\n📦 Processing batch ${Math.floor(i/concurrency) + 1}/${Math.ceil(brands.length/concurrency)} (${batch.length} brands)`);
        console.log('Brands:', batch.map(b => b.name).join(', '));
        console.log('-'.repeat(60));
        
        // Process batch concurrently
        const batchPromises = batch.map(brand => processSingleBrand(brand, researcher));
        const batchResults = await Promise.all(batchPromises);
        
        // Collect results
        batchResults.forEach(result => {
            if (result.success) {
                results.push(result);
            } else {
                errors.push(result);
            }
        });
        
        console.log(`\n✅ Batch complete: ${batchResults.filter(r => r.success).length} succeeded, ${batchResults.filter(r => !r.success).length} failed`);
        
        // Rate limiting between batches (except for last batch)
        if (i + concurrency < brands.length) {
            console.log('⏳ Waiting 3 seconds before next batch...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    // Save batch summary
    const summaryPath = path.join(__dirname, '..', 'downloads', `kl-brands-concurrent-summary-${new Date().toISOString().split('T')[0]}.json`);
    const summary = {
        processing_date: new Date().toISOString(),
        total_brands: brands.length,
        successful: results.length,
        failed: errors.length,
        concurrency_level: concurrency,
        total_time_seconds: totalTime,
        avg_time_per_brand: (totalTime / brands.length).toFixed(2),
        results: results,
        errors: errors
    };
    
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 CONCURRENT BATCH PROCESSING SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Successfully processed: ${results.length}/${brands.length} brands`);
    console.log(`❌ Failed: ${errors.length} brands`);
    console.log(`⏱️  Total time: ${totalTime.toFixed(1)} seconds`);
    console.log(`⚡ Average time per brand: ${(totalTime / brands.length).toFixed(2)} seconds`);
    console.log(`🔄 Concurrency level: ${concurrency}`);
    console.log(`💾 Summary saved to: ${summaryPath}`);
    
    if (results.length > 0) {
        const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
        console.log(`📈 Average confidence: ${avgConfidence.toFixed(1)}%`);
    }
    
    return summary;
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const concurrency = parseInt(args[0]) || 5;
    const startIndex = parseInt(args[1]) || 0;
    const endIndex = parseInt(args[2]) || klBrands.length;
    
    console.log('🚴 K-L Bicycle Brands Concurrent Batch Processor');
    console.log('===============================================');
    console.log(`Total brands: ${klBrands.length}`);
    console.log(`Processing range: ${startIndex} to ${endIndex}`);
    console.log(`Concurrency level: ${concurrency}`);
    
    const brandsToProcess = klBrands.slice(startIndex, endIndex);
    console.log(`Brands to process: ${brandsToProcess.length}`);
    
    try {
        await processBrandsConcurrently(brandsToProcess, concurrency);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { klBrands, processBrandsConcurrently };