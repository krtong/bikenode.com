#!/usr/bin/env node

/**
 * Live Web Search Brand Research System
 * Production-ready system that integrates with Claude's WebSearch tool
 */

import EnhancedBrandResearcher from './enhanced_brand_research.js';
import fs from 'fs';
import path from 'path';

class LiveWebSearchResearcher extends EnhancedBrandResearcher {
    constructor(webSearchFunction) {
        super();
        this.webSearchFunction = webSearchFunction;
    }

    /**
     * Override the web search to use actual Claude WebSearch tool
     */
    async performWebSearch(query) {
        if (!this.webSearchFunction) {
            throw new Error('WebSearch function not provided. This should be called by Claude with WebSearch tool access.');
        }
        
        try {
            console.log(`🔍 Live search: "${query}"`);
            const results = await this.webSearchFunction(query);
            console.log(`   ✅ Found ${results.length} results`);
            return results;
        } catch (error) {
            console.log(`   ❌ Search failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Research a brand using live web search
     */
    async researchBrandLive(brandName) {
        console.log(`\n🌐 Live Brand Research: ${brandName}`);
        console.log('=' .repeat(40));
        console.log('🔍 Using real-time web search to gather information...\n');
        
        return await this.researchBrand(brandName, this.performWebSearch.bind(this));
    }

    /**
     * Enhanced result display with web search context
     */
    displayResults(results) {
        const { brand_data, confidence_scores, sources } = results;
        
        console.log('\n🎯 LIVE RESEARCH RESULTS');
        console.log('=' .repeat(25));
        console.log(`📊 Overall Confidence: ${confidence_scores.overall}%`);
        console.log(`🔍 Web Searches Performed: ${new Set(sources.map(s => s.query)).size}`);
        console.log(`📚 Total Sources Found: ${sources.length}`);
        console.log(`🗓️  Founded: ${brand_data.founding.year || 'Unknown'}`);
        console.log(`🏢 Headquarters: ${brand_data.headquarters.city || 'Unknown'}, ${brand_data.headquarters.state_province || ''}`);
        console.log(`🌐 Website: ${brand_data.website || 'Not found'}`);
        console.log(`👥 Founders: ${brand_data.founders.join(', ') || 'Not specified'}`);
        console.log(`🏭 Parent Company: ${brand_data.parent_company || 'Independent'}`);
        console.log(`🚲 Famous Models: ${brand_data.famous_models.length} identified`);
        
        if (brand_data.famous_models.length > 0) {
            console.log(`   ${brand_data.famous_models.slice(0, 5).join(', ')}`);
        }

        console.log('\n📈 CONFIDENCE METRICS');
        console.log('=' .repeat(20));
        const confidenceData = [
            ['Data Point', 'Confidence', 'Status'],
            ['Founding Year', confidence_scores.founding_year, confidence_scores.founding_year > 70 ? '✅' : '⚠️'],
            ['Headquarters', confidence_scores.headquarters, confidence_scores.headquarters > 70 ? '✅' : '⚠️'],
            ['Website', confidence_scores.website, confidence_scores.website > 70 ? '✅' : '❌'],
            ['Founders', confidence_scores.founders, confidence_scores.founders > 70 ? '✅' : '⚠️'],
            ['Famous Models', confidence_scores.famous_models, confidence_scores.famous_models > 70 ? '✅' : '⚠️'],
            ['Parent Company', confidence_scores.parent_company, confidence_scores.parent_company > 70 ? '✅' : '❌']
        ];

        confidenceData.forEach((row, index) => {
            if (index === 0) {
                console.log(`${row[0].padEnd(15)} ${row[1].padEnd(12)} ${row[2]}`);
                console.log('-'.repeat(35));
            } else {
                console.log(`${row[0].padEnd(15)} ${row[1].toString().padEnd(12)} ${row[2]}`);
            }
        });

        return results;
    }

    /**
     * Save results with enhanced metadata
     */
    saveEnhancedResults(results, outputPath) {
        const enhancedOutput = {
            ...results,
            research_metadata: {
                ...results.research_metadata,
                search_methodology: "Live web search using Claude WebSearch tool",
                extraction_method: "Enhanced pattern matching and NLP",
                data_validation: "Confidence scoring and quality assessment",
                generated_by: "Live Web Search Brand Research System v1.0",
                generation_timestamp: new Date().toISOString()
            }
        };

        fs.writeFileSync(outputPath, JSON.stringify(enhancedOutput, null, 2));
        console.log(`\n💾 Enhanced results saved to: ${outputPath}`);
        
        return enhancedOutput;
    }
}

// Function to be used by Claude with WebSearch tool
async function researchBrandWithWebSearch(brandName, webSearchFunction) {
    const researcher = new LiveWebSearchResearcher(webSearchFunction);
    
    try {
        // Perform the research
        const results = await researcher.researchBrandLive(brandName);
        
        // Display results
        researcher.displayResults(results);
        
        // Save results
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${researcher.generateBrandId(brandName)}-live-research-${timestamp}.json`;
        const outputPath = path.join(process.cwd(), 'downloads', filename);
        
        // Create downloads directory if needed
        const downloadsDir = path.dirname(outputPath);
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir, { recursive: true });
        }
        
        const enhancedResults = researcher.saveEnhancedResults(results, outputPath);
        
        console.log('\n✅ Live brand research completed successfully!');
        console.log(`📁 Results available at: ${outputPath}`);
        
        return enhancedResults;
        
    } catch (error) {
        console.error('❌ Live research failed:', error);
        throw error;
    }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const brandName = process.argv[2] || 'Surly Bikes';
    
    console.log('🌐 Live Web Search Brand Research System');
    console.log('=' .repeat(40));
    console.log('⚠️  This system requires Claude\'s WebSearch tool access.');
    console.log(`🎯 Target brand: ${brandName}`);
    console.log('\n📋 To use this system:');
    console.log('1. Import the researchBrandWithWebSearch function');
    console.log('2. Call it with a brand name and WebSearch function');
    console.log('3. The system will perform live web searches and structure the data');
    console.log('\nExample usage in Claude:');
    console.log('```javascript');
    console.log('import { researchBrandWithWebSearch } from "./live_web_search_research.js";');
    console.log('const results = await researchBrandWithWebSearch("Brand Name", webSearchFunction);');
    console.log('```');
}

export { LiveWebSearchResearcher, researchBrandWithWebSearch };
export default researchBrandWithWebSearch;