#!/usr/bin/env node
/**
 * Bicycle Brands Data Enhancer
 * Interactive tool to add missing data to bicycle brands
 */

const fs = require('fs');
const readline = require('readline');

// Load the cleaned brands data
let brandinfo;
try {
    brandinfo = require('./bicycle_brands_cleaned.js');
    console.log('📦 Loaded cleaned bicycle brands data');
} catch (e) {
    brandinfo = require('./bicycle_brands.js');
    console.log('📦 Loaded original bicycle brands data');
}

class BrandEnhancer {
    constructor(brands) {
        this.brands = [...brands]; // Create a copy
        this.enhancements = [];
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    findIncompleteRecords() {
        const incomplete = [];
        
        this.brands.forEach((brand, index) => {
            const missing = [];
            
            // Check critical missing fields
            if (!brand.website) missing.push('website');
            if (!brand.logo?.icon_url) missing.push('logo.icon_url');
            if (!brand.founding?.year) missing.push('founding.year');
            if (!brand.headquarters?.country) missing.push('headquarters.country');
            if (!brand.famous_models || brand.famous_models.length === 0) missing.push('famous_models');
            if (!brand.social_media?.instagram) missing.push('social_media.instagram');
            if (!brand.social_media?.facebook) missing.push('social_media.facebook');
            
            if (missing.length > 0) {
                incomplete.push({
                    index,
                    brand,
                    missing
                });
            }
        });

        return incomplete.sort((a, b) => b.missing.length - a.missing.length);
    }

    displayBrandSummary(brand) {
        console.log(`\n🚴 ${brand.brand_name} (${brand.brand_id})`);
        console.log(`   📍 ${brand.headquarters?.country || '❌ Missing country'}`);
        console.log(`   📅 Founded: ${brand.founding?.year || '❌ Missing year'}`);
        console.log(`   🌐 ${brand.website || '❌ Missing website'}`);
        console.log(`   🏆 Models: ${brand.famous_models?.length || 0} listed`);
        
        const social = brand.social_media || {};
        console.log(`   📱 Social: ${[
            social.facebook ? 'FB' : null,
            social.instagram ? 'IG' : null,
            social.twitter ? 'TW' : null
        ].filter(Boolean).join(', ') || '❌ No social media'}`);
    }

    async enhanceBrand(brandData) {
        const { brand, missing } = brandData;
        
        console.log(`\n🔧 Enhancing: ${brand.brand_name}`);
        console.log(`Missing fields: ${missing.join(', ')}`);
        
        this.displayBrandSummary(brand);
        
        const enhance = await this.askQuestion('\nEnhance this brand? (y/n/skip): ');
        if (enhance.toLowerCase() !== 'y') {
            return false;
        }

        const enhancements = {};
        
        // Website
        if (missing.includes('website')) {
            const website = await this.askQuestion('Website URL: ');
            if (website) {
                enhancements.website = website.startsWith('http') ? website : `https://${website}`;
            }
        }

        // Founding year
        if (missing.includes('founding.year')) {
            const year = await this.askQuestion('Founding year: ');
            if (year && !isNaN(year)) {
                if (!enhancements.founding) enhancements.founding = { ...brand.founding };
                enhancements.founding.year = parseInt(year);
            }
        }

        // Country
        if (missing.includes('headquarters.country')) {
            const country = await this.askQuestion('Headquarters country: ');
            if (country) {
                if (!enhancements.headquarters) enhancements.headquarters = { ...brand.headquarters };
                enhancements.headquarters.country = country;
            }
        }

        // Famous models
        if (missing.includes('famous_models')) {
            const models = await this.askQuestion('Famous models (comma-separated): ');
            if (models) {
                enhancements.famous_models = models.split(',').map(m => m.trim()).filter(m => m);
            }
        }

        // Social media
        if (missing.includes('social_media.instagram')) {
            const instagram = await this.askQuestion('Instagram URL: ');
            if (instagram) {
                if (!enhancements.social_media) enhancements.social_media = { ...brand.social_media };
                enhancements.social_media.instagram = instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram}`;
            }
        }

        if (missing.includes('social_media.facebook')) {
            const facebook = await this.askQuestion('Facebook URL: ');
            if (facebook) {
                if (!enhancements.social_media) enhancements.social_media = { ...brand.social_media };
                enhancements.social_media.facebook = facebook.startsWith('http') ? facebook : `https://facebook.com/${facebook}`;
            }
        }

        // Logo icon
        if (missing.includes('logo.icon_url')) {
            const iconUrl = await this.askQuestion('Logo/Favicon URL: ');
            if (iconUrl) {
                if (!enhancements.logo) enhancements.logo = { ...brand.logo };
                enhancements.logo.icon_url = iconUrl;
            }
        }

        // Apply enhancements
        if (Object.keys(enhancements).length > 0) {
            Object.assign(brand, enhancements);
            this.enhancements.push({
                brand_id: brand.brand_id,
                brand_name: brand.brand_name,
                enhancements
            });
            
            console.log('✅ Brand enhanced!');
            return true;
        }

        return false;
    }

    async interactiveEnhancement() {
        const incomplete = this.findIncompleteRecords();
        
        console.log(`\n📊 Found ${incomplete.length} brands with missing data`);
        console.log('Top brands needing enhancement:');
        
        incomplete.slice(0, 5).forEach((item, i) => {
            console.log(`${i + 1}. ${item.brand.brand_name} - Missing: ${item.missing.join(', ')}`);
        });

        const choice = await this.askQuestion('\nHow would you like to proceed?\n1. Enhance specific brand\n2. Enhance top incomplete brands\n3. Bulk enhance\n4. Show statistics\n5. Exit\nChoice: ');

        switch (choice) {
            case '1':
                await this.enhanceSpecificBrand();
                break;
            case '2':
                await this.enhanceTopIncomplete(incomplete);
                break;
            case '3':
                await this.bulkEnhance(incomplete);
                break;
            case '4':
                this.showEnhancementStats(incomplete);
                break;
            case '5':
                await this.saveAndExit();
                return;
            default:
                console.log('Invalid choice');
        }

        // Continue the loop
        await this.interactiveEnhancement();
    }

    async enhanceSpecificBrand() {
        const search = await this.askQuestion('Enter brand name or ID to search: ');
        const found = this.brands.filter(brand => 
            brand.brand_name.toLowerCase().includes(search.toLowerCase()) ||
            brand.brand_id.toLowerCase().includes(search.toLowerCase())
        );

        if (found.length === 0) {
            console.log('No brands found');
            return;
        }

        if (found.length === 1) {
            const incomplete = this.findIncompleteRecords();
            const brandData = incomplete.find(item => item.brand.brand_id === found[0].brand_id);
            if (brandData) {
                await this.enhanceBrand(brandData);
            } else {
                console.log('This brand appears to be complete!');
                this.displayBrandSummary(found[0]);
            }
        } else {
            console.log(`Found ${found.length} brands:`);
            found.forEach((brand, i) => {
                console.log(`${i + 1}. ${brand.brand_name} (${brand.brand_id})`);
            });
            
            const choice = await this.askQuestion('Select brand number: ');
            const index = parseInt(choice) - 1;
            if (index >= 0 && index < found.length) {
                const incomplete = this.findIncompleteRecords();
                const brandData = incomplete.find(item => item.brand.brand_id === found[index].brand_id);
                if (brandData) {
                    await this.enhanceBrand(brandData);
                } else {
                    console.log('This brand appears to be complete!');
                    this.displayBrandSummary(found[index]);
                }
            }
        }
    }

    async enhanceTopIncomplete(incomplete) {
        const topCount = await this.askQuestion('How many top incomplete brands to enhance? (default 5): ');
        const count = parseInt(topCount) || 5;
        
        for (let i = 0; i < Math.min(count, incomplete.length); i++) {
            console.log(`\n--- Brand ${i + 1} of ${count} ---`);
            const enhanced = await this.enhanceBrand(incomplete[i]);
            if (!enhanced) {
                const continueChoice = await this.askQuestion('Continue to next brand? (y/n): ');
                if (continueChoice.toLowerCase() !== 'y') break;
            }
        }
    }

    showEnhancementStats(incomplete) {
        const missingFieldCounts = {};
        
        incomplete.forEach(item => {
            item.missing.forEach(field => {
                missingFieldCounts[field] = (missingFieldCounts[field] || 0) + 1;
            });
        });

        console.log('\n📊 ENHANCEMENT STATISTICS');
        console.log('=' * 30);
        console.log(`Total brands: ${this.brands.length}`);
        console.log(`Brands needing enhancement: ${incomplete.length}`);
        console.log(`Completion rate: ${Math.round(((this.brands.length - incomplete.length) / this.brands.length) * 100)}%`);
        
        console.log('\n🔍 Most commonly missing fields:');
        Object.entries(missingFieldCounts)
            .sort(([,a], [,b]) => b - a)
            .forEach(([field, count]) => {
                console.log(`  ${field.padEnd(25)} ${count} brands`);
            });

        if (this.enhancements.length > 0) {
            console.log(`\n✅ Enhanced in this session: ${this.enhancements.length} brands`);
        }
    }

    async saveAndExit() {
        if (this.enhancements.length === 0) {
            console.log('No enhancements made. Exiting...');
            this.rl.close();
            return;
        }

        console.log(`\n💾 Saving ${this.enhancements.length} enhancements...`);
        
        // Generate enhanced file
        const timestamp = new Date().toISOString().split('T')[0];
        const outputFile = `bicycle_brands_enhanced_${timestamp}.js`;
        
        const fileContent = `const brandinfo = ${JSON.stringify(this.brands, null, 2)};

module.exports = brandinfo;`;

        fs.writeFileSync(outputFile, fileContent);
        
        // Save enhancement log
        const logFile = `bicycle_brands_enhancements_${timestamp}.json`;
        fs.writeFileSync(logFile, JSON.stringify({
            timestamp: new Date().toISOString(),
            enhancements: this.enhancements,
            summary: {
                total_enhancements: this.enhancements.length,
                enhanced_brands: this.enhancements.map(e => e.brand_id)
            }
        }, null, 2));

        console.log(`✅ Enhanced data saved to: ${outputFile}`);
        console.log(`📋 Enhancement log saved to: ${logFile}`);
        
        this.rl.close();
    }
}

// CLI interface
if (require.main === module) {
    const enhancer = new BrandEnhancer(brandinfo);
    enhancer.interactiveEnhancement().catch(console.error);
}

module.exports = BrandEnhancer;