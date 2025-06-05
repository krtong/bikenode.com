#!/usr/bin/env node
/**
 * Bicycle Brands Data Cleaner
 * Fixes data quality issues found in the bicycle_brands.js file
 */

const fs = require('fs');
const path = require('path');

// Load the brands data
const brandinfo = require('./bicycle_brands.js');

class BrandCleaner {
    constructor(brands) {
        this.brands = [...brands]; // Create a copy
        this.cleaningLog = [];
    }

    log(action, details) {
        this.cleaningLog.push({
            timestamp: new Date().toISOString(),
            action,
            details
        });
        console.log(`✅ ${action}: ${JSON.stringify(details)}`);
    }

    removeDuplicates() {
        const seen = new Set();
        const duplicatesToRemove = [];

        this.brands.forEach((brand, index) => {
            const key = `${brand.brand_id}_${brand.brand_name?.toLowerCase()}`;
            
            if (seen.has(key)) {
                duplicatesToRemove.push(index);
                this.log('DUPLICATE_REMOVED', {
                    index,
                    brand_id: brand.brand_id,
                    brand_name: brand.brand_name
                });
            } else {
                seen.add(key);
            }
        });

        // Remove duplicates in reverse order to maintain indices
        duplicatesToRemove.reverse().forEach(index => {
            this.brands.splice(index, 1);
        });

        return duplicatesToRemove.length;
    }

    fixInvalidUrls() {
        let fixedCount = 0;

        this.brands.forEach((brand, index) => {
            // Fix obviously broken URLs
            if (brand.logo?.logo_url === "turn1image0") {
                delete brand.logo.logo_url;
                fixedCount++;
                this.log('INVALID_URL_REMOVED', {
                    brand_id: brand.brand_id,
                    field: 'logo.logo_url',
                    old_value: 'turn1image0'
                });
            }

            // Check and fix other URL fields
            const urlFields = [
                'website', 'wikipedia_url', 'linkedin_url',
                ['logo', 'logo_url'], ['logo', 'icon_url'],
                ['social_media', 'facebook'], ['social_media', 'twitter'],
                ['social_media', 'instagram'], ['social_media', 'linkedin'],
                ['social_media', 'youtube'], ['social_media', 'pinterest']
            ];

            urlFields.forEach(field => {
                let value;
                if (Array.isArray(field)) {
                    value = brand[field[0]]?.[field[1]];
                } else {
                    value = brand[field];
                }

                if (value && !this.isValidUrl(value)) {
                    // Try to fix common issues
                    let fixedUrl = this.attemptUrlFix(value);
                    
                    if (fixedUrl && this.isValidUrl(fixedUrl)) {
                        if (Array.isArray(field)) {
                            if (!brand[field[0]]) brand[field[0]] = {};
                            brand[field[0]][field[1]] = fixedUrl;
                        } else {
                            brand[field] = fixedUrl;
                        }
                        
                        fixedCount++;
                        this.log('URL_FIXED', {
                            brand_id: brand.brand_id,
                            field: Array.isArray(field) ? field.join('.') : field,
                            old_value: value,
                            new_value: fixedUrl
                        });
                    } else {
                        // Remove invalid URL
                        if (Array.isArray(field)) {
                            if (brand[field[0]]) {
                                delete brand[field[0]][field[1]];
                            }
                        } else {
                            delete brand[field];
                        }
                        
                        fixedCount++;
                        this.log('INVALID_URL_REMOVED', {
                            brand_id: brand.brand_id,
                            field: Array.isArray(field) ? field.join('.') : field,
                            old_value: value
                        });
                    }
                }
            });
        });

        return fixedCount;
    }

    attemptUrlFix(url) {
        if (!url || typeof url !== 'string') return null;
        
        const trimmed = url.trim();
        
        // Add protocol if missing
        if (trimmed.startsWith('www.') || trimmed.includes('.com') || trimmed.includes('.org')) {
            if (!trimmed.startsWith('http')) {
                return `https://${trimmed}`;
            }
        }
        
        return trimmed;
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    standardizeCountryNames() {
        let fixedCount = 0;
        const countryMapping = {
            'United States': 'USA',
            'United States of America': 'USA',
            'US': 'USA',
            'UK': 'United Kingdom',
            'Great Britain': 'United Kingdom',
            'Deutschland': 'Germany',
            'Nederland': 'Netherlands',
            'Schweiz': 'Switzerland',
            'Suisse': 'Switzerland'
        };

        this.brands.forEach(brand => {
            // Standardize founding location country
            if (brand.founding?.location?.country) {
                const country = brand.founding.location.country;
                if (countryMapping[country]) {
                    brand.founding.location.country = countryMapping[country];
                    fixedCount++;
                    this.log('COUNTRY_STANDARDIZED', {
                        brand_id: brand.brand_id,
                        field: 'founding.location.country',
                        old_value: country,
                        new_value: countryMapping[country]
                    });
                }
            }

            // Standardize headquarters country
            if (brand.headquarters?.country) {
                const country = brand.headquarters.country;
                if (countryMapping[country]) {
                    brand.headquarters.country = countryMapping[country];
                    fixedCount++;
                    this.log('COUNTRY_STANDARDIZED', {
                        brand_id: brand.brand_id,
                        field: 'headquarters.country',
                        old_value: country,
                        new_value: countryMapping[country]
                    });
                }
            }
        });

        return fixedCount;
    }

    validateAndCleanArrays() {
        let fixedCount = 0;

        this.brands.forEach(brand => {
            const arrayFields = ['founders', 'famous_models', 'flagship_models'];
            
            arrayFields.forEach(field => {
                if (brand[field] && Array.isArray(brand[field])) {
                    const originalLength = brand[field].length;
                    
                    // Remove empty strings and null values
                    brand[field] = brand[field].filter(item => 
                        item !== null && item !== undefined && item !== ''
                    );

                    if (brand[field].length !== originalLength) {
                        fixedCount++;
                        this.log('ARRAY_CLEANED', {
                            brand_id: brand.brand_id,
                            field,
                            removed_items: originalLength - brand[field].length
                        });
                    }
                }
            });
        });

        return fixedCount;
    }

    cleanAll() {
        console.log('🧹 Starting bicycle brands data cleaning...\n');

        const results = {
            duplicates_removed: this.removeDuplicates(),
            urls_fixed: this.fixInvalidUrls(),
            countries_standardized: this.standardizeCountryNames(),
            arrays_cleaned: this.validateAndCleanArrays()
        };

        console.log('\n📊 CLEANING SUMMARY:');
        console.log(`Duplicates removed: ${results.duplicates_removed}`);
        console.log(`URLs fixed: ${results.urls_fixed}`);
        console.log(`Countries standardized: ${results.countries_standardized}`);
        console.log(`Arrays cleaned: ${results.arrays_cleaned}`);
        console.log(`Total brands after cleaning: ${this.brands.length}`);

        return {
            cleanedBrands: this.brands,
            cleaningLog: this.cleaningLog,
            summary: results
        };
    }

    saveCleanedData(outputFile = 'bicycle_brands_cleaned.js') {
        const cleaningResult = this.cleanAll();
        
        // Generate the cleaned JS file content
        const fileContent = `const brandinfo = ${JSON.stringify(cleaningResult.cleanedBrands, null, 2)};

module.exports = brandinfo;`;

        // Save the cleaned data
        fs.writeFileSync(outputFile, fileContent);
        
        // Save the cleaning log
        const logFile = outputFile.replace('.js', '_cleaning_log.json');
        fs.writeFileSync(logFile, JSON.stringify({
            timestamp: new Date().toISOString(),
            ...cleaningResult
        }, null, 2));

        console.log(`\n💾 Cleaned data saved to: ${outputFile}`);
        console.log(`📋 Cleaning log saved to: ${logFile}`);

        return cleaningResult;
    }
}

// CLI interface
if (require.main === module) {
    const cleaner = new BrandCleaner(brandinfo);
    cleaner.saveCleanedData();
}

module.exports = BrandCleaner;