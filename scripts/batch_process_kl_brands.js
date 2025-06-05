#!/usr/bin/env node

/**
 * Batch Process K-L Bicycle Brands
 * Processes bicycle brands starting with K and L
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
// In production with Claude, this would use the actual WebSearch tool
async function mockWebSearch(query) {
    console.log(`🔍 WebSearch: "${query}"`);
    
    // Simulate search results
    return [
        {
            title: `${query} - Search Results`,
            url: `https://example.com/search?q=${encodeURIComponent(query)}`,
            snippet: `Information about ${query}`
        }
    ];
}

async function processBrands(brands, startIndex = 0) {
    const researcher = new ProductionBrandResearcher();
    
    // In production, this would be replaced with the actual WebSearch function from Claude
    researcher.setWebSearchFunction(mockWebSearch);
    
    const results = [];
    const errors = [];
    
    console.log(`\n🚀 Processing ${brands.length} brands starting from index ${startIndex}\n`);
    
    for (let i = startIndex; i < brands.length; i++) {
        const brand = brands[i];
        console.log(`\n📍 Processing brand ${i + 1}/${brands.length}: ${brand.name}`);
        console.log('=' .repeat(60));
        
        try {
            // Research the brand
            const researchResults = await researcher.researchBrandComplete(brand.name + " bicycles");
            
            // Save individual results
            const saved = researcher.saveProductionResults(researchResults, brand.name);
            
            results.push({
                brand: brand.name,
                brand_id: brand.id,
                success: true,
                confidence: researchResults.confidence_scores.overall,
                file: saved.file_path
            });
            
            console.log(`✅ Successfully researched ${brand.name} (Confidence: ${researchResults.confidence_scores.overall}%)`);
            
            // Rate limiting - wait 2 seconds between brands
            if (i < brands.length - 1) {
                console.log('⏳ Waiting 2 seconds before next brand...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
        } catch (error) {
            console.error(`❌ Error processing ${brand.name}: ${error.message}`);
            errors.push({
                brand: brand.name,
                brand_id: brand.id,
                error: error.message
            });
        }
    }
    
    // Save batch summary
    const summaryPath = path.join(__dirname, '..', 'downloads', `kl-brands-batch-summary-${new Date().toISOString().split('T')[0]}.json`);
    const summary = {
        processing_date: new Date().toISOString(),
        total_brands: brands.length,
        successful: results.length,
        failed: errors.length,
        results: results,
        errors: errors
    };
    
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 BATCH PROCESSING SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Successfully processed: ${results.length}/${brands.length} brands`);
    console.log(`❌ Failed: ${errors.length} brands`);
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
    const startIndex = parseInt(args[0]) || 0;
    
    console.log('🚴 K-L Bicycle Brands Batch Processor');
    console.log('=====================================');
    console.log(`Total brands to process: ${klBrands.length}`);
    
    if (startIndex > 0) {
        console.log(`Starting from index: ${startIndex}`);
    }
    
    try {
        await processBrands(klBrands, startIndex);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { klBrands, processBrands };