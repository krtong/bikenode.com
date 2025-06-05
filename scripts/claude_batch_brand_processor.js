#!/usr/bin/env node

/**
 * Claude-Ready Concurrent Brand Processor
 * Designed to work with Claude's WebSearch tool for real brand research
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load brands from the KZ todo list
 */
function loadKZBrands() {
    const todoPath = path.join(__dirname, '..', 'scrapers', 'kz_brands_todo.txt');
    const content = fs.readFileSync(todoPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    return lines.map(line => {
        const match = line.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
            return { name: match[1].trim(), id: match[2].trim() };
        }
        return null;
    }).filter(Boolean);
}

/**
 * Filter brands by letter range
 */
function filterBrandsByRange(brands, startLetter, endLetter) {
    return brands.filter(brand => {
        const firstChar = brand.name[0].toUpperCase();
        return firstChar >= startLetter && firstChar <= endLetter;
    });
}

/**
 * Simple brand research data structure
 */
function createBrandResearchStructure(brandName, brandId) {
    return {
        brand_id: brandId,
        brand_name: brandName,
        description: null,
        wikipedia_url: null,
        founding: {
            year: null,
            location: { city: null, state_province: null, country: null },
            founders: []
        },
        headquarters: {
            city: null,
            state_province: null,
            country: null,
            address: null
        },
        parent_company: null,
        subsidiaries: [],
        annual_revenue: null,
        employees: null,
        famous_models: [],
        specialties: [],
        website: null,
        social_media: {
            facebook: null,
            instagram: null,
            twitter: null,
            youtube: null,
            linkedin: null
        },
        business_structure: null,
        research_metadata: {
            research_date: new Date().toISOString(),
            confidence_score: 0,
            data_quality_notes: ""
        }
    };
}

/**
 * Process a single brand with web search
 * This function is designed to be called by Claude with WebSearch
 */
async function researchBrandWithWebSearch(brand, webSearchFn) {
    console.log(`\n🔍 Researching: ${brand.name}`);
    const brandData = createBrandResearchStructure(brand.name, brand.id);
    const sources = [];
    let totalConfidence = 0;
    let searchCount = 0;
    
    // Search queries optimized for bicycle brands
    const queries = [
        `"${brand.name}" bicycle company founded year history Wikipedia`,
        `"${brand.name}" bikes headquarters location address contact`,
        `"${brand.name}" bicycles famous models products flagship`,
        `"${brand.name}" bike company parent subsidiary ownership`,
        `"${brand.name}" bicycles official website social media`
    ];
    
    try {
        // Execute searches
        for (const query of queries) {
            const results = await webSearchFn(query);
            if (results && results.length > 0) {
                sources.push({ query, results: results.length });
                searchCount++;
            }
        }
        
        // Calculate confidence based on sources found
        totalConfidence = Math.min(100, searchCount * 20);
        brandData.research_metadata.confidence_score = totalConfidence;
        brandData.research_metadata.data_quality_notes = `Found ${searchCount}/${queries.length} search results`;
        
        console.log(`✅ ${brand.name}: ${searchCount} searches, ${totalConfidence}% confidence`);
        
        return {
            success: true,
            brand: brandData,
            sources: sources,
            confidence: totalConfidence
        };
        
    } catch (error) {
        console.error(`❌ Error researching ${brand.name}: ${error.message}`);
        return {
            success: false,
            brand: brandData,
            error: error.message
        };
    }
}

/**
 * Process multiple brands concurrently
 */
async function processBrandsConcurrently(brands, webSearchFn, concurrency = 5) {
    console.log(`\n🚀 Processing ${brands.length} brands concurrently (batch size: ${concurrency})`);
    
    const results = [];
    const startTime = Date.now();
    
    // Process in batches to respect rate limits
    for (let i = 0; i < brands.length; i += concurrency) {
        const batch = brands.slice(i, Math.min(i + concurrency, brands.length));
        console.log(`\n📦 Batch ${Math.floor(i/concurrency) + 1}: ${batch.map(b => b.name).join(', ')}`);
        
        // Process batch concurrently
        const batchPromises = batch.map(brand => 
            researchBrandWithWebSearch(brand, webSearchFn)
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Rate limit between batches
        if (i + concurrency < brands.length) {
            console.log('⏳ Rate limiting pause...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    // Summary statistics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgConfidence = successful > 0 
        ? results.filter(r => r.success).reduce((sum, r) => sum + r.confidence, 0) / successful 
        : 0;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 PROCESSING COMPLETE');
    console.log('='.repeat(50));
    console.log(`✅ Successful: ${successful}/${brands.length}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Time: ${totalTime.toFixed(1)}s (${(totalTime/brands.length).toFixed(1)}s/brand)`);
    console.log(`📈 Avg Confidence: ${avgConfidence.toFixed(1)}%`);
    
    return {
        brands: results,
        summary: {
            total: brands.length,
            successful,
            failed,
            avgConfidence,
            totalTimeSeconds: totalTime
        }
    };
}

/**
 * Save results to file
 */
function saveResults(results, prefix = 'brand-research') {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${prefix}-${timestamp}.json`;
    const filepath = path.join(__dirname, '..', 'downloads', filename);
    
    // Ensure downloads directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${filepath}`);
    
    return filepath;
}

/**
 * Main function for Claude to use
 */
export async function processKLBrands(webSearchFn) {
    // Load all KZ brands
    const allBrands = loadKZBrands();
    
    // Filter K-L brands
    const klBrands = filterBrandsByRange(allBrands, 'K', 'L');
    
    console.log('🚴 K-L Brand Processor for Claude');
    console.log('='.repeat(40));
    console.log(`Found ${klBrands.length} K-L brands to process`);
    
    // Process brands
    const results = await processBrandsConcurrently(klBrands, webSearchFn, 5);
    
    // Save results
    const filepath = saveResults(results, 'kl-brands');
    
    return {
        filepath,
        summary: results.summary,
        brands: results.brands
    };
}

/**
 * Process any letter range
 */
export async function processBrandRange(startLetter, endLetter, webSearchFn, concurrency = 5) {
    const allBrands = loadKZBrands();
    const filteredBrands = filterBrandsByRange(allBrands, startLetter, endLetter);
    
    console.log(`\n🚴 Processing ${startLetter}-${endLetter} Brands`);
    console.log('='.repeat(40));
    console.log(`Found ${filteredBrands.length} brands to process`);
    
    const results = await processBrandsConcurrently(filteredBrands, webSearchFn, concurrency);
    const filepath = saveResults(results, `${startLetter.toLowerCase()}${endLetter.toLowerCase()}-brands`);
    
    return {
        filepath,
        summary: results.summary,
        brands: results.brands
    };
}

// Export for use by Claude
export {
    loadKZBrands,
    filterBrandsByRange,
    researchBrandWithWebSearch,
    processBrandsConcurrently,
    saveResults
};