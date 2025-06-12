#!/usr/bin/env node

import BikezArchiveScraper from './bikez_archive_scraper.js';

async function testArchiveScraper() {
    console.log('🧪 Testing Bikez Archive Scraper\n');
    
    // The archive URL you provided
    const testUrl = 'https://web.archive.org/web/20241107124610/https://bikez.com/motorcycles/cf_moto_leader_150_2015.php';
    
    const scraper = new BikezArchiveScraper();
    
    try {
        await scraper.initialize();
        
        console.log('📌 Testing with archive.org URL:');
        console.log(`   ${testUrl}\n`);
        
        const startTime = Date.now();
        const data = await scraper.scrapeMotorcyclePage(testUrl);
        const elapsed = Date.now() - startTime;
        
        if (data) {
            console.log('\n✅ Successfully scraped page!');
            console.log(`⏱️  Time taken: ${elapsed}ms\n`);
            
            console.log('📊 Extracted Data:');
            console.log('==================');
            
            if (data.title) {
                console.log(`\n📍 Title: ${data.title}`);
            }
            
            if (data.specs && Object.keys(data.specs).length > 0) {
                console.log('\n🔧 Specifications:');
                Object.entries(data.specs).slice(0, 10).forEach(([key, value]) => {
                    console.log(`   ${key}: ${value}`);
                });
                
                if (Object.keys(data.specs).length > 10) {
                    console.log(`   ... and ${Object.keys(data.specs).length - 10} more specs`);
                }
            }
            
            if (data.images && data.images.length > 0) {
                console.log(`\n🖼️  Images found: ${data.images.length}`);
                data.images.slice(0, 3).forEach((img, i) => {
                    console.log(`   ${i + 1}. ${img}`);
                });
            }
            
            if (data.description) {
                console.log(`\n📝 Description: ${data.description.substring(0, 200)}...`);
            }
            
            // Save the results
            scraper.saveResults(data, 'test_archive_scrape.json');
            
        } else {
            console.log('❌ Failed to scrape data from the page');
        }
        
    } catch (error) {
        console.error('💥 Test failed:', error);
    } finally {
        await scraper.close();
    }
}

// Run the test
testArchiveScraper();