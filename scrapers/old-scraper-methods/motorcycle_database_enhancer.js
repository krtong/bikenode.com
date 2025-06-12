#!/usr/bin/env node

import { Stagehand } from "@browserbasehq/stagehand";
import fs from 'fs';
import path from 'path';

class MotorcycleDatabaseEnhancer {
    constructor() {
        this.stagehand = new Stagehand({
            env: "LOCAL",
            enableCaching: false,
            debugDom: true
        });
        this.existingData = new Map();
        this.newMotorcycles = [];
        this.progress = {
            sitesChecked: 0,
            newModelsFound: 0,
            errors: []
        };
    }

    async initialize() {
        await this.stagehand.init();
        await this.loadExistingDatabase();
        console.log('🏍️ Motorcycle database enhancer initialized');
        console.log(`📊 Current database: ${this.existingData.size} unique motorcycles`);
    }

    async loadExistingDatabase() {
        const csvPath = '/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycles_updated.csv';
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.split('\n');
        
        // Skip header line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const [year, make, model, packageVar, category, engine] = line.split(',');
                const key = `${year}_${make}_${model}_${packageVar || ''}`.toLowerCase();
                this.existingData.set(key, {
                    year: year,
                    make: make,
                    model: model,
                    package: packageVar,
                    category: category,
                    engine: engine
                });
            }
        }
        console.log(`✅ Loaded ${this.existingData.size} existing motorcycles`);
    }

    async enhanceDatabase() {
        console.log('\n🚀 Starting database enhancement from real motorcycle sources...');

        // Real motorcycle manufacturer websites and databases
        const realSources = [
            {
                name: 'Honda USA',
                url: 'https://powersports.honda.com/motorcycles',
                make: 'Honda',
                method: 'scrapeHondaUSA'
            },
            {
                name: 'Yamaha USA', 
                url: 'https://www.yamahamotorsports.com/motorcycles',
                make: 'Yamaha',
                method: 'scrapeYamahaUSA'
            },
            {
                name: 'Kawasaki USA',
                url: 'https://www.kawasaki.com/en-us/motorcycle',
                make: 'Kawasaki', 
                method: 'scrapeKawasakiUSA'
            },
            {
                name: 'Suzuki USA',
                url: 'https://suzukicycles.com',
                make: 'Suzuki',
                method: 'scrapeSuzukiUSA'
            }
        ];

        for (const source of realSources) {
            try {
                console.log(`\n🎯 Checking ${source.name} for missing models...`);
                await this[source.method](source);
                this.progress.sitesChecked++;
                
            } catch (error) {
                console.error(`❌ ${source.name} failed:`, error.message);
                this.progress.errors.push({
                    source: source.name,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }

        return this.newMotorcycles;
    }

    async scrapeHondaUSA(source) {
        try {
            await this.stagehand.page.goto(source.url);
            await this.stagehand.page.waitForTimeout(3000);

            const motorcycles = await this.stagehand.page.evaluate(() => {
                const results = [];
                
                // Look for motorcycle model links, cards, or listings
                const selectors = [
                    'a[href*="motorcycle"]',
                    '.motorcycle-card',
                    '.model-card', 
                    '.product-card',
                    '[data-model]',
                    '.bike-item'
                ];
                
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    
                    elements.forEach(element => {
                        const text = element.textContent?.trim() || '';
                        const href = element.href || '';
                        
                        // Extract model names from text
                        const modelMatches = text.match(/([A-Z][A-Za-z0-9\-]+(?:\s+[A-Za-z0-9\-]+)*)/g);
                        
                        if (modelMatches) {
                            modelMatches.forEach(model => {
                                // Filter out common non-model words
                                const skipWords = ['Honda', 'Motorcycle', 'Bike', 'View', 'More', 'Info', 'Details', 'Learn'];
                                if (!skipWords.some(word => model.includes(word)) && model.length > 2) {
                                    results.push({
                                        model: model.trim(),
                                        url: href,
                                        text: text
                                    });
                                }
                            });
                        }
                    });
                }
                
                return results;
            });

            this.processScrapedModels(motorcycles, source.make, 2024);
            
        } catch (error) {
            console.error(`Honda USA scraping failed: ${error.message}`);
        }
    }

    async scrapeYamahaUSA(source) {
        try {
            await this.stagehand.page.goto(source.url);
            await this.stagehand.page.waitForTimeout(3000);

            const motorcycles = await this.stagehand.page.evaluate(() => {
                const results = [];
                
                // Yamaha-specific selectors
                const elements = document.querySelectorAll('.product-tile, .bike-card, .model-link, a[href*="motorcycle"]');
                
                elements.forEach(element => {
                    const text = element.textContent?.trim() || '';
                    const href = element.href || '';
                    
                    // Look for Yamaha model naming patterns (MT, YZF, etc.)
                    const yamahaModels = text.match(/(MT-\d+|YZF-R\d+|YZ\d+|WR\d+|XT\d+|FZ\d+|Tenere|Bolt|Star|V-Star|Viking|Venture)/gi);
                    
                    if (yamahaModels) {
                        yamahaModels.forEach(model => {
                            results.push({
                                model: model.trim(),
                                url: href,
                                text: text
                            });
                        });
                    }
                });
                
                return results;
            });

            this.processScrapedModels(motorcycles, source.make, 2024);
            
        } catch (error) {
            console.error(`Yamaha USA scraping failed: ${error.message}`);
        }
    }

    async scrapeKawasakiUSA(source) {
        try {
            await this.stagehand.page.goto(source.url);
            await this.stagehand.page.waitForTimeout(3000);

            const motorcycles = await this.stagehand.page.evaluate(() => {
                const results = [];
                
                const elements = document.querySelectorAll('.product-card, .bike-item, a[href*="ninja"], a[href*="versys"], a[href*="vulcan"]');
                
                elements.forEach(element => {
                    const text = element.textContent?.trim() || '';
                    const href = element.href || '';
                    
                    // Kawasaki model patterns
                    const kawasakiModels = text.match(/(Ninja|Versys|Vulcan|Z\d+|KLX|KX|Eliminator|Concours)/gi);
                    
                    if (kawasakiModels) {
                        kawasakiModels.forEach(model => {
                            results.push({
                                model: model.trim(),
                                url: href,
                                text: text
                            });
                        });
                    }
                });
                
                return results;
            });

            this.processScrapedModels(motorcycles, source.make, 2024);
            
        } catch (error) {
            console.error(`Kawasaki USA scraping failed: ${error.message}`);
        }
    }

    async scrapeSuzukiUSA(source) {
        try {
            await this.stagehand.page.goto(source.url);
            await this.stagehand.page.waitForTimeout(3000);

            const motorcycles = await this.stagehand.page.evaluate(() => {
                const results = [];
                
                const elements = document.querySelectorAll('.model-card, .product-item, a[href*="gsx"], a[href*="v-strom"]');
                
                elements.forEach(element => {
                    const text = element.textContent?.trim() || '';
                    const href = element.href || '';
                    
                    // Suzuki model patterns
                    const suzukiModels = text.match(/(GSX-R|GSX-S|V-Strom|Hayabusa|Katana|Boulevard|DR|RM|LT)/gi);
                    
                    if (suzukiModels) {
                        suzukiModels.forEach(model => {
                            results.push({
                                model: model.trim(),
                                url: href,
                                text: text
                            });
                        });
                    }
                });
                
                return results;
            });

            this.processScrapedModels(motorcycles, source.make, 2024);
            
        } catch (error) {
            console.error(`Suzuki USA scraping failed: ${error.message}`);
        }
    }

    processScrapedModels(scrapedData, make, year) {
        scrapedData.forEach(item => {
            const model = item.model;
            const packageVar = this.extractPackageVariant(item.text, model);
            const category = this.guessCategory(model);
            
            // Check if this exact combination exists
            const key = `${year}_${make}_${model}_${packageVar || ''}`.toLowerCase();
            
            if (!this.existingData.has(key)) {
                const newMotorcycle = {
                    year: year,
                    make: make,
                    model: model,
                    package: packageVar || '',
                    category: category,
                    engine: '', // To be filled later
                    source: 'scraped_real',
                    url: item.url
                };
                
                this.newMotorcycles.push(newMotorcycle);
                this.progress.newModelsFound++;
                
                console.log(`🆕 Found new: ${year} ${make} ${model} ${packageVar || ''}`);
            }
        });
    }

    extractPackageVariant(text, model) {
        // Look for common package/variant indicators
        const variants = text.match(/(ABS|DCT|ES|SE|LE|Limited|Special|Edition|Plus|Pro|Base|Standard|Deluxe|Premium|Sport|Touring)/gi);
        return variants ? variants[0] : '';
    }

    guessCategory(model) {
        const modelLower = model.toLowerCase();
        
        if (modelLower.includes('sport') || modelLower.includes('cbr') || 
            modelLower.includes('yzf-r') || modelLower.includes('ninja') || 
            modelLower.includes('gsx-r')) {
            return 'Sport';
        }
        
        if (modelLower.includes('adventure') || modelLower.includes('africa') || 
            modelLower.includes('tenere') || modelLower.includes('versys') || 
            modelLower.includes('v-strom')) {
            return 'Enduro/offroad';
        }
        
        if (modelLower.includes('cruiser') || modelLower.includes('vulcan') || 
            modelLower.includes('boulevard') || modelLower.includes('v-star')) {
            return 'Cruiser';
        }
        
        if (modelLower.includes('naked') || modelLower.includes('mt-') || 
            modelLower.includes('z') || modelLower.includes('gsx-s')) {
            return 'Naked bike';
        }
        
        return 'Allround';
    }

    async saveEnhancements() {
        if (this.newMotorcycles.length === 0) {
            console.log('\n✅ No new motorcycles found to add');
            return;
        }

        // Create enhancement report
        const enhancementPath = path.join(process.cwd(), `motorcycle_enhancements_${new Date().toISOString().split('T')[0]}.csv`);
        
        const csvContent = this.createEnhancementCSV(this.newMotorcycles);
        
        try {
            fs.writeFileSync(enhancementPath, csvContent);
            
            console.log(`\n💾 Enhancement results saved:`);
            console.log(`📊 New motorcycles CSV: ${enhancementPath}`);
            console.log(`🆕 New motorcycles found: ${this.newMotorcycles.length}`);
            console.log(`🌐 Sites checked: ${this.progress.sitesChecked}`);
            
            // Show summary by manufacturer
            const summary = {};
            this.newMotorcycles.forEach(bike => {
                summary[bike.make] = (summary[bike.make] || 0) + 1;
            });
            
            console.log('\n📈 NEW MOTORCYCLES BY MANUFACTURER:');
            console.log('=====================================');
            
            Object.entries(summary)
                .sort(([,a], [,b]) => b - a)
                .forEach(([make, count]) => {
                    console.log(`${make.padEnd(15)} ${count} new models`);
                });
            
        } catch (error) {
            console.error('Error saving enhancements:', error.message);
        }
    }

    createEnhancementCSV(motorcycles) {
        const headers = ['Year', 'Make', 'Model', 'Package', 'Category', 'Engine'];
        const rows = motorcycles.map(bike => [
            bike.year,
            bike.make,
            bike.model,
            bike.package,
            bike.category,
            bike.engine
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(cell => `${cell}`).join(','))
            .join('\n');
    }

    async close() {
        await this.stagehand.close();
        console.log('\n🔒 Database enhancer closed');
    }
}

// Main execution
async function main() {
    const enhancer = new MotorcycleDatabaseEnhancer();
    
    try {
        await enhancer.initialize();
        await enhancer.enhanceDatabase();
        await enhancer.saveEnhancements();
        
    } catch (error) {
        console.error('Main error:', error);
    } finally {
        await enhancer.close();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default MotorcycleDatabaseEnhancer;