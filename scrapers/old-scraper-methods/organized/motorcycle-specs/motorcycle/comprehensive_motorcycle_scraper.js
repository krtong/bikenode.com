#!/usr/bin/env node

import { Stagehand } from "@browserbasehq/stagehand";
import fs from 'fs';
import path from 'path';

// Major motorcycle manufacturers to scrape
const MOTORCYCLE_MANUFACTURERS = [
    'Aprilia', 'BMW', 'Ducati', 'Harley-Davidson', 'Honda', 'Indian', 
    'Kawasaki', 'KTM', 'MV Agusta', 'Suzuki', 'Triumph', 'Yamaha',
    'Zero', 'Energica', 'LiveWire', 'Can-Am', 'Husqvarna', 'GasGas',
    'Beta', 'Sherco', 'TM Racing', 'Husaberg', 'Benelli', 'CFMoto',
    'Royal Enfield', 'Moto Guzzi', 'Vespa', 'Piaggio'
];

// Year range to scrape (current focus on recent years)
const YEAR_RANGE = {
    start: 2015,
    end: 2025
};

class ComprehensiveMotorcycleScraper {
    constructor() {
        this.stagehand = new Stagehand({
            env: "LOCAL",
            enableCaching: false,
            debugDom: true
        });
        this.motorcycles = [];
        this.progress = {
            manufacturers: 0,
            totalModels: 0,
            errors: []
        };
    }

    async initialize() {
        await this.stagehand.init();
        console.log('🏍️ Comprehensive motorcycle scraper initialized');
        console.log(`📊 Target: ${MOTORCYCLE_MANUFACTURERS.length} manufacturers, ${YEAR_RANGE.end - YEAR_RANGE.start + 1} years`);
    }

    async scrapeMotorcycleDatabase() {
        console.log('\n🚀 Starting comprehensive motorcycle database scraping...');

        // Try multiple motorcycle database sites
        const sites = [
            {
                name: 'Motorcycle-USA',
                url: 'https://www.motorcycle-usa.com',
                method: 'scrapeMotorcycleUSA'
            },
            {
                name: 'Bikez.com',
                url: 'https://www.bikez.com',
                method: 'scrapeBikez'
            },
            {
                name: 'CycleNews',
                url: 'https://www.cyclenews.com',
                method: 'scrapeCycleNews'
            }
        ];

        for (const site of sites) {
            try {
                console.log(`\n🎯 Trying ${site.name}...`);
                const results = await this[site.method]();
                if (results && results.length > 0) {
                    console.log(`✅ ${site.name}: Found ${results.length} motorcycles`);
                    this.motorcycles.push(...results);
                    break; // Use first successful site
                }
            } catch (error) {
                console.error(`❌ ${site.name} failed:`, error.message);
                this.progress.errors.push({
                    site: site.name,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // If no sites work, generate comprehensive list manually
        if (this.motorcycles.length === 0) {
            console.log('\n📋 Generating comprehensive motorcycle list manually...');
            this.motorcycles = this.generateComprehensiveList();
        }

        return this.motorcycles;
    }

    async scrapeMotorcycleUSA() {
        try {
            await this.stagehand.page.goto('https://www.motorcycle-usa.com/motorcycles');
            await this.stagehand.page.waitForTimeout(3000);

            // Look for motorcycle listings
            const motorcycles = await this.stagehand.page.evaluate(() => {
                const results = [];
                
                // Try to find motorcycle links/data
                const links = document.querySelectorAll('a[href*="motorcycle"], .motorcycle-item, .bike-listing');
                
                links.forEach(link => {
                    const text = link.textContent.trim();
                    const href = link.href;
                    
                    // Extract year, make, model from text/URL
                    const yearMatch = text.match(/20\d{2}/);
                    const year = yearMatch ? parseInt(yearMatch[0]) : null;
                    
                    if (year && year >= 2015 && year <= 2025) {
                        results.push({
                            text: text,
                            url: href,
                            year: year,
                            source: 'motorcycle-usa'
                        });
                    }
                });

                return results;
            });

            return this.parseMotorcycleData(motorcycles);

        } catch (error) {
            console.error('Motorcycle-USA scraping failed:', error.message);
            return [];
        }
    }

    async scrapeBikez() {
        try {
            await this.stagehand.page.goto('https://www.bikez.com');
            await this.stagehand.page.waitForTimeout(3000);

            // Look for manufacturer links
            const manufacturers = await this.stagehand.page.evaluate(() => {
                const results = [];
                const links = document.querySelectorAll('a[href*="make"], a[href*="manufacturer"]');
                
                links.forEach(link => {
                    const text = link.textContent.trim();
                    const href = link.href;
                    
                    if (text && href) {
                        results.push({
                            make: text,
                            url: href,
                            source: 'bikez'
                        });
                    }
                });

                return results;
            });

            // For each manufacturer, try to get models
            const allMotorcycles = [];
            for (const manufacturer of manufacturers.slice(0, 5)) { // Limit for testing
                try {
                    await this.stagehand.page.goto(manufacturer.url);
                    await this.stagehand.page.waitForTimeout(2000);

                    const models = await this.stagehand.page.evaluate((make) => {
                        const results = [];
                        const modelLinks = document.querySelectorAll('a[href*="model"], .model-link');
                        
                        modelLinks.forEach(link => {
                            const text = link.textContent.trim();
                            const href = link.href;
                            
                            // Extract year from text or URL
                            const yearMatch = text.match(/20\d{2}/);
                            const year = yearMatch ? parseInt(yearMatch[0]) : 2024;
                            
                            if (text && href) {
                                results.push({
                                    make: make,
                                    model: text,
                                    year: year,
                                    url: href,
                                    source: 'bikez'
                                });
                            }
                        });

                        return results;
                    }, manufacturer.make);

                    allMotorcycles.push(...models);
                } catch (error) {
                    console.error(`Error scraping ${manufacturer.make}:`, error.message);
                }
            }

            return allMotorcycles;

        } catch (error) {
            console.error('Bikez scraping failed:', error.message);
            return [];
        }
    }

    async scrapeCycleNews() {
        try {
            await this.stagehand.page.goto('https://www.cyclenews.com/motorcycles');
            await this.stagehand.page.waitForTimeout(3000);

            const motorcycles = await this.stagehand.page.evaluate(() => {
                const results = [];
                const articles = document.querySelectorAll('article, .motorcycle-article, [data-motorcycle]');
                
                articles.forEach(article => {
                    const titleElement = article.querySelector('h1, h2, h3, .title');
                    const linkElement = article.querySelector('a');
                    
                    if (titleElement && linkElement) {
                        const title = titleElement.textContent.trim();
                        const url = linkElement.href;
                        
                        // Extract year, make, model from title
                        const yearMatch = title.match(/20\d{2}/);
                        const year = yearMatch ? parseInt(yearMatch[0]) : 2024;
                        
                        results.push({
                            title: title,
                            url: url,
                            year: year,
                            source: 'cyclenews'
                        });
                    }
                });

                return results;
            });

            return this.parseMotorcycleData(motorcycles);

        } catch (error) {
            console.error('CycleNews scraping failed:', error.message);
            return [];
        }
    }

    parseMotorcycleData(rawData) {
        const motorcycles = [];
        
        rawData.forEach(item => {
            try {
                // Extract make, model, year from text
                const text = item.title || item.text || '';
                
                // Common motorcycle name patterns
                const patterns = [
                    /(\d{4})\s+([A-Za-z]+)\s+([A-Za-z0-9\-\s]+)/,  // "2024 Honda CBR600RR"
                    /([A-Za-z]+)\s+([A-Za-z0-9\-\s]+)\s+(\d{4})/,  // "Honda CBR600RR 2024"
                    /([A-Za-z]+)\s+([A-Za-z0-9\-\s]+)/             // "Honda CBR600RR"
                ];

                for (const pattern of patterns) {
                    const match = text.match(pattern);
                    if (match) {
                        let year, make, model;
                        
                        if (match[1].match(/\d{4}/)) {
                            // Pattern 1: year first
                            year = parseInt(match[1]);
                            make = match[2];
                            model = match[3];
                        } else if (match[3] && match[3].match(/\d{4}/)) {
                            // Pattern 2: year last
                            make = match[1];
                            model = match[2];
                            year = parseInt(match[3]);
                        } else {
                            // Pattern 3: no year in text, use item year or default
                            make = match[1];
                            model = match[2];
                            year = item.year || 2024;
                        }

                        // Validate and clean data
                        if (make && model && year >= YEAR_RANGE.start && year <= YEAR_RANGE.end) {
                            motorcycles.push({
                                year: year,
                                make: make.trim(),
                                model: model.trim(),
                                category: this.guessCategory(make, model),
                                engine: null, // To be filled by specs scraper
                                displacement: null,
                                url: item.url,
                                source: item.source
                            });
                        }
                        break;
                    }
                }
            } catch (error) {
                console.error('Error parsing motorcycle data:', error.message);
            }
        });

        return motorcycles;
    }

    generateComprehensiveList() {
        console.log('📝 Generating comprehensive motorcycle list from known data...');
        
        const motorcycles = [];
        
        // Popular models for each manufacturer
        const manufacturerModels = {
            'Honda': [
                'CBR600RR', 'CBR1000RR', 'CBR650R', 'CBR500R', 'CBR300R',
                'CB650R', 'CB500F', 'CB300R', 'CRF450L', 'CRF300L',
                'Africa Twin', 'Gold Wing', 'Rebel 300', 'Rebel 500', 'Rebel 1100',
                'Grom', 'Monkey', 'Trail 125', 'PCX150', 'Forza 350'
            ],
            'Yamaha': [
                'YZF-R1', 'YZF-R6', 'YZF-R7', 'YZF-R3', 'YZF-R125',
                'MT-09', 'MT-07', 'MT-03', 'MT-10', 'MT-125',
                'Tenere 700', 'Super Tenere', 'WR450F', 'WR250R',
                'V-Star 650', 'V-Star 950', 'Bolt', 'Star Venture',
                'XMAX 300', 'TMAX 560', 'Zuma 125'
            ],
            'Kawasaki': [
                'Ninja ZX-10R', 'Ninja ZX-6R', 'Ninja 650', 'Ninja 400', 'Ninja 300',
                'Z900', 'Z650', 'Z400', 'Z300', 'Z125',
                'Versys 1000', 'Versys 650', 'Versys-X 300',
                'KLX450R', 'KLX300', 'KLX230',
                'Vulcan S', 'Vulcan 900', 'Eliminator',
                'KX450', 'KX250', 'KX85'
            ],
            'Suzuki': [
                'GSX-R1000', 'GSX-R750', 'GSX-R600', 'GSX250R',
                'GSX-S1000', 'GSX-S750', 'GSX-S650',
                'V-Strom 1050', 'V-Strom 650', 'V-Strom 250',
                'DR-Z400S', 'DR650S', 'DR200S',
                'Boulevard M109R', 'Boulevard C50', 'Boulevard S40',
                'Hayabusa', 'Katana', 'SV650'
            ],
            'Ducati': [
                'Panigale V4', 'Panigale V2', 'Panigale 959', 'Panigale 899',
                'Streetfighter V4', 'Streetfighter V2',
                'Monster 1200', 'Monster 821', 'Monster 659',
                'Multistrada V4', 'Multistrada 950', 'Multistrada 1260',
                'Diavel 1260', 'XDiavel',
                'Scrambler Icon', 'Scrambler Desert Sled', 'Scrambler Cafe Racer',
                'Hypermotard 950', 'Hyperstrada'
            ],
            'BMW': [
                'S1000RR', 'S1000R', 'S1000XR',
                'R1250GS', 'R1250GS Adventure', 'F850GS', 'F750GS', 'G310GS',
                'R1250RT', 'K1600GT', 'K1600GTL',
                'R18', 'R nineT', 'R1250R',
                'F900R', 'F900XR', 'G310R',
                'C650GT', 'C400X', 'CE 04'
            ],
            'KTM': [
                '390 Duke', '790 Duke', '890 Duke', '1290 Super Duke',
                'RC 390', 'RC 8C',
                '390 Adventure', '790 Adventure', '890 Adventure', '1290 Super Adventure',
                '450 SX-F', '350 SX-F', '250 SX-F',
                '450 EXC-F', '350 EXC-F', '250 EXC-F',
                'Freeride E-XC'
            ],
            'Aprilia': [
                'RSV4', 'RS 660', 'RS4 125',
                'Tuono V4', 'Tuono 660',
                'Dorsoduro 900', 'Shiver 900',
                'SX 125', 'RX 125',
                'SR GT 125', 'SR GT 200'
            ],
            'Triumph': [
                'Daytona 765', 'Street Triple', 'Speed Triple',
                'Bonneville T120', 'Bonneville T100', 'Scrambler 1200',
                'Tiger 900', 'Tiger 1200', 'Tiger Sport 660',
                'Rocket 3', 'Thunderbird Storm',
                'Street Scrambler', 'Thruxton'
            ],
            'Harley-Davidson': [
                'Sportster S', 'Iron 883', 'Forty-Eight',
                'Street Glide', 'Road Glide', 'Electra Glide',
                'Fat Boy', 'Heritage Classic', 'Road King',
                'Pan America', 'Bronx', 'LiveWire'
            ]
        };

        // Generate entries for each manufacturer, model, and year
        for (const [make, models] of Object.entries(manufacturerModels)) {
            for (const model of models) {
                for (let year = YEAR_RANGE.start; year <= YEAR_RANGE.end; year++) {
                    motorcycles.push({
                        year: year,
                        make: make,
                        model: model,
                        category: this.guessCategory(make, model),
                        engine: null,
                        displacement: null,
                        url: null,
                        source: 'generated'
                    });
                }
            }
        }

        console.log(`✅ Generated ${motorcycles.length} motorcycle entries`);
        return motorcycles;
    }

    guessCategory(make, model) {
        const modelLower = model.toLowerCase();
        
        if (modelLower.includes('sport') || modelLower.includes('cbr') || 
            modelLower.includes('yzf-r') || modelLower.includes('ninja') || 
            modelLower.includes('gsx-r') || modelLower.includes('panigale') ||
            modelLower.includes('rc ') || modelLower.includes('rsv') ||
            modelLower.includes('daytona') || modelLower.includes('r1') ||
            modelLower.includes('r6') || modelLower.includes('1000rr')) {
            return 'Sport';
        }
        
        if (modelLower.includes('adventure') || modelLower.includes('gs') || 
            modelLower.includes('africa') || modelLower.includes('tenere') ||
            modelLower.includes('versys') || modelLower.includes('v-strom') ||
            modelLower.includes('tiger') || modelLower.includes('multistrada') ||
            modelLower.includes('pan america')) {
            return 'Adventure';
        }
        
        if (modelLower.includes('cruiser') || modelLower.includes('vulcan') || 
            modelLower.includes('boulevard') || modelLower.includes('v-star') ||
            modelLower.includes('road') || modelLower.includes('heritage') ||
            modelLower.includes('street glide') || modelLower.includes('fat boy') ||
            modelLower.includes('bonneville') || modelLower.includes('rocket')) {
            return 'Cruiser';
        }
        
        if (modelLower.includes('naked') || modelLower.includes('streetfighter') || 
            modelLower.includes('monster') || modelLower.includes('duke') ||
            modelLower.includes('mt-') || modelLower.includes('z') ||
            modelLower.includes('tuono') || modelLower.includes('street triple')) {
            return 'Naked';
        }
        
        if (modelLower.includes('dirt') || modelLower.includes('mx') || 
            modelLower.includes('sx') || modelLower.includes('exc') ||
            modelLower.includes('crf') || modelLower.includes('wr') ||
            modelLower.includes('klx') || modelLower.includes('dr')) {
            return 'Dirt/Motocross';
        }
        
        if (modelLower.includes('scooter') || modelLower.includes('pcx') || 
            modelLower.includes('forza') || modelLower.includes('xmax') ||
            modelLower.includes('tmax') || modelLower.includes('zuma')) {
            return 'Scooter';
        }
        
        if (modelLower.includes('touring') || modelLower.includes('gold wing') ||
            modelLower.includes('k1600') || modelLower.includes('electra glide')) {
            return 'Touring';
        }
        
        return 'Standard';
    }

    async saveResults() {
        // Remove duplicates
        const uniqueMotorcycles = this.removeDuplicates(this.motorcycles);
        
        // Create CSV content
        const csvContent = this.createCSV(uniqueMotorcycles);
        
        // Save files
        const csvPath = path.join(process.cwd(), 'motorcycles_comprehensive.csv');
        const jsonPath = path.join(process.cwd(), 'motorcycles_comprehensive.json');
        
        try {
            fs.writeFileSync(csvPath, csvContent);
            fs.writeFileSync(jsonPath, JSON.stringify(uniqueMotorcycles, null, 2));
            
            console.log(`\n💾 Results saved:`);
            console.log(`📊 CSV: ${csvPath}`);
            console.log(`📋 JSON: ${jsonPath}`);
            console.log(`🏍️ Total motorcycles: ${uniqueMotorcycles.length}`);
            
            // Show summary by manufacturer
            const summary = this.createSummary(uniqueMotorcycles);
            console.log('\n📈 SUMMARY BY MANUFACTURER:');
            console.log('================================');
            
            Object.entries(summary)
                .sort(([,a], [,b]) => b - a)
                .forEach(([make, count]) => {
                    console.log(`${make.padEnd(20)} ${count} models`);
                });
            
        } catch (error) {
            console.error('Error saving results:', error.message);
        }
    }

    removeDuplicates(motorcycles) {
        const seen = new Set();
        return motorcycles.filter(bike => {
            const key = `${bike.year}_${bike.make}_${bike.model}`.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    createCSV(motorcycles) {
        const headers = ['year', 'make', 'model', 'category', 'engine', 'displacement', 'source'];
        const rows = motorcycles.map(bike => [
            bike.year,
            bike.make,
            bike.model,
            bike.category,
            bike.engine || '',
            bike.displacement || '',
            bike.source
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    createSummary(motorcycles) {
        const summary = {};
        motorcycles.forEach(bike => {
            summary[bike.make] = (summary[bike.make] || 0) + 1;
        });
        return summary;
    }

    async close() {
        await this.stagehand.close();
        console.log('\n🔒 Scraper closed');
    }
}

// Main execution
async function main() {
    const scraper = new ComprehensiveMotorcycleScraper();
    
    try {
        await scraper.initialize();
        await scraper.scrapeMotorcycleDatabase();
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

export default ComprehensiveMotorcycleScraper;