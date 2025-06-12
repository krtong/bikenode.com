#!/usr/bin/env node
/**
 * Bicycle Brands Search & Filter Tool
 * Interactive tool to search and filter bicycle brands data
 */

const fs = require('fs');
const readline = require('readline');

// Try to load cleaned data first, fallback to original
let brandinfo;
try {
    brandinfo = require('./bicycle_brands_cleaned.js');
    console.log('📦 Loaded cleaned bicycle brands data');
} catch (e) {
    brandinfo = require('./bicycle_brands.js');
    console.log('📦 Loaded original bicycle brands data');
}

class BrandSearcher {
    constructor(brands) {
        this.brands = brands;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    searchByName(query) {
        const lowercaseQuery = query.toLowerCase();
        return this.brands.filter(brand => 
            brand.brand_name?.toLowerCase().includes(lowercaseQuery) ||
            brand.brand_id?.toLowerCase().includes(lowercaseQuery)
        );
    }

    filterByCountry(country) {
        const lowercaseCountry = country.toLowerCase();
        return this.brands.filter(brand => 
            brand.headquarters?.country?.toLowerCase().includes(lowercaseCountry) ||
            brand.founding?.location?.country?.toLowerCase().includes(lowercaseCountry)
        );
    }

    filterByFoundingYear(startYear, endYear = new Date().getFullYear()) {
        return this.brands.filter(brand => {
            const year = brand.founding?.year;
            return year && year >= startYear && year <= endYear;
        });
    }

    filterByIndustry(industry) {
        const lowercaseIndustry = industry.toLowerCase();
        return this.brands.filter(brand => 
            brand.industry?.toLowerCase().includes(lowercaseIndustry) ||
            brand.industry_subcategory?.toLowerCase().includes(lowercaseIndustry)
        );
    }

    searchAdvanced(filters) {
        let results = [...this.brands];

        if (filters.name) {
            results = results.filter(brand => 
                brand.brand_name?.toLowerCase().includes(filters.name.toLowerCase()) ||
                brand.brand_id?.toLowerCase().includes(filters.name.toLowerCase())
            );
        }

        if (filters.country) {
            results = results.filter(brand => 
                brand.headquarters?.country?.toLowerCase().includes(filters.country.toLowerCase())
            );
        }

        if (filters.foundedAfter) {
            results = results.filter(brand => 
                brand.founding?.year && brand.founding.year >= filters.foundedAfter
            );
        }

        if (filters.foundedBefore) {
            results = results.filter(brand => 
                brand.founding?.year && brand.founding.year <= filters.foundedBefore
            );
        }

        if (filters.industry) {
            results = results.filter(brand => 
                brand.industry_subcategory?.toLowerCase().includes(filters.industry.toLowerCase())
            );
        }

        if (filters.hasWebsite) {
            results = results.filter(brand => brand.website);
        }

        if (filters.hasSocialMedia) {
            results = results.filter(brand => {
                const social = brand.social_media;
                return social && (social.facebook || social.instagram || social.twitter);
            });
        }

        return results;
    }

    displayBrand(brand, detailed = false) {
        console.log(`\n🚴 ${brand.brand_name} (${brand.brand_id})`);
        console.log(`   📍 ${brand.headquarters?.country || 'Unknown location'}`);
        console.log(`   📅 Founded: ${brand.founding?.year || 'Unknown'}`);
        console.log(`   🌐 ${brand.website || 'No website'}`);
        
        if (detailed) {
            console.log(`   📝 ${brand.description || 'No description'}`);
            if (brand.famous_models?.length > 0) {
                console.log(`   🏆 Famous models: ${brand.famous_models.join(', ')}`);
            }
            if (brand.social_media) {
                const socials = [];
                if (brand.social_media.facebook) socials.push('Facebook');
                if (brand.social_media.instagram) socials.push('Instagram');
                if (brand.social_media.twitter) socials.push('Twitter');
                if (socials.length > 0) {
                    console.log(`   📱 Social: ${socials.join(', ')}`);
                }
            }
        }
    }

    displayResults(results, detailed = false) {
        if (results.length === 0) {
            console.log('❌ No brands found matching your criteria');
            return;
        }

        console.log(`\n✅ Found ${results.length} brand(s):`);
        results.forEach(brand => this.displayBrand(brand, detailed));
    }

    async askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    async interactiveSearch() {
        console.log('\n🔍 BICYCLE BRANDS INTERACTIVE SEARCH');
        console.log('=' * 40);
        console.log('Available commands:');
        console.log('  search <name>     - Search by brand name');
        console.log('  country <name>    - Filter by country');
        console.log('  year <start> [end] - Filter by founding year');
        console.log('  industry <type>   - Filter by industry');
        console.log('  advanced          - Advanced multi-filter search');
        console.log('  list <n>          - List first n brands');
        console.log('  stats             - Show statistics');
        console.log('  help              - Show this help');
        console.log('  exit              - Exit program\n');

        while (true) {
            try {
                const input = await this.askQuestion('🔍 Enter command: ');
                const [command, ...args] = input.split(' ');

                switch (command.toLowerCase()) {
                    case 'search':
                        if (args.length === 0) {
                            console.log('❌ Please provide a search term');
                            break;
                        }
                        const searchResults = this.searchByName(args.join(' '));
                        this.displayResults(searchResults, true);
                        break;

                    case 'country':
                        if (args.length === 0) {
                            console.log('❌ Please provide a country name');
                            break;
                        }
                        const countryResults = this.filterByCountry(args.join(' '));
                        this.displayResults(countryResults);
                        break;

                    case 'year':
                        if (args.length === 0) {
                            console.log('❌ Please provide a start year');
                            break;
                        }
                        const startYear = parseInt(args[0]);
                        const endYear = args[1] ? parseInt(args[1]) : new Date().getFullYear();
                        const yearResults = this.filterByFoundingYear(startYear, endYear);
                        this.displayResults(yearResults);
                        break;

                    case 'industry':
                        if (args.length === 0) {
                            console.log('❌ Please provide an industry type');
                            break;
                        }
                        const industryResults = this.filterByIndustry(args.join(' '));
                        this.displayResults(industryResults);
                        break;

                    case 'advanced':
                        await this.advancedSearchInterface();
                        break;

                    case 'list':
                        const limit = args[0] ? parseInt(args[0]) : 10;
                        const limitedResults = this.brands.slice(0, limit);
                        this.displayResults(limitedResults);
                        break;

                    case 'stats':
                        this.showStatistics();
                        break;

                    case 'help':
                        console.log('\n🔍 SEARCH COMMANDS:');
                        console.log('  search <name>     - Search by brand name');
                        console.log('  country <name>    - Filter by country');
                        console.log('  year <start> [end] - Filter by founding year');
                        console.log('  industry <type>   - Filter by industry');
                        console.log('  advanced          - Advanced multi-filter search');
                        console.log('  list <n>          - List first n brands');
                        console.log('  stats             - Show statistics');
                        console.log('  exit              - Exit program');
                        break;

                    case 'exit':
                        console.log('👋 Goodbye!');
                        this.rl.close();
                        return;

                    default:
                        console.log('❌ Unknown command. Type "help" for available commands.');
                }
            } catch (error) {
                console.log('❌ Error:', error.message);
            }
        }
    }

    async advancedSearchInterface() {
        console.log('\n🔬 ADVANCED SEARCH');
        console.log('Press Enter to skip any filter\n');

        const filters = {};
        
        const name = await this.askQuestion('Brand name contains: ');
        if (name) filters.name = name;

        const country = await this.askQuestion('Country: ');
        if (country) filters.country = country;

        const foundedAfter = await this.askQuestion('Founded after year: ');
        if (foundedAfter) filters.foundedAfter = parseInt(foundedAfter);

        const foundedBefore = await this.askQuestion('Founded before year: ');
        if (foundedBefore) filters.foundedBefore = parseInt(foundedBefore);

        const industry = await this.askQuestion('Industry contains: ');
        if (industry) filters.industry = industry;

        const hasWebsite = await this.askQuestion('Must have website? (y/n): ');
        if (hasWebsite.toLowerCase() === 'y') filters.hasWebsite = true;

        const hasSocial = await this.askQuestion('Must have social media? (y/n): ');
        if (hasSocial.toLowerCase() === 'y') filters.hasSocialMedia = true;

        const results = this.searchAdvanced(filters);
        this.displayResults(results, true);
    }

    showStatistics() {
        const countries = {};
        const industries = {};
        const foundingYears = [];

        this.brands.forEach(brand => {
            // Count countries
            const country = brand.headquarters?.country;
            if (country) {
                countries[country] = (countries[country] || 0) + 1;
            }

            // Count industries
            const industry = brand.industry_subcategory || brand.industry;
            if (industry) {
                industries[industry] = (industries[industry] || 0) + 1;
            }

            // Collect founding years
            const year = brand.founding?.year;
            if (year && year > 1800) {
                foundingYears.push(year);
            }
        });

        console.log('\n📊 BICYCLE BRANDS STATISTICS');
        console.log('=' * 30);
        console.log(`Total brands: ${this.brands.length}`);
        console.log(`Brands with founding year: ${foundingYears.length}`);
        
        if (foundingYears.length > 0) {
            console.log(`Oldest brand: ${Math.min(...foundingYears)}`);
            console.log(`Newest brand: ${Math.max(...foundingYears)}`);
            console.log(`Average founding year: ${Math.round(foundingYears.reduce((a, b) => a + b, 0) / foundingYears.length)}`);
        }

        console.log('\n🌍 TOP 10 COUNTRIES:');
        Object.entries(countries)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .forEach(([country, count]) => {
                console.log(`  ${country.padEnd(20)} ${count} brands`);
            });

        console.log('\n🏭 TOP 10 INDUSTRIES:');
        Object.entries(industries)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .forEach(([industry, count]) => {
                console.log(`  ${industry.substring(0, 25).padEnd(25)} ${count} brands`);
            });
    }
}

// CLI interface
if (require.main === module) {
    const searcher = new BrandSearcher(brandinfo);
    
    // Check if arguments provided for direct search
    const args = process.argv.slice(2);
    if (args.length > 0) {
        const command = args[0];
        const query = args.slice(1).join(' ');
        
        switch (command) {
            case 'search':
                const results = searcher.searchByName(query);
                searcher.displayResults(results, true);
                break;
            case 'country':
                const countryResults = searcher.filterByCountry(query);
                searcher.displayResults(countryResults);
                break;
            case 'stats':
                searcher.showStatistics();
                break;
            default:
                console.log('❌ Unknown command. Use: search, country, or stats');
        }
        searcher.rl.close();
    } else {
        // Interactive mode
        searcher.interactiveSearch();
    }
}

module.exports = BrandSearcher;