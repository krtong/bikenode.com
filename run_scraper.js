#!/usr/bin/env node
const BennettsScraper = require('./scrapers/bennetts_scraper.js');
const BennettsDatabase = require('./scrapers/bennetts_database.js');
const config = require('./scrapers/config.js');

async function runProduction() {
    console.log('🏍️  Bennetts Production Scraper');
    console.log('================================\n');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const maxReviews = args.length > 0 ? parseInt(args[0]) : null;
    const maxPages = args.length > 1 ? parseInt(args[1]) : null;
    
    if (maxReviews) {
        console.log(`🎯 Limiting to ${maxReviews} reviews`);
    }
    if (maxPages) {
        console.log(`📄 Limiting to ${maxPages} pages`);
    }
    
    const scraper = new BennettsScraper();
    const db = new BennettsDatabase();
    
    let startTime = Date.now();
    
    try {
        // Initialize
        console.log('\n🚀 Initializing...');
        await db.init();
        await scraper.initBrowser();
        console.log('✅ Ready to scrape\n');
        
        // Get all review URLs
        console.log('📋 Collecting review URLs...');
        const allUrls = await scraper.getAllReviewUrls(maxPages);
        const urlsToScrape = maxReviews ? allUrls.slice(0, maxReviews) : allUrls;
        
        console.log(`🎯 Will scrape ${urlsToScrape.length} out of ${allUrls.length} total reviews\n`);
        
        // Scrape reviews
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < urlsToScrape.length; i++) {
            const url = urlsToScrape[i];
            const progress = `${i + 1}/${urlsToScrape.length}`;
            
            console.log(`📖 [${progress}] Processing review...`);
            
            try {
                const reviewData = await scraper.scrapeReviewDetails(url);
                
                if (reviewData) {
                    await db.insertReview(reviewData);
                    successCount++;
                    console.log(`✅ [${progress}] ${reviewData.title}`);
                } else {
                    errorCount++;
                    console.log(`❌ [${progress}] Failed to extract data from ${url}`);
                }
                
                // Save progress every 5 reviews
                if ((i + 1) % 5 === 0) {
                    await scraper.saveData();
                    console.log(`💾 Progress saved (${successCount} successful, ${errorCount} failed)`);
                }
                
                // Add delay between reviews
                if (i < urlsToScrape.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, config.scraping.delays.betweenReviews));
                }
                
            } catch (error) {
                errorCount++;
                console.error(`❌ [${progress}] Error: ${error.message}`);
            }
        }
        
        // Download images
        console.log(`\n📸 Downloading images...`);
        await scraper.downloadAllImages();
        
        // Final save
        console.log('\n💾 Saving final data...');
        await scraper.saveData();
        
        // Show final statistics
        const stats = await db.getStats();
        const duration = Math.round((Date.now() - startTime) / 1000);
        
        console.log('\n🎉 Scraping completed!');
        console.log(`⏱️  Duration: ${duration} seconds`);
        console.log(`✅ Successful: ${successCount}`);
        console.log(`❌ Failed: ${errorCount}`);
        console.log(`📊 Total in database: ${stats.totalReviews} reviews`);
        console.log(`🏭 Manufacturers: ${stats.totalManufacturers}`);
        console.log(`🏍️  Models: ${stats.totalModels}`);
        console.log(`👥 Authors: ${stats.totalAuthors}`);
        console.log(`📸 Images: ${stats.totalImages}`);
        
        console.log('\n📁 Data saved to:');
        console.log(`   Database: ${config.database.path}`);
        console.log(`   JSON: ${config.output.directories.reviews}/all_reviews.json`);
        console.log(`   Images: ${config.output.directories.images}/`);
        
    } catch (error) {
        console.error('\n💥 Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        console.log('\n🧹 Cleaning up...');
        await scraper.closeBrowser();
        await db.close();
        console.log('✅ Cleanup complete');
        
        process.exit(0);
    }
}

// Show usage if no valid arguments
if (require.main === module) {
    console.log('Usage: node run_scraper.js [maxReviews] [maxPages]');
    console.log('Examples:');
    console.log('  node run_scraper.js          # Scrape all reviews');
    console.log('  node run_scraper.js 50       # Scrape first 50 reviews');
    console.log('  node run_scraper.js 50 3     # Scrape first 50 reviews from first 3 pages');
    console.log('');
    
    runProduction();
}
