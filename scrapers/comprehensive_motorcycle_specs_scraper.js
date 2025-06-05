#!/usr/bin/env node

import { Stagehand } from "@browserbasehq/stagehand";
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

// Comprehensive motorcycle spec sites to try
const SPEC_SITES = [
    {
        name: 'Total Motorcycle',
        baseUrl: 'https://www.totalmotorcycle.com',
        searchPattern: '/motorcycles/{year}-{make}-{model}',
        priority: 1
    },
    {
        name: 'Motorcycle Specs',
        baseUrl: 'https://www.motorcycle-specs.co.za',
        searchPattern: '/model/{make}/{model}/{year}',
        priority: 2
    },
    {
        name: 'Bikez',
        baseUrl: 'https://www.bikez.com',
        searchPattern: '/motorcycles/{make}_{model}_{year}.php',
        priority: 3
    },
    {
        name: 'Cycle Chaos',
        baseUrl: 'https://www.cyclechaos.com',
        searchPattern: '/wiki/{year}_{Make}_{Model}',
        priority: 4
    },
    {
        name: 'Motorcycle USA',
        baseUrl: 'https://www.motorcycle-usa.com',
        searchPattern: '/motorcycles/{year}/{make}/{model}',
        priority: 5
    }
];

class ComprehensiveMotorcycleSpecsScraper {
    constructor() {
        this.stagehand = new Stagehand({
            env: "LOCAL",
            enableCaching: false,
            debugDom: true
        });
        this.motorcycles = [];
        this.scrapedSpecs = [];
        this.progress = {
            total: 0,
            processed: 0,
            successful: 0,
            failed: 0,
            errors: []
        };
    }

    async initialize() {
        await this.stagehand.init();
        console.log('🏍️ Comprehensive motorcycle specs scraper initialized');
    }

    async loadMotorcycleDatabase(csvPath = 'motorcycles_comprehensive.csv') {
        console.log(`📖 Loading motorcycle database from ${csvPath}...`);
        
        return new Promise((resolve, reject) => {
            const motorcycles = [];
            
            if (!fs.existsSync(csvPath)) {
                console.error(`❌ File not found: ${csvPath}`);
                reject(new Error(`File not found: ${csvPath}`));
                return;
            }
            
            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    // Clean and validate data
                    const motorcycle = {
                        year: parseInt(row.year),
                        make: row.make?.trim(),
                        model: row.model?.trim(),
                        category: row.category?.trim(),
                        engine: row.engine?.trim() || null,
                        displacement: row.displacement?.trim() || null,
                        source: row.source?.trim()
                    };
                    
                    // Only include valid entries
                    if (motorcycle.year && motorcycle.make && motorcycle.model) {
                        motorcycles.push(motorcycle);
                    }
                })
                .on('end', () => {
                    console.log(`✅ Loaded ${motorcycles.length} motorcycles from database`);
                    this.motorcycles = motorcycles;
                    this.progress.total = motorcycles.length;
                    resolve(motorcycles);
                })
                .on('error', (error) => {
                    reject(error);
                });
        });
    }

    async scrapeAllSpecs(limitToCount = null) {
        console.log('\n🚀 Starting comprehensive specs scraping...');
        
        // Limit for testing if specified
        const motorcyclesToScrape = limitToCount ? 
            this.motorcycles.slice(0, limitToCount) : 
            this.motorcycles;
        
        console.log(`🎯 Target: ${motorcyclesToScrape.length} motorcycles`);
        
        // Process in batches to avoid overwhelming sites
        const batchSize = 5;
        const batches = this.createBatches(motorcyclesToScrape, batchSize);
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`\n📦 Processing batch ${i + 1}/${batches.length} (${batch.length} motorcycles)...`);
            
            // Process batch in parallel
            const batchPromises = batch.map(motorcycle => 
                this.scrapeMotorcycleSpecs(motorcycle)
            );
            
            const batchResults = await Promise.allSettled(batchPromises);
            
            // Process results
            batchResults.forEach((result, index) => {
                this.progress.processed++;
                
                if (result.status === 'fulfilled' && result.value) {
                    this.progress.successful++;
                    this.scrapedSpecs.push(result.value);
                } else {
                    this.progress.failed++;
                    this.progress.errors.push({
                        motorcycle: batch[index],
                        error: result.reason?.message || 'Unknown error',
                        timestamp: new Date().toISOString()
                    });
                }
            });
            
            // Progress update
            const progressPercent = ((this.progress.processed / motorcyclesToScrape.length) * 100).toFixed(1);
            console.log(`📊 Progress: ${this.progress.processed}/${motorcyclesToScrape.length} (${progressPercent}%) - Success: ${this.progress.successful}, Failed: ${this.progress.failed}`);
            
            // Small delay between batches
            if (i < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        return this.scrapedSpecs;
    }

    async scrapeMotorcycleSpecs(motorcycle) {
        console.log(`\n🔍 Scraping: ${motorcycle.year} ${motorcycle.make} ${motorcycle.model}`);
        
        // Try each spec site in priority order
        for (const site of SPEC_SITES) {
            try {
                console.log(`  🎯 Trying ${site.name}...`);
                
                const specs = await this.scrapeSpecSite(motorcycle, site);
                if (specs && this.validateSpecs(specs)) {
                    console.log(`  ✅ Success on ${site.name}`);
                    return {
                        ...motorcycle,
                        specs: specs,
                        specSource: site.name,
                        scrapedAt: new Date().toISOString()
                    };
                }
                
            } catch (error) {
                console.log(`  ❌ ${site.name} failed: ${error.message}`);
            }
        }
        
        // No specs found, return with fallback data
        console.log(`  📋 No specs found, using fallback data`);
        return {
            ...motorcycle,
            specs: this.getFallbackSpecs(motorcycle),
            specSource: 'fallback',
            scrapedAt: new Date().toISOString()
        };
    }

    async scrapeSpecSite(motorcycle, site) {
        try {
            // Build URL using site pattern
            const url = this.buildSpecUrl(motorcycle, site);
            console.log(`    📍 URL: ${url}`);
            
            await this.stagehand.page.goto(url, { 
                waitUntil: 'networkidle', 
                timeout: 15000 
            });
            
            // Extract specs using generic patterns
            const specs = await this.stagehand.page.evaluate(() => {
                const specData = {
                    engine: null,
                    displacement: null,
                    power: null,
                    torque: null,
                    weight: null,
                    topSpeed: null,
                    fuelCapacity: null,
                    seatHeight: null,
                    wheelbase: null,
                    compression: null,
                    bore: null,
                    stroke: null,
                    cooling: null,
                    transmission: null
                };

                const text = document.body.innerText.toLowerCase();
                const lines = text.split('\n');

                // Pattern matching for common specifications
                lines.forEach(line => {
                    // Engine type
                    if (line.includes('engine type') || line.includes('engine:')) {
                        const engineMatch = line.match(/(?:engine type|engine:)\s*(.+?)(?:\n|$)/);
                        if (engineMatch) specData.engine = engineMatch[1].trim();
                    }

                    // Displacement
                    const ccMatch = line.match(/(\d+)\s*cc/);
                    if (ccMatch && !specData.displacement) {
                        specData.displacement = ccMatch[1] + 'cc';
                    }

                    // Power
                    const powerMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:hp|bhp|kw)/);
                    if (powerMatch && !specData.power) {
                        specData.power = powerMatch[0];
                    }

                    // Torque
                    const torqueMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:lb-ft|nm|n·m)/);
                    if (torqueMatch && !specData.torque) {
                        specData.torque = torqueMatch[0];
                    }

                    // Weight
                    const weightMatch = line.match(/(\d+)\s*(?:lb|lbs|kg)/);
                    if (weightMatch && (line.includes('weight') || line.includes('mass')) && !specData.weight) {
                        specData.weight = weightMatch[0];
                    }

                    // Top speed
                    const speedMatch = line.match(/(\d+)\s*mph/);
                    if (speedMatch && (line.includes('top speed') || line.includes('max speed')) && !specData.topSpeed) {
                        specData.topSpeed = speedMatch[1] + ' mph';
                    }

                    // Fuel capacity
                    const fuelMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:gallon|gal|liter|l)/);
                    if (fuelMatch && line.includes('fuel') && !specData.fuelCapacity) {
                        specData.fuelCapacity = fuelMatch[0];
                    }

                    // Seat height
                    const seatMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:in|inches|mm)/);
                    if (seatMatch && line.includes('seat height') && !specData.seatHeight) {
                        specData.seatHeight = seatMatch[0];
                    }

                    // Wheelbase
                    const wheelbaseMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:in|inches|mm)/);
                    if (wheelbaseMatch && line.includes('wheelbase') && !specData.wheelbase) {
                        specData.wheelbase = wheelbaseMatch[0];
                    }

                    // Compression ratio
                    const compressionMatch = line.match(/(\d+(?:\.\d+)?):1/);
                    if (compressionMatch && line.includes('compression') && !specData.compression) {
                        specData.compression = compressionMatch[0];
                    }

                    // Bore and stroke
                    const boreStrokeMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)\s*mm/);
                    if (boreStrokeMatch && (line.includes('bore') || line.includes('stroke'))) {
                        if (!specData.bore) specData.bore = boreStrokeMatch[1] + 'mm';
                        if (!specData.stroke) specData.stroke = boreStrokeMatch[2] + 'mm';
                    }

                    // Cooling
                    if (line.includes('liquid cool') || line.includes('water cool')) {
                        specData.cooling = 'Liquid-cooled';
                    } else if (line.includes('air cool')) {
                        specData.cooling = 'Air-cooled';
                    }

                    // Transmission
                    const transMatch = line.match(/(\d+)\s*speed/);
                    if (transMatch && (line.includes('transmission') || line.includes('gearbox'))) {
                        specData.transmission = transMatch[1] + '-speed';
                    }
                });

                return specData;
            });

            return specs;

        } catch (error) {
            throw new Error(`Site scraping failed: ${error.message}`);
        }
    }

    buildSpecUrl(motorcycle, site) {
        let url = site.baseUrl + site.searchPattern;
        
        // Replace placeholders
        url = url.replace('{year}', motorcycle.year);
        url = url.replace('{make}', encodeURIComponent(motorcycle.make.toLowerCase()));
        url = url.replace('{Make}', encodeURIComponent(motorcycle.make));
        url = url.replace('{model}', encodeURIComponent(motorcycle.model.toLowerCase().replace(/\s+/g, '-')));
        url = url.replace('{Model}', encodeURIComponent(motorcycle.model.replace(/\s+/g, '_')));
        
        return url;
    }

    validateSpecs(specs) {
        // Check if we got meaningful data
        const hasValidSpecs = Object.values(specs).some(value => 
            value !== null && value !== undefined && value !== ''
        );
        
        return hasValidSpecs;
    }

    getFallbackSpecs(motorcycle) {
        // Basic fallback specs based on category and displacement patterns
        const fallbackSpecs = {
            engine: null,
            displacement: null,
            power: null,
            torque: null,
            weight: null,
            category: motorcycle.category
        };

        // Guess displacement from model name
        const modelLower = motorcycle.model.toLowerCase();
        const ccMatches = modelLower.match(/(\d+)(?:cc)?/);
        if (ccMatches) {
            const cc = parseInt(ccMatches[1]);
            if (cc > 50 && cc < 2500) {
                fallbackSpecs.displacement = cc + 'cc';
                
                // Estimate power based on displacement and category
                if (motorcycle.category === 'Sport') {
                    fallbackSpecs.power = Math.round(cc * 0.15) + ' hp';
                } else if (motorcycle.category === 'Cruiser') {
                    fallbackSpecs.power = Math.round(cc * 0.08) + ' hp';
                } else {
                    fallbackSpecs.power = Math.round(cc * 0.12) + ' hp';
                }
            }
        }

        return fallbackSpecs;
    }

    createBatches(array, batchSize) {
        const batches = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }

    async saveResults() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Save comprehensive specs data
        const specsPath = path.join(process.cwd(), `motorcycle_specs_comprehensive_${timestamp.split('T')[0]}.json`);
        const csvPath = path.join(process.cwd(), `motorcycle_specs_comprehensive_${timestamp.split('T')[0]}.csv`);
        
        try {
            // Save JSON
            fs.writeFileSync(specsPath, JSON.stringify(this.scrapedSpecs, null, 2));
            
            // Save CSV
            const csvContent = this.createSpecsCSV(this.scrapedSpecs);
            fs.writeFileSync(csvPath, csvContent);
            
            // Save progress report
            const reportPath = path.join(process.cwd(), `scraping_report_${timestamp.split('T')[0]}.json`);
            fs.writeFileSync(reportPath, JSON.stringify(this.progress, null, 2));
            
            console.log(`\n💾 Results saved:`);
            console.log(`📊 Specs JSON: ${specsPath}`);
            console.log(`📈 Specs CSV: ${csvPath}`);
            console.log(`📋 Report: ${reportPath}`);
            
            // Display summary
            this.displaySummary();
            
        } catch (error) {
            console.error('Error saving results:', error.message);
        }
    }

    createSpecsCSV(specs) {
        const headers = [
            'year', 'make', 'model', 'category', 'engine', 'displacement', 
            'power', 'torque', 'weight', 'topSpeed', 'fuelCapacity', 
            'seatHeight', 'wheelbase', 'compression', 'bore', 'stroke', 
            'cooling', 'transmission', 'specSource', 'scrapedAt'
        ];
        
        const rows = specs.map(bike => [
            bike.year,
            bike.make,
            bike.model,
            bike.category,
            bike.specs?.engine || '',
            bike.specs?.displacement || '',
            bike.specs?.power || '',
            bike.specs?.torque || '',
            bike.specs?.weight || '',
            bike.specs?.topSpeed || '',
            bike.specs?.fuelCapacity || '',
            bike.specs?.seatHeight || '',
            bike.specs?.wheelbase || '',
            bike.specs?.compression || '',
            bike.specs?.bore || '',
            bike.specs?.stroke || '',
            bike.specs?.cooling || '',
            bike.specs?.transmission || '',
            bike.specSource,
            bike.scrapedAt
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    displaySummary() {
        console.log('\n📊 SCRAPING SUMMARY:');
        console.log('===================');
        console.log(`Total processed: ${this.progress.processed}`);
        console.log(`Successful: ${this.progress.successful}`);
        console.log(`Failed: ${this.progress.failed}`);
        console.log(`Success rate: ${((this.progress.successful / this.progress.processed) * 100).toFixed(1)}%`);
        
        // Group by source
        const sourceCounts = {};
        this.scrapedSpecs.forEach(bike => {
            sourceCounts[bike.specSource] = (sourceCounts[bike.specSource] || 0) + 1;
        });
        
        console.log('\n📋 SPECS BY SOURCE:');
        Object.entries(sourceCounts)
            .sort(([,a], [,b]) => b - a)
            .forEach(([source, count]) => {
                console.log(`${source.padEnd(20)} ${count} motorcycles`);
            });
    }

    async close() {
        await this.stagehand.close();
        console.log('\n🔒 Scraper closed');
    }
}

// Main execution
async function main() {
    const scraper = new ComprehensiveMotorcycleSpecsScraper();
    
    try {
        await scraper.initialize();
        
        // First check if we have the motorcycle database
        const csvPath = process.argv[2] || 'motorcycles_comprehensive.csv';
        await scraper.loadMotorcycleDatabase(csvPath);
        
        // For testing, limit to a smaller number
        const testLimit = process.argv[3] ? parseInt(process.argv[3]) : 50;
        console.log(`🧪 Test mode: scraping ${testLimit} motorcycles`);
        
        await scraper.scrapeAllSpecs(testLimit);
        await scraper.saveResults();
        
    } catch (error) {
        console.error('Main error:', error);
    } finally {
        await scraper.close();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default ComprehensiveMotorcycleSpecsScraper;