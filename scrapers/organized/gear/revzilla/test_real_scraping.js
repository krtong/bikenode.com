import RevZillaScraperV3 from './revzilla_scraper_v3.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testRealScraping() {
    console.log('🌐 Testing Real RevZilla Scraping (Careful Mode)\n');
    console.log('⚠️  This test will make real requests to RevZilla');
    console.log('⚠️  Using increased delays to avoid detection\n');
    
    const scraper = new RevZillaScraperV3({
        outputDir: path.join(__dirname, 'real_test_output'),
        // Conservative delays for testing
        delays: {
            betweenPages: 10000,      // 10 seconds
            betweenProducts: 8000,    // 8 seconds
            betweenCategories: 15000, // 15 seconds
            onError: 20000,          // 20 seconds
            maxRetryDelay: 120000    // 2 minutes
        },
        maxRetries: 2,
        batchSize: 3, // Very small batch
        browserRestartAfter: 10
    });
    
    try {
        await scraper.init();
        console.log('✅ Scraper initialized\n');
        
        // Test 1: Category Discovery
        console.log('🔍 Test 1: Discovering categories...');
        const categories = await scraper.discoverCategories();
        console.log(`✅ Found ${Object.keys(categories).length} categories`);
        console.log('   Categories:', Object.keys(categories).slice(0, 3).join(', '), '...\n');
        
        // Wait before next test
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Test 2: Scrape just the first page of helmets
        console.log('🔍 Test 2: Scraping first page of helmets...');
        const results = await scraper.scrapeCategory('motorcycle-helmets', {
            maxPages: 1,
            downloadImages: false // Skip images for testing
        });
        
        console.log(`✅ Scraped ${results.length} products`);
        console.log(`   Successful: ${results.filter(p => p.scrape_status === 'completed').length}`);
        console.log(`   Failed: ${results.filter(p => p.scrape_status === 'failed').length}\n`);
        
        // Show sample product
        const successfulProduct = results.find(p => p.scrape_status === 'completed');
        if (successfulProduct) {
            console.log('📦 Sample Product:');
            console.log(`   Name: ${successfulProduct.name}`);
            console.log(`   Brand: ${successfulProduct.brand}`);
            console.log(`   Price: $${successfulProduct.price.regular}`);
            console.log(`   In Stock: ${successfulProduct.price.in_stock}`);
            console.log(`   Rating: ${successfulProduct.rating.average} (${successfulProduct.rating.count} reviews)`);
            console.log(`   Features: ${successfulProduct.features.length} items`);
            console.log(`   Images: ${successfulProduct.images.gallery.length} found\n`);
        }
        
        // Test 3: Validate data quality
        console.log('🔍 Test 3: Validating data quality...');
        const validationReport = await scraper.validateData();
        console.log(`✅ Validation complete`);
        console.log(`   Total products: ${validationReport.totalProducts}`);
        console.log(`   Valid products: ${validationReport.validProducts}`);
        console.log(`   Validation rate: ${validationReport.validationRate}\n`);
        
        // Generate report
        await scraper.generateReport();
        console.log('📊 Report generated\n');
        
        // Clean up
        await scraper.cleanup();
        
        // Summary
        console.log('=' .repeat(50));
        console.log('✅ Real scraping test completed successfully!');
        console.log('=' .repeat(50));
        console.log('\nRecommendations:');
        console.log('1. Monitor for 403/503 errors (bot detection)');
        console.log('2. Use proxies for production scraping');
        console.log('3. Implement request queuing for large-scale operations');
        console.log('4. Add more sophisticated user-agent rotation');
        console.log('5. Consider implementing CAPTCHA solving if needed');
        
        // Check for any errors in state
        if (scraper.state.errors.length > 0) {
            console.log('\n⚠️  Errors encountered during scraping:');
            const topErrors = {};
            scraper.state.errors.forEach(err => {
                const key = err.message.substring(0, 50);
                topErrors[key] = (topErrors[key] || 0) + 1;
            });
            
            Object.entries(topErrors)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .forEach(([error, count]) => {
                    console.log(`   - ${error}: ${count} times`);
                });
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
        
        await scraper.cleanup();
        process.exit(1);
    }
}

// Add delay before starting
console.log('Starting test in 3 seconds...\n');
setTimeout(() => {
    testRealScraping().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}, 3000);