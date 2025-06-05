const BennettsScraper = require('./scrapers/bennetts_scraper.js');
const BennettsDatabase = require('./scrapers/bennetts_database.js');

async function main() {
    console.log('🚀 Bennetts Scraper Demo\n');
    
    const db = new BennettsDatabase();
    
    try {
        // Initialize database
        console.log('📊 Setting up database...');
        await db.init();
        
        // Show current database stats
        const stats = await db.getStats();
        console.log('📈 Current Database Stats:');
        console.log(`   Reviews: ${stats.totalReviews}`);
        console.log(`   Manufacturers: ${stats.totalManufacturers}`);
        console.log(`   Models: ${stats.totalModels}`);
        console.log(`   Authors: ${stats.totalAuthors}`);
        console.log(`   Images: ${stats.totalImages}\n`);
        
        console.log('✅ Database is ready!');
        console.log('✅ Scraper classes are loaded and functional!');
        console.log('\n🎯 Next Steps:');
        console.log('   1. Run a limited scraping test with: node scrapers/bennetts_scraper.js 5');
        console.log('   2. Check the scraped_data directory for outputs');
        console.log('   3. Use the database methods to query results');
        
        console.log('\n📁 Data will be saved to:');
        console.log('   • ./scraped_data/reviews/all_reviews.json');
        console.log('   • ./scraped_data/database/bennetts_reviews.db');
        console.log('   • ./scraped_data/images/motorcycles/');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await db.close();
        console.log('\n👋 Demo completed');
        process.exit(0);
    }
}

main();
