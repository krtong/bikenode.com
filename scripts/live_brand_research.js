#!/usr/bin/env node

/**
 * Live Brand Research Tool
 * Uses actual web search to research bicycle brands
 */

import BrandResearcher from './brand_research_system.js';
import fs from 'fs';
import path from 'path';

class LiveBrandResearch {
    constructor() {
        this.researcher = new BrandResearcher();
    }

    /**
     * Web search wrapper - this would be called by Claude with WebSearch tool
     */
    async performWebSearch(query) {
        // This is a placeholder for the actual WebSearch tool call
        // In the real implementation, Claude will replace this with WebSearch calls
        console.log(`🔍 Would search: "${query}"`);
        throw new Error('This function should be replaced with actual WebSearch tool calls by Claude');
    }

    /**
     * Research a brand using live web search
     */
    async researchBrandLive(brandName) {
        console.log(`\n🔍 Starting live research for: ${brandName}`);
        console.log('=' .repeat(50));
        
        try {
            const results = await this.researcher.researchBrand(brandName, this.performWebSearch.bind(this));
            
            // Save results
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${this.researcher.generateBrandId(brandName)}_research_${timestamp}.json`;
            const outputPath = path.join(__dirname, 'downloads', filename);
            
            // Create downloads directory if it doesn't exist
            const downloadsDir = path.dirname(outputPath);
            if (!fs.existsSync(downloadsDir)) {
                fs.mkdirSync(downloadsDir, { recursive: true });
            }
            
            this.researcher.saveResults(outputPath);
            
            return {
                results,
                outputPath
            };
            
        } catch (error) {
            console.error(`❌ Research failed for ${brandName}:`, error.message);
            throw error;
        }
    }

    /**
     * Print research summary
     */
    printSummary(results) {
        const { brand_data, confidence_scores, sources } = results;
        
        console.log('\n📊 Research Summary:');
        console.log('=' .repeat(30));
        console.log(`Brand: ${brand_data.brand_name}`);
        console.log(`Confidence: ${confidence_scores.overall}%`);
        console.log(`Sources: ${sources.length}`);
        console.log(`Founded: ${brand_data.founding.year || 'Unknown'}`);
        console.log(`Location: ${brand_data.headquarters.city || 'Unknown'}`);
        console.log(`Website: ${brand_data.website || 'Unknown'}`);
        
        if (brand_data.founders.length > 0) {
            console.log(`Founders: ${brand_data.founders.join(', ')}`);
        }
        
        if (brand_data.famous_models.length > 0) {
            console.log(`Famous Models: ${brand_data.famous_models.slice(0, 3).join(', ')}`);
        }
        
        console.log('\nData Quality Notes:');
        brand_data.research_metadata.data_quality_notes.forEach(note => {
            console.log(`  • ${note}`);
        });
    }
}

// Export for use by Claude
export default LiveBrandResearch;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const brandName = process.argv[2] || 'Surly Bikes';
    
    console.log('🚴 Live Brand Research Tool');
    console.log('==========================');
    console.log('Note: This script is designed to be used with Claude\'s WebSearch tool');
    console.log(`Target brand: ${brandName}\n`);
    
    const tool = new LiveBrandResearch();
    
    // Show what the research structure would look like
    tool.researcher.initializeBrandData(brandName);
    
    console.log('📋 Research Data Structure:');
    console.log(JSON.stringify(tool.researcher.brandData, null, 2));
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Claude will use WebSearch tool to gather information');
    console.log('2. Process and structure the findings');
    console.log('3. Save results to JSON file');
    console.log('4. Provide confidence assessment');
}