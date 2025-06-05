#!/usr/bin/env node
const BennettsScraper = require('./scrapers/bennetts_scraper.js');
const BennettsDatabase = require('./scrapers/bennetts_database.js');

async function runDemo() {
    console.log('🏍️  Bennetts Motorcycle Scraper Demo');
    console.log('=====================================\n');
    
    const scraper = new BennettsScraper();
    const db = new BennettsDatabase();
    
    try {
        // Initialize database
        console.log('📊 Setting up database...');
        await db.init();
        console.log('✅ Database ready\n');
        
        // Test a simple scraping operation
        console.log('🌐 Testing browser initialization...');
        await scraper.initBrowser();
        console.log('✅ Browser ready\n');
        
        console.log('🔍 Testing URL extraction (first page only)...');
        const reviewUrls = await scraper.getAllReviewUrls(1);
        console.log(`✅ Found ${reviewUrls.length} review URLs\n`);
        
        if (reviewUrls.length > 0) {
            console.log('📖 Testing review scraping (first review only)...');
            const firstUrl = reviewUrls[0];
            console.log(`🔗 Scraping: ${firstUrl}`);
            
            const reviewData = await scraper.scrapeReviewDetails(firstUrl);
            
            if (reviewData) {
                console.log('✅ Review scraped successfully:');
                console.log(`   Title: ${reviewData.title}`);
                console.log(`   Manufacturer: ${reviewData.manufacturer}`);
                console.log(`   Model: ${reviewData.model}`);
                console.log(`   Images: ${reviewData.images.length}`);
                console.log(`   Specs: ${Object.keys(reviewData.specifications).length}\n`);
                
                console.log('💾 Saving to database...');
                const reviewId = await db.insertReview(reviewData);
                console.log(`✅ Saved with ID: ${reviewId}\n`);
                
                // Show final stats
                const stats = await db.getStats();
                console.log('📈 Final Database Stats:');
                console.log(`   Reviews: ${stats.totalReviews}`);
                console.log(`   Manufacturers: ${stats.totalManufacturers}`);
                console.log(`   Models: ${stats.totalModels}`);
                console.log(`   Authors: ${stats.totalAuthors}`);
                console.log(`   Images: ${stats.totalImages}`);
            } else {
                console.log('❌ Failed to scrape review data');
            }
        } else {
            console.log('❌ No review URLs found');
        }
        
        console.log('\n🎉 Demo completed successfully!');
        console.log('\n📋 Available commands:');
        console.log('   npm run scrape:bennetts  - Run full scraper');
        console.log('   node scrapers/bennetts_scraper.js 10  - Scrape 10 reviews');
        console.log('   node demo_full.js  - Run this demo again');
        
    } catch (error) {
        console.error('\n❌ Demo failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        console.log('\n🧹 Cleaning up...');
        await scraper.closeBrowser();
        await db.close();
        console.log('✅ Cleanup complete');
        
        // Force exit to prevent hanging
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
}

// Run the demo
runDemo();
