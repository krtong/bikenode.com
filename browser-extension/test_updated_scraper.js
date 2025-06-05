import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testUpdatedScraper() {
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
    
    // Group images by size
    const imagesBySize = {};
    results.images.forEach((url, i) => {
      const sizeMatch = url.match(/(\d+x\d+)/);
      const size = sizeMatch ? sizeMatch[1] : 'unknown';
      if (!imagesBySize[size]) imagesBySize[size] = [];
      imagesBySize[size].push(url);
    });
    
    Object.entries(imagesBySize).forEach(([size, urls]) => {
      console.log(`\n${size}: ${urls.length} images`);
      if (size === '1200x900') {
        urls.slice(0, 3).forEach(url => {
          console.log(`  - ${url}`);
        });
        if (urls.length > 3) {
          console.log(`  ... and ${urls.length - 3} more`);
        }
      }
    });
    
    console.log('\nAttributes:');
    Object.entries(results.attributes).slice(0, 5).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log('\nExtraction time:', results.extractionTime + 'ms');
    
    // Verify we got 1200x900 images
    const largeImages = results.images.filter(img => img.includes('1200x900'));
    if (largeImages.length > 0) {
      console.log('\n✅ SUCCESS: Found', largeImages.length, 'full-size (1200x900) images!');
    } else {
      console.log('\n❌ FAIL: No 1200x900 images found');
    }
    
    // Save results
    await fs.writeFile(
      'updated_scraper_results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\nFull results saved to updated_scraper_results.json');
    
    console.log('\nPress Ctrl+C to close...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testUpdatedScraper();