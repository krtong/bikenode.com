#!/usr/bin/env node

/**
 * Surly Bikes Research Demo
 * Demonstrates the brand research system by researching Surly Bikes
 */

import BrandResearcher from './brand_research_system.js';
import fs from 'fs';
import path from 'path';

async function researchSurlyBikes() {
    console.log('🔍 Starting Surly Bikes Research Demo');
    console.log('=====================================\n');
    
    const researcher = new BrandResearcher();
    
    // Mock web search function for demo (in real implementation, this would use WebSearch tool)
    const mockWebSearch = async (query) => {
        console.log(`📡 Searching: "${query}"`);
        
        // Simulated search results based on typical Surly Bikes information
        const mockResults = {
            'Surly Bikes bicycle company history founding': [
                {
                    title: "Surly Bikes - Wikipedia",
                    url: "https://en.wikipedia.org/wiki/Surly_Bikes",
                    snippet: "Surly Bikes is an American bicycle manufacturer founded in 1998 in Minneapolis, Minnesota. The company was founded by Dave Gray and is known for producing durable steel frame bicycles."
                },
                {
                    title: "About Surly - Surly Bikes",
                    url: "https://surlybikes.com/about",
                    snippet: "Surly was founded in 1998 in Minneapolis, Minnesota with the mission to build bikes that are built to last. Founded by Dave Gray, we specialize in steel frame bicycles for adventure and utility cycling."
                }
            ],
            'Surly Bikes bikes headquarters founded': [
                {
                    title: "Surly Bikes Company Info",
                    url: "https://surlybikes.com/company",
                    snippet: "Surly Bikes is headquartered in Minneapolis, Minnesota. The company was established in 1998 and is part of the Quality Bicycle Products family of brands."
                },
                {
                    title: "Surly Bikes Address and Contact",
                    url: "https://surlybikes.com/contact",
                    snippet: "Surly Bikes, 6400 W 105th St, Bloomington, MN 55438, United States. Phone: (952) 943-8500. Founded in 1998 in Minneapolis area."
                }
            ],
            'Surly Bikes bicycle famous models bikes': [
                {
                    title: "Popular Surly Bike Models",
                    url: "https://surlybikes.com/bikes",
                    snippet: "Popular Surly models include the Long Haul Trucker, Cross-Check, Pugsley fat bike, Straggler, and Midnight Special. Known for steel touring and adventure bikes."
                },
                {
                    title: "Best Surly Bikes 2024",
                    url: "https://example.com/surly-review",
                    snippet: "Top Surly bikes include the Long Haul Trucker for touring, Pugsley for fat biking, Krampus for plus-size tires, and the versatile Cross-Check cyclocross bike."
                }
            ],
            'Surly Bikes cycling company founders website': [
                {
                    title: "Surly Bikes Official Website",
                    url: "https://surlybikes.com",
                    snippet: "Official website of Surly Bikes. Founded by Dave Gray in 1998, Surly builds steel bicycles in Minneapolis, Minnesota. Part of Quality Bicycle Products."
                },
                {
                    title: "Dave Gray Surly Founder Interview",
                    url: "https://example.com/dave-gray-interview",
                    snippet: "Dave Gray founded Surly Bikes in 1998 with a vision to create durable, practical bicycles. The company is now part of Quality Bicycle Products and employs approximately 50 people."
                }
            ]
        };
        
        return mockResults[query] || [];
    };
    
    try {
        const results = await researcher.researchBrand('Surly Bikes', mockWebSearch);
        
        console.log('\n📊 Research Results Summary:');
        console.log('============================');
        console.log(`✅ Overall Confidence: ${results.confidence_scores.overall}%`);
        console.log(`📄 Sources Found: ${results.sources.length}`);
        console.log(`🏗️  Founding Year: ${results.brand_data.founding.year || 'Not found'}`);
        console.log(`🏢 Headquarters: ${results.brand_data.headquarters.city || 'Not found'}`);
        console.log(`👥 Founders: ${results.brand_data.founders.join(', ') || 'Not found'}`);
        console.log(`🚲 Famous Models: ${results.brand_data.famous_models.length} found`);
        console.log(`🌐 Website: ${results.brand_data.website || 'Not found'}`);
        
        console.log('\n📋 Data Quality Notes:');
        results.brand_data.research_metadata.data_quality_notes.forEach(note => {
            console.log(`   • ${note}`);
        });
        
        // Save full results
        const outputPath = path.join(__dirname, 'downloads', 'surly_bikes_research.json');
        
        // Create downloads directory if it doesn't exist
        const downloadsDir = path.dirname(outputPath);
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir, { recursive: true });
        }
        
        researcher.saveResults(outputPath);
        
        console.log('\n📋 Complete Brand Data Structure:');
        console.log('=================================');
        console.log(JSON.stringify(results.brand_data, null, 2));
        
        console.log('\n🎯 Confidence Breakdown:');
        console.log('========================');
        Object.entries(results.confidence_scores).forEach(([key, value]) => {
            if (typeof value === 'number') {
                console.log(`${key.padEnd(20)}: ${value}%`);
            }
        });
        
        return results;
        
    } catch (error) {
        console.error('❌ Research failed:', error);
        throw error;
    }
}

// Run the demo
if (require.main === module) {
    researchSurlyBikes()
        .then(() => {
            console.log('\n✅ Research completed successfully!');
            console.log('Check the downloads folder for the complete JSON output.');
        })
        .catch(error => {
            console.error('❌ Research failed:', error);
            process.exit(1);
        });
}

export default researchSurlyBikes;