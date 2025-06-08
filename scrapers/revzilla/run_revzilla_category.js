import RevZillaScraper from './revzilla_scraper.js';

async function main() {
    const category = process.argv[2];
    
    if (!category) {
        console.error('Please provide a category as an argument');
        console.error('Example: node run_revzilla_category.js motorcycle-helmets');
        process.exit(1);
    }
    
    const scraper = new RevZillaScraper();
    
    try {
        await scraper.init();
        
        await scraper.scrapeCategory(category, {
            maxPages: 1,
            includeDetails: true,
            downloadImages: true
        });
        
    } catch (error) {
        console.error('Scraping error:', error);
    } finally {
        await scraper.close();
    }
}

main();