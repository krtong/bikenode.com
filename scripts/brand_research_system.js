#!/usr/bin/env node

/**
 * Brand Research System
 * Automatically gathers information about bicycle companies and formats it into structured JSON
 */

import fs from 'fs';
import path from 'path';

class BrandResearcher {
    constructor() {
        this.brandData = {};
        this.confidence = {};
        this.sources = [];
    }

    /**
     * Generate brand ID from brand name
     */
    generateBrandId(brandName) {
        return brandName.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .replace(/bikes?$/, '')
            .replace(/-+$/, '');
    }

    /**
     * Initialize brand data structure
     */
    initializeBrandData(brandName) {
        const brandId = this.generateBrandId(brandName);
        
        this.brandData = {
            brand_id: brandId,
            brand_name: brandName,
            wikipedia_url: null,
            logo: {
                logo_url: null,
                icon_url: null
            },
            description: null,
            founders: [],
            founding: {
                year: null,
                location: {
                    city: null,
                    state_province: null,
                    country: null
                }
            },
            headquarters: {
                address: null,
                city: null,
                state_province: null,
                country: null
            },
            parent_company: null,
            business_structure: null,
            employee_count: null,
            revenue: null,
            famous_models: [],
            website: null,
            social_media: {
                facebook: null,
                instagram: null,
                twitter: null,
                youtube: null
            },
            specialties: [],
            history: null,
            research_metadata: {
                research_date: new Date().toISOString(),
                confidence_score: null,
                sources_count: 0,
                data_quality_notes: []
            }
        };

        this.confidence = {
            brand_name: 100,
            founding_year: 0,
            headquarters: 0,
            description: 0,
            founders: 0,
            website: 0,
            famous_models: 0,
            parent_company: 0,
            overall: 0
        };
    }

    /**
     * Extract founding information from text
     */
    extractFoundingInfo(text) {
        const yearRegex = /(?:founded|established|started|began|created).*?(\d{4})/gi;
        const locationRegex = /(?:founded|established|started|based).*?in\s+([^,\n.]+)(?:,\s*([^,\n.]+))?(?:,\s*([^,\n.]+))?/gi;
        
        let match;
        
        // Extract founding year
        while ((match = yearRegex.exec(text)) !== null) {
            const year = parseInt(match[1]);
            if (year >= 1800 && year <= new Date().getFullYear()) {
                this.brandData.founding.year = year;
                this.confidence.founding_year = 80;
                break;
            }
        }

        // Extract founding location
        locationRegex.lastIndex = 0;
        while ((match = locationRegex.exec(text)) !== null) {
            if (match[1]) {
                this.brandData.founding.location.city = match[1].trim();
                if (match[2]) {
                    this.brandData.founding.location.state_province = match[2].trim();
                }
                if (match[3]) {
                    this.brandData.founding.location.country = match[3].trim();
                } else if (match[2] && this.isCountry(match[2].trim())) {
                    this.brandData.founding.location.country = match[2].trim();
                    this.brandData.founding.location.state_province = null;
                }
                this.confidence.headquarters = 70;
                break;
            }
        }
    }

    /**
     * Extract headquarters information
     */
    extractHeadquarters(text) {
        const hqRegex = /(?:headquarters|headquartered|based).*?(?:in\s+)?([^,\n.]+)(?:,\s*([^,\n.]+))?(?:,\s*([^,\n.]+))?/gi;
        
        let match;
        while ((match = hqRegex.exec(text)) !== null) {
            if (match[1]) {
                this.brandData.headquarters.city = match[1].trim();
                if (match[2]) {
                    this.brandData.headquarters.state_province = match[2].trim();
                }
                if (match[3]) {
                    this.brandData.headquarters.country = match[3].trim();
                } else if (match[2] && this.isCountry(match[2].trim())) {
                    this.brandData.headquarters.country = match[2].trim();
                    this.brandData.headquarters.state_province = null;
                }
                this.confidence.headquarters = Math.max(this.confidence.headquarters, 75);
                break;
            }
        }
    }

    /**
     * Extract famous bike models
     */
    extractFamousModels(text) {
        const modelPatterns = [
            /(?:famous|popular|well-known|flagship|signature).*?(?:bikes?|models?).*?(?:include|are|:)\s*([^.!?]+)/gi,
            /(?:models?).*?(?:include|such as|like)\s*([^.!?]+)/gi
        ];

        for (const pattern of modelPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const modelsText = match[1];
                const models = modelsText.split(/,|and|\n/)
                    .map(m => m.trim())
                    .filter(m => m.length > 2 && m.length < 50)
                    .slice(0, 5);
                
                this.brandData.famous_models.push(...models);
                this.confidence.famous_models = 60;
                break;
            }
        }
    }

    /**
     * Extract website URL
     */
    extractWebsite(text) {
        const urlRegex = /https?:\/\/(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)/g;
        const matches = text.match(urlRegex);
        
        if (matches) {
            // Find the most relevant URL (likely the company website)
            const brandKeywords = this.brandData.brand_name.toLowerCase().split(/\s+/);
            
            for (const url of matches) {
                const domain = url.replace(/https?:\/\/(?:www\.)?/, '').split('/')[0];
                
                if (brandKeywords.some(keyword => domain.includes(keyword.replace(/bikes?/, '')))) {
                    this.brandData.website = url;
                    this.brandData.logo.icon_url = `${url}/favicon.ico`;
                    this.confidence.website = 85;
                    break;
                }
            }
            
            // Fallback to first reasonable URL
            if (!this.brandData.website && matches.length > 0) {
                this.brandData.website = matches[0];
                this.brandData.logo.icon_url = `${matches[0]}/favicon.ico`;
                this.confidence.website = 60;
            }
        }
    }

    /**
     * Extract founders information
     */
    extractFounders(text) {
        const founderPatterns = [
            /(?:founded|established|started|created).*?by\s+([^,\n.]+)/gi,
            /founders?\s*:?\s*([^,\n.]+)/gi,
            /(?:co-)?founder\s+([^,\n.]+)/gi
        ];

        for (const pattern of founderPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const foundersText = match[1].trim();
                if (foundersText.length > 2 && foundersText.length < 100) {
                    const founders = foundersText.split(/\s+and\s+|,\s*/)
                        .map(f => f.trim())
                        .filter(f => f.length > 2)
                        .slice(0, 5);
                    
                    this.brandData.founders.push(...founders);
                    this.confidence.founders = 70;
                    break;
                }
            }
        }
    }

    /**
     * Simple country detection
     */
    isCountry(text) {
        const countries = ['USA', 'United States', 'Canada', 'UK', 'United Kingdom', 'Germany', 'France', 'Italy', 'Japan', 'Taiwan', 'China'];
        return countries.some(country => text.toLowerCase().includes(country.toLowerCase()));
    }

    /**
     * Calculate overall confidence score
     */
    calculateConfidence() {
        const weights = {
            brand_name: 0.1,
            founding_year: 0.15,
            headquarters: 0.15,
            description: 0.2,
            founders: 0.1,
            website: 0.15,
            famous_models: 0.1,
            parent_company: 0.05
        };

        let totalScore = 0;
        let totalWeight = 0;

        for (const [key, weight] of Object.entries(weights)) {
            if (this.confidence[key] > 0) {
                totalScore += this.confidence[key] * weight;
                totalWeight += weight;
            }
        }

        this.confidence.overall = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
        this.brandData.research_metadata.confidence_score = this.confidence.overall;
    }

    /**
     * Process search results and extract information
     */
    processSearchResults(searchResults) {
        console.log(`Processing ${searchResults.length} search results...`);
        
        let combinedText = '';
        
        for (const result of searchResults) {
            this.sources.push({
                title: result.title,
                url: result.url,
                snippet: result.snippet
            });
            
            combinedText += `${result.title} ${result.snippet} `;
        }

        // Extract various pieces of information
        this.extractFoundingInfo(combinedText);
        this.extractHeadquarters(combinedText);
        this.extractFamousModels(combinedText);
        this.extractWebsite(combinedText);
        this.extractFounders(combinedText);

        // Create description from first relevant snippet
        if (searchResults.length > 0) {
            this.brandData.description = searchResults[0].snippet;
            this.confidence.description = 70;
        }

        // Update metadata
        this.brandData.research_metadata.sources_count = this.sources.length;
        this.calculateConfidence();
        
        // Add data quality notes
        this.addQualityNotes();
    }

    /**
     * Add data quality assessment notes
     */
    addQualityNotes() {
        const notes = [];
        
        if (this.confidence.overall < 50) {
            notes.push("Low confidence: Limited information found");
        }
        
        if (!this.brandData.founding.year) {
            notes.push("Founding year not found");
        }
        
        if (!this.brandData.website) {
            notes.push("Official website not identified");
        }
        
        if (this.brandData.founders.length === 0) {
            notes.push("Founder information not found");
        }
        
        if (this.brandData.famous_models.length === 0) {
            notes.push("Famous bike models not identified");
        }

        if (notes.length === 0) {
            notes.push("Research completed successfully with good data coverage");
        }

        this.brandData.research_metadata.data_quality_notes = notes;
    }

    /**
     * Save results to file
     */
    saveResults(outputPath) {
        const output = {
            brand_data: this.brandData,
            confidence_scores: this.confidence,
            sources: this.sources
        };

        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        console.log(`Results saved to: ${outputPath}`);
    }

    /**
     * Main research function - this will be called by external script
     */
    async researchBrand(brandName, webSearchFunction) {
        console.log(`\n=== Researching: ${brandName} ===`);
        
        this.initializeBrandData(brandName);
        
        // Perform multiple targeted searches
        const searchQueries = [
            `${brandName} bicycle company history founding`,
            `${brandName} bikes headquarters founded`,
            `${brandName} bicycle famous models bikes`,
            `${brandName} cycling company founders website`
        ];

        let allResults = [];
        
        for (const query of searchQueries) {
            console.log(`Searching: "${query}"`);
            try {
                const results = await webSearchFunction(query);
                if (results && results.length > 0) {
                    allResults.push(...results);
                }
                
                // Add delay between searches to be respectful
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.log(`Search failed for query "${query}": ${error.message}`);
            }
        }

        // Remove duplicates based on URL
        const uniqueResults = allResults.filter((result, index, self) =>
            index === self.findIndex(r => r.url === result.url)
        );

        this.processSearchResults(uniqueResults.slice(0, 10)); // Limit to top 10 results
        
        return {
            brand_data: this.brandData,
            confidence_scores: this.confidence,
            sources: this.sources
        };
    }
}

// Export for use by other scripts
export default BrandResearcher;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const brandName = process.argv[2];
    
    if (!brandName) {
        console.log('Usage: node brand_research_system.js "Brand Name"');
        console.log('Example: node brand_research_system.js "Surly Bikes"');
        process.exit(1);
    }

    console.log('Brand Research System');
    console.log('Note: This script provides the research framework.');
    console.log('Use research_surly_bikes.js to see it in action with web search.');
    console.log(`\nBrand to research: ${brandName}`);
    
    const researcher = new BrandResearcher();
    researcher.initializeBrandData(brandName);
    
    console.log('\nInitialized brand data structure:');
    console.log(JSON.stringify(researcher.brandData, null, 2));
}