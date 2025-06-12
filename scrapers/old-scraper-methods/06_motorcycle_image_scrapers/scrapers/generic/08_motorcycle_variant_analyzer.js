#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Motorcycle Variant Analyzer & Expander
 * 
 * This script analyzes our current motorcycle database and:
 * 1. Identifies missing variants for each model
 * 2. Scrapes manufacturer websites to find all available variants
 * 3. Generates a comprehensive list of missing motorcycles
 * 4. Prepares data for variant expansion
 */
class MotorcycleVariantAnalyzer {
    constructor() {
        this.csvPath = '/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycles_updated.csv';
        this.outputDir = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers';
        this.analysisFile = path.join(this.outputDir, 'variant_analysis.json');
        this.missingVariantsFile = path.join(this.outputDir, 'missing_variants.csv');
        
        this.motorcycles = [];
        this.motorcycleMap = new Map(); // Map of Make_Model_Year -> variants
        this.brands = new Set();
        this.analysis = {
            totalMotorcycles: 0,
            totalModels: 0,
            brandsAnalyzed: 0,
            modelsWithSingleVariant: 0,
            modelsWithMultipleVariants: 0,
            potentialMissingVariants: 0,
            variantPatterns: {}
        };
        
        this.delayBetweenRequests = 2000; // 2 seconds
        this.maxRetries = 3;
        this.userAgents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ];
    }

    async loadMotorcycles() {
        console.log('📊 Loading motorcycles from CSV...');
        
        return new Promise((resolve, reject) => {
            const motorcycles = [];
            
            fs.createReadStream(this.csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    // Skip very old motorcycles (before 1990)
                    const year = parseInt(row.Year);
                    if (year >= 1990) {
                        motorcycles.push({
                            year: year,
                            make: row.Make.trim(),
                            model: row.Model.trim(),
                            package: row.Package ? row.Package.trim() : '',
                            category: row.Category ? row.Category.trim() : '',
                            engine: row.Engine ? row.Engine.trim() : ''
                        });
                    }
                })
                .on('end', () => {
                    this.motorcycles = motorcycles;
                    console.log(`✅ Loaded ${motorcycles.length} modern motorcycles (1990+)`);
                    resolve();
                })
                .on('error', reject);
        });
    }

    analyzeCurrentDatabase() {
        console.log('🔍 Analyzing current motorcycle database...');
        
        // Create map of Make_Model_Year -> variants
        this.motorcycles.forEach(moto => {
            const key = `${moto.make}_${moto.model}_${moto.year}`;
            
            if (!this.motorcycleMap.has(key)) {
                this.motorcycleMap.set(key, {
                    make: moto.make,
                    model: moto.model,
                    year: moto.year,
                    category: moto.category,
                    engine: moto.engine,
                    variants: []
                });
            }
            
            this.motorcycleMap.get(key).variants.push(moto.package || 'Standard');
            this.brands.add(moto.make);
        });

        // Analyze patterns
        this.analysis.totalMotorcycles = this.motorcycles.length;
        this.analysis.totalModels = this.motorcycleMap.size;
        this.analysis.brandsAnalyzed = this.brands.size;

        // Count models with single vs multiple variants
        for (const [key, modelData] of this.motorcycleMap) {
            if (modelData.variants.length === 1) {
                this.analysis.modelsWithSingleVariant++;
            } else {
                this.analysis.modelsWithMultipleVariants++;
            }

            // Track variant patterns
            const variantPattern = modelData.variants.sort().join('|');
            if (!this.analysis.variantPatterns[variantPattern]) {
                this.analysis.variantPatterns[variantPattern] = 0;
            }
            this.analysis.variantPatterns[variantPattern]++;
        }

        console.log(`📈 Analysis Complete:`);
        console.log(`   Total Motorcycles: ${this.analysis.totalMotorcycles.toLocaleString()}`);
        console.log(`   Unique Models: ${this.analysis.totalModels.toLocaleString()}`);
        console.log(`   Brands: ${this.analysis.brandsAnalyzed}`);
        console.log(`   Single Variant Models: ${this.analysis.modelsWithSingleVariant.toLocaleString()}`);
        console.log(`   Multi Variant Models: ${this.analysis.modelsWithMultipleVariants.toLocaleString()}`);
    }

    getTopBrandsForAnalysis(limit = 10) {
        // Count motorcycles per brand
        const brandCounts = {};
        this.motorcycles.forEach(moto => {
            if (!brandCounts[moto.make]) {
                brandCounts[moto.make] = 0;
            }
            brandCounts[moto.make]++;
        });

        // Sort by count and return top brands
        return Object.entries(brandCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([brand, count]) => ({ brand, count }));
    }

    async searchForMissingVariants(brand, model, year) {
        console.log(`🔍 Searching for variants: ${year} ${brand} ${model}`);
        
        const searchQueries = [
            `${year} ${brand} ${model} variants`,
            `${year} ${brand} ${model} specs`,
            `${brand} ${model} ${year} models`,
            `${brand} ${model} ${year} S R Premium`
        ];

        const potentialVariants = new Set();
        
        for (const query of searchQueries) {
            try {
                await this.delay(this.delayBetweenRequests);
                
                // Use Google search to find potential variants
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                
                const response = await axios.get(searchUrl, {
                    headers: {
                        'User-Agent': this.getRandomUserAgent()
                    },
                    timeout: 10000
                });

                const $ = cheerio.load(response.data);
                
                // Extract text from search results
                const searchText = $('body').text().toLowerCase();
                
                // Look for common variant patterns
                const variantPatterns = [
                    /\b(s|r|rs|rr|rt|premium|pro|plus|sport|touring|adventure|base|standard)\b/gi,
                    new RegExp(`${model.toLowerCase()}\\s+(s|r|rs|rr|rt|premium|pro|plus|sport|touring|adventure)\\b`, 'gi'),
                    new RegExp(`${brand.toLowerCase()}\\s+${model.toLowerCase()}\\s+(\\w+)\\b`, 'gi')
                ];

                variantPatterns.forEach(pattern => {
                    const matches = searchText.match(pattern) || [];
                    matches.forEach(match => {
                        if (match.length > 1 && match.length < 20) {
                            potentialVariants.add(match.trim());
                        }
                    });
                });

            } catch (error) {
                console.log(`   ⚠️ Search failed for: ${query}`);
            }
        }

        return Array.from(potentialVariants);
    }

    async analyzeTopBrands(brandLimit = 5, modelLimit = 3) {
        console.log('🏍️ Analyzing top brands for missing variants...');
        
        const topBrands = this.getTopBrandsForAnalysis(brandLimit);
        const missingVariants = [];

        for (const { brand, count } of topBrands) {
            console.log(`\n🔍 Analyzing ${brand} (${count} motorcycles):`);
            
            // Get models for this brand with single variants (most likely to have missing variants)
            const brandModels = Array.from(this.motorcycleMap.entries())
                .filter(([key, data]) => data.make === brand && data.variants.length === 1)
                .slice(0, modelLimit); // Limit for testing

            for (const [key, modelData] of brandModels) {
                console.log(`   📋 ${modelData.year} ${modelData.model} (current variants: ${modelData.variants.join(', ')})`);
                
                const potentialVariants = await this.searchForMissingVariants(
                    modelData.make, 
                    modelData.model, 
                    modelData.year
                );

                if (potentialVariants.length > 0) {
                    console.log(`      💡 Found potential variants: ${potentialVariants.join(', ')}`);
                    
                    missingVariants.push({
                        make: modelData.make,
                        model: modelData.model,
                        year: modelData.year,
                        currentVariants: modelData.variants,
                        potentialVariants: potentialVariants,
                        category: modelData.category,
                        engine: modelData.engine
                    });
                }
            }
        }

        return missingVariants;
    }

    async generateMissingVariantsCsv(missingVariants) {
        console.log('📝 Generating missing variants CSV...');
        
        const csvHeaders = 'Year,Make,Model,Package,Category,Engine,Source\n';
        let csvContent = csvHeaders;

        missingVariants.forEach(missing => {
            missing.potentialVariants.forEach(variant => {
                // Skip if variant already exists
                if (!missing.currentVariants.includes(variant)) {
                    csvContent += `${missing.year},${missing.make},${missing.model},${variant},${missing.category},${missing.engine},VARIANT_ANALYSIS\n`;
                }
            });
        });

        fs.writeFileSync(this.missingVariantsFile, csvContent);
        console.log(`✅ Generated missing variants CSV: ${this.missingVariantsFile}`);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    async saveAnalysis(missingVariants) {
        const analysisData = {
            ...this.analysis,
            analyzedAt: new Date().toISOString(),
            topBrands: this.getTopBrandsForAnalysis(20),
            missingVariantsFound: missingVariants.length,
            missingVariants: missingVariants
        };

        fs.writeFileSync(this.analysisFile, JSON.stringify(analysisData, null, 2));
        console.log(`✅ Analysis saved: ${this.analysisFile}`);
    }

    async run() {
        console.log('🚀 Motorcycle Variant Analyzer v1.0\n');
        
        try {
            // Load and analyze current database
            await this.loadMotorcycles();
            this.analyzeCurrentDatabase();
            
            // Search for missing variants
            const missingVariants = await this.analyzeTopBrands(3, 2); // Start small for testing
            
            // Generate outputs
            await this.generateMissingVariantsCsv(missingVariants);
            await this.saveAnalysis(missingVariants);
            
            console.log('\n🎉 Variant analysis complete!');
            console.log(`📊 Found ${missingVariants.length} models with potential missing variants`);
            
        } catch (error) {
            console.error('❌ Error during analysis:', error.message);
            throw error;
        }
    }
}

// Run the analyzer
const analyzer = new MotorcycleVariantAnalyzer();
analyzer.run().catch(console.error);
