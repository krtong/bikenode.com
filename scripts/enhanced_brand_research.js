#!/usr/bin/env node

/**
 * Enhanced Brand Research System
 * Improved version with better data extraction and WebSearch integration
 */

import fs from 'fs';
import path from 'path';

class EnhancedBrandResearcher {
    constructor() {
        this.brandData = {};
        this.confidence = {};
        this.sources = [];
    }

    generateBrandId(brandName) {
        return brandName.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .replace(/bikes?$/, '')
            .replace(/-+$/, '');
    }

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
     * Enhanced data extraction with better parsing
     */
    async processWebSearchResults(webSearchFunction) {
        const searchQueries = [
            `${this.brandData.brand_name} bicycle company founding year history`,
            `${this.brandData.brand_name} headquarters address location`,
            `${this.brandData.brand_name} famous popular bike models`,
            `${this.brandData.brand_name} official website founders`,
            `"${this.brandData.brand_name}" parent company owner`
        ];

        console.log('🔍 Performing systematic web search...\n');
        
        for (const query of searchQueries) {
            try {
                console.log(`📡 Searching: "${query}"`);
                const results = await webSearchFunction(query);
                
                if (results && results.length > 0) {
                    this.processSingleSearchResult(results, query);
                    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
                }
            } catch (error) {
                console.log(`❌ Search failed for: "${query}" - ${error.message}`);
            }
        }
    }

    processSingleSearchResult(results, originalQuery) {
        for (const result of results) {
            this.sources.push({
                title: result.title,
                url: result.url,
                snippet: result.snippet,
                query: originalQuery
            });

            const text = `${result.title} ${result.snippet}`;
            
            // Extract specific data based on query type
            if (originalQuery.includes('founding') || originalQuery.includes('history')) {
                this.extractFoundingInfo(text);
            }
            
            if (originalQuery.includes('headquarters') || originalQuery.includes('address')) {
                this.extractHeadquarters(text);
            }
            
            if (originalQuery.includes('models') || originalQuery.includes('famous')) {
                this.extractFamousModels(text);
            }
            
            if (originalQuery.includes('website') || originalQuery.includes('founders')) {
                this.extractWebsiteAndFounders(text);
            }
            
            if (originalQuery.includes('parent company')) {
                this.extractParentCompany(text);
            }

            // Always check for Wikipedia
            if (result.url.includes('wikipedia.org')) {
                this.brandData.wikipedia_url = result.url;
            }

            // Set description from best source
            if (!this.brandData.description && result.snippet.length > 50) {
                this.brandData.description = result.snippet;
                this.confidence.description = 75;
            }
        }
    }

    extractFoundingInfo(text) {
        // Enhanced founding year extraction
        const yearPatterns = [
            /founded in (\d{4})/i,
            /established in (\d{4})/i,
            /started in (\d{4})/i,
            /since (\d{4})/i,
            /(\d{4})\s*[-–]\s*present/i,
            /began in (\d{4})/i
        ];

        for (const pattern of yearPatterns) {
            const match = text.match(pattern);
            if (match) {
                const year = parseInt(match[1]);
                if (year >= 1800 && year <= new Date().getFullYear()) {
                    this.brandData.founding.year = year;
                    this.confidence.founding_year = 85;
                    break;
                }
            }
        }

        // Location extraction
        const locationPatterns = [
            /founded in ([^,\n.]+),\s*([^,\n.]+),?\s*([^,\n.]+)?/i,
            /established in ([^,\n.]+),\s*([^,\n.]+),?\s*([^,\n.]+)?/i,
            /based in ([^,\n.]+),\s*([^,\n.]+),?\s*([^,\n.]+)?/i
        ];

        for (const pattern of locationPatterns) {
            const match = text.match(pattern);
            if (match) {
                this.brandData.founding.location.city = match[1].trim();
                if (match[2]) this.brandData.founding.location.state_province = match[2].trim();
                if (match[3]) this.brandData.founding.location.country = match[3].trim();
                this.confidence.headquarters = 80;
                break;
            }
        }
    }

    extractHeadquarters(text) {
        // Extract specific address
        const addressPattern = /(\d+\s+[^,\n]+),\s*([^,\n]+),\s*([A-Z]{2})\s*(\d{5})/i;
        const match = text.match(addressPattern);
        
        if (match) {
            this.brandData.headquarters.address = `${match[1]}, ${match[2]}, ${match[3]} ${match[4]}`;
            this.brandData.headquarters.city = match[2].trim();
            this.brandData.headquarters.state_province = match[3].trim();
            this.brandData.headquarters.country = "USA";
            this.confidence.headquarters = 95;
        } else {
            // Fallback to city extraction
            const cityPattern = /(?:headquarters|headquartered|based).*?in\s+([^,\n.]+)(?:,\s*([^,\n.]+))?/i;
            const cityMatch = text.match(cityPattern);
            if (cityMatch) {
                this.brandData.headquarters.city = cityMatch[1].trim();
                if (cityMatch[2]) this.brandData.headquarters.state_province = cityMatch[2].trim();
                this.confidence.headquarters = Math.max(this.confidence.headquarters, 70);
            }
        }
    }

    extractFamousModels(text) {
        const modelPatterns = [
            /models?\s+include[s]?\s+([^.!?]+)/i,
            /popular.*?bikes?\s+(?:include|are)\s+([^.!?]+)/i,
            /famous.*?models?\s+([^.!?]+)/i,
            /(Long Haul Trucker|Pugsley|Cross-Check|Straggler|Midnight Special|Bridge Club|Disc Trucker|Krampus)/gi
        ];

        const foundModels = new Set();
        
        for (const pattern of modelPatterns) {
            const matches = text.match(pattern);
            if (matches) {
                if (pattern.source.includes('Long Haul')) {
                    // Direct model name pattern
                    foundModels.add(matches[0]);
                } else {
                    // List pattern
                    const modelList = matches[1];
                    const models = modelList.split(/,|and|\n/)
                        .map(m => m.trim())
                        .filter(m => m.length > 2 && m.length < 30);
                    
                    models.forEach(model => foundModels.add(model));
                }
            }
        }

        if (foundModels.size > 0) {
            this.brandData.famous_models = Array.from(foundModels).slice(0, 8);
            this.confidence.famous_models = 80;
        }
    }

    extractWebsiteAndFounders(text) {
        // Website extraction
        const urlPattern = /https?:\/\/(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)/g;
        const urls = text.match(urlPattern);
        
        if (urls) {
            for (const url of urls) {
                const brandWords = this.brandData.brand_name.toLowerCase().split(/\s+/);
                const domain = url.replace(/https?:\/\/(?:www\.)?/, '').split('/')[0];
                
                if (brandWords.some(word => domain.includes(word.replace(/bikes?/, '')))) {
                    this.brandData.website = url;
                    this.brandData.logo.icon_url = `${url}/favicon.ico`;
                    this.confidence.website = 90;
                    break;
                }
            }
        }

        // Founders extraction
        const founderPatterns = [
            /founded by ([^,\n.]+)/i,
            /founder[s]?\s*:?\s*([^,\n.]+)/i,
            /started by ([^,\n.]+)/i
        ];

        for (const pattern of founderPatterns) {
            const match = text.match(pattern);
            if (match) {
                const foundersText = match[1].trim();
                if (foundersText.length < 100) {
                    const founders = foundersText.split(/\s+and\s+|,\s*/)
                        .map(f => f.trim())
                        .filter(f => f.length > 2 && f.length < 50);
                    
                    this.brandData.founders = founders;
                    this.confidence.founders = 75;
                    break;
                }
            }
        }
    }

    extractParentCompany(text) {
        const patterns = [
            /(?:part of|owned by|division of|subsidiary of)\s+([^,\n.]+)/i,
            /parent company[:\s]+([^,\n.]+)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                this.brandData.parent_company = match[1].trim();
                this.confidence.parent_company = 80;
                break;
            }
        }
    }

    calculateOverallConfidence() {
        const weights = {
            founding_year: 0.20,
            headquarters: 0.15,
            description: 0.15,
            founders: 0.15,
            website: 0.15,
            famous_models: 0.10,
            parent_company: 0.10
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
        this.brandData.research_metadata.sources_count = this.sources.length;
    }

    addQualityNotes() {
        const notes = [];
        
        if (this.confidence.overall >= 80) {
            notes.push("High quality research with comprehensive data coverage");
        } else if (this.confidence.overall >= 60) {
            notes.push("Good quality research with most key information found");
        } else {
            notes.push("Limited information available - low confidence in completeness");
        }
        
        if (!this.brandData.founding.year) notes.push("Founding year not determined");
        if (!this.brandData.website) notes.push("Official website not identified");
        if (this.brandData.founders.length === 0) notes.push("Founder information not found");
        if (this.brandData.famous_models.length === 0) notes.push("Famous bike models not identified");
        if (!this.brandData.headquarters.city) notes.push("Headquarters location incomplete");

        this.brandData.research_metadata.data_quality_notes = notes;
    }

    async researchBrand(brandName, webSearchFunction) {
        console.log(`\n=== Enhanced Brand Research: ${brandName} ===`);
        
        this.initializeBrandData(brandName);
        await this.processWebSearchResults(webSearchFunction);
        this.calculateOverallConfidence();
        this.addQualityNotes();
        
        return {
            brand_data: this.brandData,
            confidence_scores: this.confidence,
            sources: this.sources
        };
    }

    saveResults(outputPath) {
        const output = {
            brand_data: this.brandData,
            confidence_scores: this.confidence,
            sources: this.sources,
            research_metadata: {
                total_searches: new Set(this.sources.map(s => s.query)).size,
                unique_sources: this.sources.length,
                research_timestamp: new Date().toISOString(),
                system_version: "Enhanced Brand Research v2.0"
            }
        };

        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        console.log(`\n💾 Complete results saved to: ${outputPath}`);
    }
}

export default EnhancedBrandResearcher;