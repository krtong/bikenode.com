import RevZillaScraper from './revzilla_scraper.js';

async function testMinimal() {
    const scraper = new RevZillaScraper();
    
    try {
        console.log('Initializing scraper...');
        await scraper.init();
        
        console.log('Testing scraping motorcycle helmets (1 page only)...');
        const products = await scraper.scrapeCategory('motorcycle-helmets', {
            maxPages: 1,
            includeDetails: false,  // Skip details for faster testing
            downloadImages: false   // Skip image downloads for now
        });
        
        console.log(`\nScraped ${products.length} products`);
        
        // Display first 3 products
        console.log('\nFirst 3 products:');
        products.slice(0, 3).forEach((product, index) => {
            console.log(`\n${index + 1}. ${product.brand} - ${product.name}`);
            console.log(`   Price: ${product.price}`);
            console.log(`   Rating: ${product.rating || 'N/A'}`);
            console.log(`   URL: ${product.url}`);
        });
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        console.log('\nClosing browser...');
        await scraper.close();
    }
}

testMinimal();