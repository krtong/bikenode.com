import RevZillaScraperV3 from './revzilla_scraper_v3.js';

async function quickTest() {
    console.log('🚀 Quick Test - RevZilla Scraper V3\n');
    
    // Test with mock data only
    const scraper = new RevZillaScraperV3({
        useMockData: true,
        outputDir: './test_output',
        delays: {
            betweenPages: 100,
            betweenProducts: 50,
            betweenCategories: 100
        }
    });
    
    try {
        await scraper.init();
        console.log('✅ Scraper initialized');
        
        // Test mock product generation
        const product = await scraper.scrapeProductDetails('https://test.com/product');
        console.log('✅ Generated mock product:', product.name);
        console.log('   Price:', `$${product.price.regular}`);
        console.log('   Brand:', product.brand);
        
        // Test category scraping with just 5 products
        await scraper.scrapeCategory('motorcycle-helmets', {
            maxPages: 1,
            downloadImages: false
        });
        
        console.log('✅ Category scraping completed');
        
        // Test deduplication
        const dedupStats = await scraper.runDeduplication();
        console.log('✅ Deduplication completed');
        
        await scraper.cleanup();
        console.log('\n✅ All tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await scraper.cleanup();
        process.exit(1);
    }
}

quickTest();