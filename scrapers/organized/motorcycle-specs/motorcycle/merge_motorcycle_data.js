const fs = require('fs').promises;
const path = require('path');

class MotorcycleDataMerger {
    constructor() {
        this.csvData = [];
        this.detailedData = [];
        this.mergedData = [];
    }

    // Parse CSV data
    async loadCSVData() {
        const csvContent = await fs.readFile('../database/data/motorcycles.csv', 'utf8');
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',');
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = line.split(',');
                const motorcycle = {};
                headers.forEach((header, index) => {
                    motorcycle[header.toLowerCase()] = values[index] || null;
                });
                this.csvData.push(motorcycle);
            }
        }
        
        console.log(`📊 Loaded ${this.csvData.length} motorcycles from CSV`);
    }

    // Load detailed scraped data
    async loadDetailedData() {
        const files = await fs.readdir('./scraped_data/motorcycles/');
        const jsonFiles = files.filter(f => f.endsWith('.json') && f.includes('motorcyclespecs_'));
        
        if (jsonFiles.length > 0) {
            jsonFiles.sort();
            const latestFile = jsonFiles[jsonFiles.length - 1];
            const filePath = `./scraped_data/motorcycles/${latestFile}`;
            
            console.log(`📂 Loading detailed data from ${latestFile}...`);
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
            this.detailedData = data.motorcycles;
            console.log(`📊 Loaded ${this.detailedData.length} detailed motorcycles`);
        }
    }

    // Try to match motorcycles between datasets
    findMatch(detailedBike) {
        const manufacturer = detailedBike.manufacturer.toLowerCase();
        const model = detailedBike.model.toLowerCase();
        
        // Try exact matches first
        let matches = this.csvData.filter(csvBike => {
            const csvMake = (csvBike.make || '').toLowerCase();
            const csvModel = (csvBike.model || '').toLowerCase();
            
            return csvMake === manufacturer && csvModel === model;
        });
        
        if (matches.length > 0) return matches;
        
        // Try partial matches
        matches = this.csvData.filter(csvBike => {
            const csvMake = (csvBike.make || '').toLowerCase();
            const csvModel = (csvBike.model || '').toLowerCase();
            
            return csvMake.includes(manufacturer) || manufacturer.includes(csvMake) ||
                   csvModel.includes(model) || model.includes(csvModel);
        });
        
        return matches;
    }

    // Merge the datasets
    async mergeData() {
        console.log('🔄 Starting merge process...');
        
        const exactMatches = [];
        const partialMatches = [];
        const noMatches = [];
        
        for (const detailedBike of this.detailedData) {
            const matches = this.findMatch(detailedBike);
            
            if (matches.length === 0) {
                // No match found - add as new entry
                const merged = {
                    source: 'motorcyclespecs_only',
                    manufacturer: detailedBike.manufacturer,
                    model: detailedBike.model,
                    year: null,
                    category: null,
                    engine: null,
                    title: detailedBike.title,
                    specifications: detailedBike.specifications,
                    images: detailedBike.images,
                    content: detailedBike.content,
                    url: detailedBike.url,
                    scraped_at: detailedBike.scraped_at
                };
                this.mergedData.push(merged);
                noMatches.push(detailedBike);
                
            } else if (matches.length === 1) {
                // Exact match
                const csvBike = matches[0];
                const merged = {
                    source: 'merged',
                    manufacturer: detailedBike.manufacturer,
                    model: detailedBike.model,
                    year: csvBike.year,
                    category: csvBike.category,
                    engine: csvBike.engine,
                    package: csvBike.package,
                    title: detailedBike.title,
                    specifications: detailedBike.specifications,
                    images: detailedBike.images,
                    content: detailedBike.content,
                    url: detailedBike.url,
                    scraped_at: detailedBike.scraped_at
                };
                this.mergedData.push(merged);
                exactMatches.push({ detailed: detailedBike, csv: csvBike });
                
            } else {
                // Multiple matches - use the most recent year
                const sortedMatches = matches.sort((a, b) => (b.year || 0) - (a.year || 0));
                const csvBike = sortedMatches[0];
                
                const merged = {
                    source: 'merged_multiple',
                    manufacturer: detailedBike.manufacturer,
                    model: detailedBike.model,
                    year: csvBike.year,
                    category: csvBike.category,
                    engine: csvBike.engine,
                    package: csvBike.package,
                    title: detailedBike.title,
                    specifications: detailedBike.specifications,
                    images: detailedBike.images,
                    content: detailedBike.content,
                    url: detailedBike.url,
                    scraped_at: detailedBike.scraped_at,
                    multiple_matches: matches.length
                };
                this.mergedData.push(merged);
                partialMatches.push({ detailed: detailedBike, csv: csvBike, count: matches.length });
            }
        }
        
        console.log(`\n📊 Merge Results:`);
        console.log(`✅ Exact matches: ${exactMatches.length}`);
        console.log(`🔄 Multiple matches: ${partialMatches.length}`);
        console.log(`❌ No matches: ${noMatches.length}`);
        console.log(`📈 Total merged entries: ${this.mergedData.length}`);
        
        return {
            exactMatches,
            partialMatches,
            noMatches,
            mergedData: this.mergedData
        };
    }

    // Add remaining CSV data that wasn't matched
    addRemainingCSVData() {
        console.log('📝 Adding remaining CSV data...');
        
        const usedCSVEntries = new Set();
        
        // Mark CSV entries that were already merged
        for (const merged of this.mergedData) {
            if (merged.source === 'merged' || merged.source === 'merged_multiple') {
                const csvEntry = this.csvData.find(csv => 
                    csv.make?.toLowerCase() === merged.manufacturer.toLowerCase() &&
                    csv.model?.toLowerCase() === merged.model.toLowerCase() &&
                    csv.year === merged.year
                );
                if (csvEntry) {
                    usedCSVEntries.add(JSON.stringify(csvEntry));
                }
            }
        }
        
        // Add remaining CSV entries
        let addedCount = 0;
        for (const csvBike of this.csvData) {
            const csvKey = JSON.stringify(csvBike);
            if (!usedCSVEntries.has(csvKey)) {
                const csvOnly = {
                    source: 'csv_only',
                    manufacturer: csvBike.make,
                    model: csvBike.model,
                    year: csvBike.year,
                    category: csvBike.category,
                    engine: csvBike.engine,
                    package: csvBike.package,
                    title: null,
                    specifications: {},
                    images: [],
                    content: null,
                    url: null,
                    scraped_at: null
                };
                this.mergedData.push(csvOnly);
                addedCount++;
            }
        }
        
        console.log(`📈 Added ${addedCount} CSV-only entries`);
        console.log(`🎯 Final total: ${this.mergedData.length} motorcycles`);
    }

    // Save merged data
    async saveData() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `./scraped_data/motorcycles/merged_motorcycle_data_${timestamp}.json`;
        
        const dataToSave = {
            merged_at: new Date().toISOString(),
            total_motorcycles: this.mergedData.length,
            sources: {
                motorcyclespecs_detailed: this.detailedData.length,
                csv_database: this.csvData.length,
                merged_total: this.mergedData.length
            },
            motorcycles: this.mergedData
        };
        
        await fs.writeFile(filename, JSON.stringify(dataToSave, null, 2));
        console.log(`💾 Saved merged data to ${filename}`);
        
        // Also save summary stats
        const stats = {
            exact_matches: this.mergedData.filter(m => m.source === 'merged').length,
            multiple_matches: this.mergedData.filter(m => m.source === 'merged_multiple').length,
            motorcyclespecs_only: this.mergedData.filter(m => m.source === 'motorcyclespecs_only').length,
            csv_only: this.mergedData.filter(m => m.source === 'csv_only').length,
            total: this.mergedData.length
        };
        
        console.log('\n📊 Final Statistics:');
        Object.entries(stats).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
        });
        
        return filename;
    }

    async run() {
        try {
            console.log('🚀 Starting motorcycle data merger...');
            
            await this.loadCSVData();
            await this.loadDetailedData();
            
            await this.mergeData();
            this.addRemainingCSVData();
            
            const filename = await this.saveData();
            
            console.log('🎉 Merge completed successfully!');
            return filename;
            
        } catch (error) {
            console.error('❌ Merge failed:', error);
            throw error;
        }
    }
}

// Run the merger
if (require.main === module) {
    const merger = new MotorcycleDataMerger();
    merger.run().then(filename => {
        console.log(`✅ Merged data saved to: ${filename}`);
        process.exit(0);
    }).catch(error => {
        console.error('💥 Merger failed:', error);
        process.exit(1);
    });
}

module.exports = MotorcycleDataMerger;