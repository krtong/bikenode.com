#!/usr/bin/env node
/**
 * Bicycle Brands Data Quality Analyzer
 * Analyzes the bicycle_brands.js file for data quality, completeness, and issues
 */

const fs = require('fs');
const path = require('path');

// Load the brands data
const brandinfo = require('./bicycle_brands.js');

class BrandAnalyzer {
    constructor(brands) {
        this.brands = brands;
        this.analysis = {
            total_brands: brands.length,
            completeness: {},
            data_quality: {},
            issues: [],
            statistics: {}
        };
    }

    analyzeDataCompleteness() {
        const fields = [
            'brand_id', 'brand_name', 'website', 'description', 'founders',
            'founding.year', 'founding.location.country', 'headquarters.country',
            'logo.logo_url', 'logo.icon_url', 'famous_models', 'flagship_models',
            'social_media.facebook', 'social_media.instagram', 'social_media.twitter'
        ];

        const completeness = {};

        fields.forEach(field => {
            let completeCount = 0;
            
            this.brands.forEach(brand => {
                const value = this.getNestedValue(brand, field);
                if (value !== null && value !== undefined && value !== '' && 
                    !(Array.isArray(value) && value.length === 0)) {
                    completeCount++;
                }
            });

            completeness[field] = {
                complete: completeCount,
                percentage: Math.round((completeCount / this.brands.length) * 100)
            };
        });

        this.analysis.completeness = completeness;
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
        }, obj);
    }

    analyzeDataQuality() {
        const issues = [];
        const duplicateIds = {};
        const duplicateNames = {};
        const invalidUrls = [];
        const missingCriticalFields = [];

        this.brands.forEach((brand, index) => {
            // Check for duplicate IDs
            if (duplicateIds[brand.brand_id]) {
                duplicateIds[brand.brand_id].push(index);
            } else {
                duplicateIds[brand.brand_id] = [index];
            }

            // Check for duplicate names
            const normalizedName = brand.brand_name?.toLowerCase().trim();
            if (normalizedName) {
                if (duplicateNames[normalizedName]) {
                    duplicateNames[normalizedName].push(index);
                } else {
                    duplicateNames[normalizedName] = [index];
                }
            }

            // Check for missing critical fields
            if (!brand.brand_id || !brand.brand_name) {
                missingCriticalFields.push({
                    index,
                    brand_id: brand.brand_id,
                    brand_name: brand.brand_name,
                    missing: []
                });
                if (!brand.brand_id) missingCriticalFields[missingCriticalFields.length - 1].missing.push('brand_id');
                if (!brand.brand_name) missingCriticalFields[missingCriticalFields.length - 1].missing.push('brand_name');
            }

            // Check URL validity
            const urls = [
                { field: 'website', url: brand.website },
                { field: 'wikipedia_url', url: brand.wikipedia_url },
                { field: 'logo.logo_url', url: brand.logo?.logo_url },
                { field: 'logo.icon_url', url: brand.logo?.icon_url }
            ];

            urls.forEach(({ field, url }) => {
                if (url && !this.isValidUrl(url)) {
                    invalidUrls.push({
                        brand_id: brand.brand_id,
                        field,
                        url
                    });
                }
            });
        });

        // Find actual duplicates
        Object.keys(duplicateIds).forEach(id => {
            if (duplicateIds[id].length > 1) {
                issues.push({
                    type: 'duplicate_id',
                    brand_id: id,
                    indices: duplicateIds[id]
                });
            }
        });

        Object.keys(duplicateNames).forEach(name => {
            if (duplicateNames[name].length > 1) {
                issues.push({
                    type: 'duplicate_name',
                    brand_name: name,
                    indices: duplicateNames[name]
                });
            }
        });

        this.analysis.data_quality = {
            issues: issues.length,
            invalid_urls: invalidUrls.length,
            missing_critical_fields: missingCriticalFields.length
        };

        this.analysis.issues = [...issues, ...invalidUrls.map(u => ({
            type: 'invalid_url',
            ...u
        })), ...missingCriticalFields.map(m => ({
            type: 'missing_critical_field',
            ...m
        }))];
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    analyzeStatistics() {
        const foundingYears = this.brands
            .map(b => b.founding?.year)
            .filter(y => y && y > 1800 && y <= new Date().getFullYear());

        const countries = {};
        const industries = {};

        this.brands.forEach(brand => {
            const country = brand.headquarters?.country;
            if (country) {
                countries[country] = (countries[country] || 0) + 1;
            }

            const industry = brand.industry_subcategory || brand.industry;
            if (industry) {
                industries[industry] = (industries[industry] || 0) + 1;
            }
        });

        this.analysis.statistics = {
            founding_years: {
                min: Math.min(...foundingYears),
                max: Math.max(...foundingYears),
                avg: Math.round(foundingYears.reduce((a, b) => a + b, 0) / foundingYears.length),
                count: foundingYears.length
            },
            top_countries: Object.entries(countries)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([country, count]) => ({ country, count })),
            top_industries: Object.entries(industries)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([industry, count]) => ({ industry, count }))
        };
    }

    generateReport() {
        this.analyzeDataCompleteness();
        this.analyzeDataQuality();
        this.analyzeStatistics();

        return this.analysis;
    }

    printReport() {
        const report = this.generateReport();
        
        console.log('🚴 BICYCLE BRANDS DATA ANALYSIS REPORT');
        console.log('=' * 50);
        console.log(`\n📊 OVERVIEW:`);
        console.log(`Total Brands: ${report.total_brands}`);
        console.log(`Data Quality Issues: ${report.data_quality.issues}`);
        console.log(`Invalid URLs: ${report.data_quality.invalid_urls}`);
        console.log(`Missing Critical Fields: ${report.data_quality.missing_critical_fields}`);

        console.log(`\n📈 DATA COMPLETENESS:`);
        Object.entries(report.completeness).forEach(([field, data]) => {
            const bar = '█'.repeat(Math.round(data.percentage / 5));
            console.log(`${field.padEnd(25)} ${data.percentage}% ${bar}`);
        });

        console.log(`\n🌍 TOP COUNTRIES:`);
        report.statistics.top_countries.forEach(({ country, count }) => {
            console.log(`${country.padEnd(20)} ${count} brands`);
        });

        console.log(`\n🏭 TOP INDUSTRIES:`);
        report.statistics.top_industries.forEach(({ industry, count }) => {
            console.log(`${industry.padEnd(25)} ${count} brands`);
        });

        console.log(`\n📅 FOUNDING YEARS:`);
        const stats = report.statistics.founding_years;
        console.log(`Oldest: ${stats.min} | Newest: ${stats.max} | Average: ${stats.avg}`);
        console.log(`${stats.count} brands have founding year data`);

        if (report.issues.length > 0) {
            console.log(`\n⚠️  ISSUES FOUND:`);
            report.issues.slice(0, 10).forEach(issue => {
                console.log(`- ${issue.type}: ${JSON.stringify(issue, null, 2)}`);
            });
            if (report.issues.length > 10) {
                console.log(`... and ${report.issues.length - 10} more issues`);
            }
        }

        return report;
    }
}

// CLI interface
if (require.main === module) {
    const analyzer = new BrandAnalyzer(brandinfo);
    const report = analyzer.printReport();
    
    // Save detailed report to file
    const outputFile = `bicycle_brands_analysis_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${outputFile}`);
}

module.exports = BrandAnalyzer;