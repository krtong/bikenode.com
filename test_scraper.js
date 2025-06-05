const BennettsScraper = require('./scrapers/bennetts_scraper.js');
const BennettsDatabase = require('./scrapers/bennetts_database.js');
const fs = require('fs-extra');

async function testScraper() {
    console.log('🚀 Starting Bennetts Scraper Test...\n');
    
    const scraper = new BennettsScraper();
    const db = new BennettsDatabase();
    
    try {
        // Initialize database
        console.log('📊 Initializing database...');
        await db.init();
        console.log('✅ Database initialized\n');
        
        // Initialize browser for scraper
        console.log('🌐 Initializing browser...');
        await scraper.initBrowser();
        console.log('✅ Browser initialized\n');
        
        // Test getting review URLs (limited for testing)
        console.log('🔍 Testing review URL extraction...');
        const reviewUrls = await scraper.getAllReviewUrls(1); // Only get first page
        console.log(`✅ Found ${reviewUrls.length} review URLs on first page\n`);
        
        if (reviewUrls.length > 0) {
            // Test scraping one review in detail
            console.log('📖 Testing detailed review scraping...');
            const firstReviewUrl = reviewUrls[0];
            console.log(`🔗 Scraping: ${firstReviewUrl}`);
            
            const reviewData = await scraper.scrapeReviewDetails(firstReviewUrl);
            console.log('✅ Review data extracted:');
            console.log(`   Title: ${reviewData.title}`);
            console.log(`   Manufacturer: ${reviewData.manufacturer}`);
            console.log(`   Model: ${reviewData.model}`);
            console.log(`   Year: ${reviewData.year}`);
            console.log(`   Author: ${reviewData.author.name}`);
            console.log(`   Images: ${reviewData.images.length} found`);
            console.log(`   Specs: ${Object.keys(reviewData.specifications).length} specifications`);
            
            // Test saving to database
            console.log('\n💾 Testing database storage...');
            const reviewId = await db.insertReview(reviewData);
            console.log(`✅ Review saved to database with ID: ${reviewId}`);
            
            // Test retrieving from database
            const savedReview = await db.getReviewById(reviewId);
            console.log(`✅ Retrieved review: ${savedReview.title}`);
            
            // Show database stats
            const stats = await db.getStats();
            console.log('\n📈 Database Statistics:');
            console.log(`   Reviews: ${stats.totalReviews}`);
            console.log(`   Manufacturers: ${stats.totalManufacturers}`);
            console.log(`   Authors: ${stats.totalAuthors}`);
            console.log(`   Images: ${stats.totalImages}`);
        }
        
        console.log('\n🎉 Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;        } finally {
        await scraper.closeBrowser();
        await db.close();
    }
}

// Run the test
if (require.main === module) {
    testScraper()
        .then(() => {
            console.log('\n✅ All tests passed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test failed:', error);
            process.exit(1);
        });
}

module.exports = testScraper;
