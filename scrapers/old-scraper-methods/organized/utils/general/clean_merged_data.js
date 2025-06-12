const fs = require('fs').promises;

class MotorcycleDataCleaner {
    constructor() {
        this.cleanedData = [];
    }

    // Clean individual motorcycle entry
    cleanMotorcycle(bike) {
        const cleaned = {
            manufacturer: bike.manufacturer?.trim() || null,
            model: bike.model?.trim() || null,
            year: this.cleanYear(bike.year),
            category: bike.category?.trim() || null,
            engine: bike.engine?.trim() || null,
            package: bike.package?.trim() || null,
            source: bike.source
        };

        // Clean specifications
        if (bike.specifications && typeof bike.specifications === 'object') {
            const cleanSpecs = {};
            Object.entries(bike.specifications).forEach(([key, value]) => {
                const cleanKey = key.trim();
                const cleanValue = typeof value === 'string' ? value.trim() : value;
                if (cleanKey && cleanValue && cleanValue !== '') {
                    cleanSpecs[cleanKey] = cleanValue;
                }
            });
            if (Object.keys(cleanSpecs).length > 0) {
                cleaned.specifications = cleanSpecs;
            }
        }

        // Clean images - filter out logos and search icons
        if (bike.images && Array.isArray(bike.images)) {
            const validImages = bike.images.filter(img => {
                const url = img.url || '';
                return !url.includes('Logo.jpg') && 
                       !url.includes('search.png') && 
                       !url.includes('favicon') &&
                       img.width > 100 && 
                       img.height > 100;
            });
            if (validImages.length > 0) {
                cleaned.images = validImages;
            }
        }

        // Clean content - remove cookie consent text
        if (bike.content && typeof bike.content === 'string') {
            let content = bike.content.trim();
            
            // Remove cookie consent blocks
            content = content.replace(/Your personal data will be processed.*?Declining a vendor can stop them from using the data you shared\./gs, '');
            content = content.replace(/Cookie duration:.*?$/gm, '');
            content = content.replace(/Data collected and processed:.*?$/gm, '');
            content = content.replace(/Uses other forms of storage\./g, '');
            content = content.replace(/How this consent management platform.*?$/gs, '');
            
            // Clean up extra whitespace
            content = content.replace(/\n{3,}/g, '\n\n').trim();
            
            if (content && content.length > 20) {
                cleaned.content = content;
            }
        }

        // Add title and URL if they exist and are valid
        if (bike.title && bike.title.trim() && !bike.title.includes('consent')) {
            cleaned.title = bike.title.trim();
        }

        if (bike.url && bike.url.trim()) {
            cleaned.url = bike.url.trim();
        }

        if (bike.scraped_at) {
            cleaned.scraped_at = bike.scraped_at;
        }

        return cleaned;
    }

    // Clean year field
    cleanYear(year) {
        if (!year) return null;
        
        const yearStr = String(year).trim();
        
        // Extract 4-digit year
        const yearMatch = yearStr.match(/(\d{4})/);
        if (yearMatch) {
            const yearNum = parseInt(yearMatch[1]);
            if (yearNum >= 1800 && yearNum <= 2030) {
                return yearNum;
            }
        }
        
        return null;
    }

    // Remove duplicates based on manufacturer + model + year + package/variant
    removeDuplicates() {
        const seen = new Set();
        const unique = [];
        
        for (const bike of this.cleanedData) {
            // Include package/variant info to preserve different versions
            const key = `${bike.manufacturer}|${bike.model}|${bike.year}|${bike.package || ''}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(bike);
            }
        }
        
        const duplicatesRemoved = this.cleanedData.length - unique.length;
        this.cleanedData = unique;
        
        console.log(`🗑️ Removed ${duplicatesRemoved} duplicates (preserving variants)`);
    }

    // Filter out invalid entries - very conservative
    filterInvalid() {
        const before = this.cleanedData.length;
        
        this.cleanedData = this.cleanedData.filter(bike => {
            // Only remove if truly invalid - must have manufacturer and model
            if (!bike.manufacturer || !bike.model) return false;
            
            // Only remove obvious test entries - be very conservative
            if (bike.manufacturer === 'Test' || bike.model === 'Test') {
                return false;
            }
            
            return true;
        });
        
        const removed = before - this.cleanedData.length;
        console.log(`🗑️ Filtered out ${removed} invalid entries (conservative)`);
    }

    // Sort by manufacturer, then model, then year
    sortData() {
        this.cleanedData.sort((a, b) => {
            if (a.manufacturer !== b.manufacturer) {
                return a.manufacturer.localeCompare(b.manufacturer);
            }
            if (a.model !== b.model) {
                return a.model.localeCompare(b.model);
            }
            return (a.year || 0) - (b.year || 0);
        });
        
        console.log('📊 Data sorted by manufacturer, model, year');
    }

    // Generate statistics
    generateStats() {
        const stats = {
            total_motorcycles: this.cleanedData.length,
            with_detailed_specs: this.cleanedData.filter(bike => 
                bike.specifications && Object.keys(bike.specifications).length > 5
            ).length,
            with_images: this.cleanedData.filter(bike => 
                bike.images && bike.images.length > 0
            ).length,
            year_range: {
                earliest: Math.min(...this.cleanedData.map(bike => bike.year).filter(y => y)),
                latest: Math.max(...this.cleanedData.map(bike => bike.year).filter(y => y))
            },
            manufacturers: [...new Set(this.cleanedData.map(bike => bike.manufacturer))].length,
            by_source: {}
        };

        // Count by source
        this.cleanedData.forEach(bike => {
            stats.by_source[bike.source] = (stats.by_source[bike.source] || 0) + 1;
        });

        return stats;
    }

    async run() {
        try {
            console.log('🧹 Starting motorcycle data cleaning...');
            
            // Load merged data
            const rawData = JSON.parse(await fs.readFile(
                './scraped_data/motorcycles/merged_motorcycle_data_2025-06-05T11-51-40-464Z.json', 
                'utf8'
            ));
            
            console.log(`📊 Loaded ${rawData.motorcycles.length} motorcycles`);
            
            // Clean each motorcycle
            console.log('🧼 Cleaning motorcycle entries...');
            this.cleanedData = rawData.motorcycles.map(bike => this.cleanMotorcycle(bike));
            
            // Remove duplicates
            this.removeDuplicates();
            
            // Filter invalid entries
            this.filterInvalid();
            
            // Sort data
            this.sortData();
            
            // Generate final stats
            const stats = this.generateStats();
            
            // Save cleaned data
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `./scraped_data/motorcycles/cleaned_motorcycle_data_${timestamp}.json`;
            
            const finalData = {
                cleaned_at: new Date().toISOString(),
                statistics: stats,
                motorcycles: this.cleanedData
            };
            
            await fs.writeFile(filename, JSON.stringify(finalData, null, 2));
            
            console.log(`\n✅ Cleaning completed!`);
            console.log(`📊 Final statistics:`);
            console.log(`   Total motorcycles: ${stats.total_motorcycles.toLocaleString()}`);
            console.log(`   With detailed specs: ${stats.with_detailed_specs.toLocaleString()}`);
            console.log(`   With images: ${stats.with_images.toLocaleString()}`);
            console.log(`   Year range: ${stats.year_range.earliest} - ${stats.year_range.latest}`);
            console.log(`   Manufacturers: ${stats.manufacturers}`);
            console.log(`   By source:`, stats.by_source);
            console.log(`💾 Saved to: ${filename}`);
            
            return filename;
            
        } catch (error) {
            console.error('❌ Cleaning failed:', error);
            throw error;
        }
    }
}

// Run the cleaner
if (require.main === module) {
    const cleaner = new MotorcycleDataCleaner();
    cleaner.run().then(filename => {
        console.log(`🎉 Cleaned data ready: ${filename}`);
        process.exit(0);
    }).catch(error => {
        console.error('💥 Cleaning failed:', error);
        process.exit(1);
    });
}

module.exports = MotorcycleDataCleaner;