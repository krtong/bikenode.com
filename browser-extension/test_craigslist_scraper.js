const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function testCraigslistScraper() {
  console.log('=== TESTING UPDATED CRAIGSLIST SCRAPER ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false
  });

  try {
    const page = await browser.newPage();
    
    // Load the dynamic scraper
    const scraperCode = await fs.readFile(path.join(__dirname, 'dynamicScraper.js'), 'utf8');
    
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });
    
    console.log('Page loaded. Injecting scraper...\n');
    
    // Inject and run the scraper
    await page.evaluate(scraperCode);
    
    const results = await page.evaluate(async () => {
      const scraper = new DynamicScraper(document);
      return await scraper.extractAll();
    });
    
    console.log('SCRAPER RESULTS:');
    console.log(`Title: ${results.title}`);
    console.log(`Price: ${results.price}`);
    console.log(`Location: ${results.location}`);
    console.log(`Images found: ${results.images.length}`);
    
    console.log('\nImage URLs:');
    results.images.forEach((url, i) => {
      const sizeMatch = url.match(/\d+x\d+/);
      const size = sizeMatch ? sizeMatch[0] : 'no size';
      console.log(`${i + 1}. [${size}] ${url}`);
    });
    
    console.log('\nAttributes:');
    Object.entries(results.attributes).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log('\nCategory:', results.category);
    console.log('Extraction time:', results.extractionTime + 'ms');
    
    // Save results for inspection
    await fs.writeFile(
      'craigslist_scraper_results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\nFull results saved to craigslist_scraper_results.json');
    
    // Test another listing
    console.log('\n\n=== TESTING ANOTHER LISTING ===\n');
    
    await page.goto('https://sfbay.craigslist.org/pen/mcy/d/south-san-francisco-2019-yamaha-mt-07/7855748223.html', {
      waitUntil: 'networkidle2'
    });
    
    const results2 = await page.evaluate(async () => {
      const scraper = new DynamicScraper(document);
      return await scraper.extractAll();
    });
    
    console.log('SECOND LISTING RESULTS:');
    console.log(`Title: ${results2.title}`);
    console.log(`Price: ${results2.price}`);
    console.log(`Images found: ${results2.images.length}`);
    
    console.log('\nPress Ctrl+C to close...');
    await new Promise(() => {}); // Keep browser open
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCraigslistScraper();