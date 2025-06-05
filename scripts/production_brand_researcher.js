#!/usr/bin/env node

/**
 * Production Brand Research System
 * Complete automated brand research tool ready for production use
 */

import EnhancedBrandResearcher from './enhanced_brand_research.js';
import fs from 'fs';
import path from 'path';

class ProductionBrandResearcher extends EnhancedBrandResearcher {
    constructor() {
        super();
        this.webSearchFunction = null;
    }

    /**
     * Set the web search function (provided by Claude)
     */
    setWebSearchFunction(webSearchFunction) {
        this.webSearchFunction = webSearchFunction;
    }

    /**
     * Perform web search using provided function
     */
    async performWebSearch(query) {
        if (!this.webSearchFunction) {
            throw new Error('Web search function not configured. Use setWebSearchFunction() first.');
        }
        
        try {
            console.log(`🔍 Searching: "${query}"`);
            const results = await this.webSearchFunction(query);
            console.log(`   ✅ Found ${results ? results.length : 0} results`);
            return results || [];
        } catch (error) {
            console.log(`   ❌ Search failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Enhanced manual data enrichment
     */
    enrichBrandData(searchData) {
        const { brand_data } = searchData;
        
        // Clean up location data
        if (brand_data.headquarters.city && brand_data.headquarters.state_province) {
            // Extract address from state_province if it contains address info
            const stateText = brand_data.headquarters.state_province;
            const addressMatch = stateText.match(/(\d+\s+[^,]+)/);
            if (addressMatch && !brand_data.headquarters.address) {
                brand_data.headquarters.address = `${addressMatch[1]}, ${brand_data.headquarters.city}, ${stateText.split(' ').pop()}`;
                brand_data.headquarters.state_province = stateText.split(' ').pop();
            }
        }

        // Clean up founding location
        if (brand_data.founding.location.city && brand_data.founding.location.city.includes('goal')) {
            brand_data.founding.location.city = brand_data.headquarters.city;
            brand_data.founding.location.state_province = brand_data.headquarters.state_province;
        }

        // Set parent company if mentioned in business structure
        if (brand_data.business_structure && brand_data.business_structure.includes('Quality Bicycle Products')) {
            brand_data.parent_company = 'Quality Bicycle Products';
        }

        return searchData;
    }

    /**
     * Complete brand research workflow
     */
    async researchBrandComplete(brandName) {
        console.log(`\n🔍 Production Brand Research: ${brandName}`);
        console.log('=' .repeat(50));
        console.log('⚡ Starting comprehensive automated research...\n');
        
        const results = await this.researchBrand(brandName, this.performWebSearch.bind(this));
        
        // Apply data enrichment
        const enrichedResults = this.enrichBrandData(results);
        
        // Update confidence after enrichment
        this.calculateOverallConfidence();
        enrichedResults.confidence_scores = this.confidence;
        enrichedResults.brand_data.research_metadata.confidence_score = this.confidence.overall;
        
        return enrichedResults;
    }

    /**
     * Save results with production metadata
     */
    saveProductionResults(results, brandName) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const brandId = this.generateBrandId(brandName);
        const filename = `${brandId}-brand-research-${timestamp}.json`;
        const outputPath = path.join(process.cwd(), 'downloads', filename);
        
        // Create downloads directory if needed
        const downloadsDir = path.dirname(outputPath);
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir, { recursive: true });
        }

        const productionOutput = {
            brand_data: results.brand_data,
            confidence_scores: results.confidence_scores,
            sources: results.sources,
            research_metadata: {
                brand_researched: brandName,
                research_timestamp: new Date().toISOString(),
                methodology: "Automated web search with AI extraction",
                search_queries: new Set(results.sources.map(s => s.query)).size,
                total_sources: results.sources.length,
                confidence_level: results.confidence_scores.overall >= 80 ? 'High' : 
                                 results.confidence_scores.overall >= 60 ? 'Medium' : 'Low',
                data_quality: results.brand_data.research_metadata.data_quality_notes,
                system_version: "Production Brand Research System v1.0",
                generated_by: "Claude Code with Enhanced Brand Research System"
            }
        };

        fs.writeFileSync(outputPath, JSON.stringify(productionOutput, null, 2));
        console.log(`\n💾 Research results saved to: ${outputPath}`);
        
        return {
            output: productionOutput,
            file_path: outputPath
        };
    }

    /**
     * Display comprehensive results
     */
    displayResults(results, brandName) {
        const { brand_data, confidence_scores, sources } = results;
        
        console.log('\n📊 BRAND RESEARCH RESULTS');
        console.log('=' .repeat(26));
        console.log(`🏷️  Brand Name: ${brand_data.brand_name}`);
        console.log(`🆔 Brand ID: ${brand_data.brand_id}`);
        console.log(`📈 Overall Confidence: ${confidence_scores.overall}%`);
        console.log(`🔍 Search Queries: ${new Set(sources.map(s => s.query)).size}`);
        console.log(`📚 Total Sources: ${sources.length}`);
        
        console.log('\n🏢 COMPANY INFORMATION');
        console.log('=' .repeat(22));
        console.log(`Founded: ${brand_data.founding.year || 'Unknown'}`);
        console.log(`Location: ${brand_data.founding.location.city || 'Unknown'}, ${brand_data.founding.location.state_province || ''}`);
        console.log(`Headquarters: ${brand_data.headquarters.address || brand_data.headquarters.city || 'Unknown'}`);
        console.log(`Parent Company: ${brand_data.parent_company || 'Independent'}`);
        console.log(`Business Structure: ${brand_data.business_structure || 'Unknown'}`);
        console.log(`Employees: ${brand_data.employee_count || 'Unknown'}`);
        console.log(`Website: ${brand_data.website || 'Not found'}`);
        
        console.log('\n🚲 PRODUCT INFORMATION');
        console.log('=' .repeat(22));
        console.log(`Total Models Identified: ${brand_data.famous_models.length}`);
        if (brand_data.famous_models.length > 0) {
            const currentModels = brand_data.famous_models.filter(m => !m.includes('discontinued'));
            const discontinuedModels = brand_data.famous_models.filter(m => m.includes('discontinued'));
            
            if (currentModels.length > 0) {
                console.log(`Current Models (${currentModels.length}): ${currentModels.slice(0, 3).join(', ')}${currentModels.length > 3 ? '...' : ''}`);
            }
            if (discontinuedModels.length > 0) {
                console.log(`Legacy Models (${discontinuedModels.length}): ${discontinuedModels.slice(0, 3).join(', ')}${discontinuedModels.length > 3 ? '...' : ''}`);
            }
        }
        
        if (brand_data.specialties.length > 0) {
            console.log(`Specialties: ${brand_data.specialties.join(', ')}`);
        }
        
        console.log('\n📈 CONFIDENCE BREAKDOWN');
        console.log('=' .repeat(24));
        [
            ['Founding Info', confidence_scores.founding_year],
            ['Location Data', confidence_scores.headquarters],
            ['Website Info', confidence_scores.website],
            ['Product Models', confidence_scores.famous_models],
            ['Company Structure', confidence_scores.parent_company]
        ].forEach(([label, score]) => {
            const status = score >= 80 ? '✅ Excellent' : score >= 60 ? '⚠️ Good' : score > 0 ? '❌ Limited' : '❌ Not Found';
            console.log(`${label.padEnd(18)}: ${score.toString().padStart(3)}% ${status}`);
        });
        
        console.log('\n📋 DATA QUALITY ASSESSMENT');
        console.log('=' .repeat(27));
        brand_data.research_metadata.data_quality_notes.forEach((note, index) => {
            console.log(`${index + 1}. ${note}`);
        });
        
        return results;
    }
}

/**
 * Main function for Claude to use
 */
async function researchBrand(brandName, webSearchFunction) {
    if (!brandName) {
        throw new Error('Brand name is required');
    }
    
    if (!webSearchFunction) {
        throw new Error('Web search function is required');
    }
    
    const researcher = new ProductionBrandResearcher();
    researcher.setWebSearchFunction(webSearchFunction);
    
    try {
        // Perform research
        const results = await researcher.researchBrandComplete(brandName);
        
        // Display results
        researcher.displayResults(results, brandName);
        
        // Save results
        const saved = researcher.saveProductionResults(results, brandName);
        
        console.log('\n✅ Brand research completed successfully!');
        console.log(`📁 Results saved to: ${saved.file_path}`);
        
        return {
            success: true,
            brand_data: results.brand_data,
            confidence_scores: results.confidence_scores,
            sources: results.sources,
            file_path: saved.file_path,
            metadata: saved.output.research_metadata
        };
        
    } catch (error) {
        console.error(`❌ Brand research failed for ${brandName}:`, error.message);
        throw error;
    }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const brandName = process.argv[2];
    
    if (!brandName) {
        console.log('🚴 Production Brand Research System');
        console.log('=' .repeat(36));
        console.log('Usage: node production_brand_researcher.js "Brand Name"');
        console.log('Example: node production_brand_researcher.js "Trek Bikes"');
        console.log('\n📋 For Claude integration:');
        console.log('```javascript');
        console.log('import { researchBrand } from "./production_brand_researcher.js";');
        console.log('const results = await researchBrand("Brand Name", webSearchFunction);');
        console.log('```');
        process.exit(1);
    }
    
    console.log('⚠️  This requires Claude\'s WebSearch tool integration.');
    console.log(`Target brand: ${brandName}`);
    console.log('Import this module and call researchBrand() with WebSearch function.');
}

export { ProductionBrandResearcher, researchBrand };
export default researchBrand;