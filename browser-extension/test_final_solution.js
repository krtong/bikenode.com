import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testFinalSolution() {
  console.log('=== FINAL CRAIGSLIST SOLUTION TEST ===\n');
  
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
    
    console.log('Page loaded.\n');
    
    // Test 1: Run scraper without clicking (should get 600x450)
    console.log('TEST 1: Scraping without interaction...');
    
    await page.evaluate(scraperCode);
    
    const results1 = await page.evaluate(async () => {
      const scraper = new DynamicScraper(document);
      return await scraper.extractAll();
    });
    
    console.log(`Images found: ${results1.images.length}`);
    const test1Large = results1.images.filter(img => img.includes('1200x900')).length;
    const test1Medium = results1.images.filter(img => img.includes('600x450')).length;
    console.log(`- 1200x900: ${test1Large}`);
    console.log(`- 600x450: ${test1Medium}`);
    
    // Test 2: Click main image then scrape (should get 1200x900)
    console.log('\nTEST 2: Clicking main image first...');
    
    await page.click('.slide.visible img, .slide.first img');
    console.log('Clicked main image, waiting for images to load...');
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const results2 = await page.evaluate(async () => {
      const scraper = new DynamicScraper(document);
      return await scraper.extractAll();
    });
    
    console.log(`Images found: ${results2.images.length}`);
    const test2Large = results2.images.filter(img => img.includes('1200x900')).length;
    const test2Medium = results2.images.filter(img => img.includes('600x450')).length;
    console.log(`- 1200x900: ${test2Large}`);
    console.log(`- 600x450: ${test2Medium}`);
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log('Without clicking: Gets 600x450 images');
    console.log('After clicking: Gets 1200x900 images');
    
    if (test2Large > 0) {
      console.log('\n✅ SUCCESS: The scraper correctly detects and extracts full-size images!');
      console.log('\nSOLUTION:');
      console.log('1. When user is on Craigslist, the extension can:');
      console.log('   - First click the main image to trigger 1200x900 loading');
      console.log('   - Then run the scraper to extract the full-size images');
      console.log('2. The scraper automatically detects which size images are available');
      console.log('3. It will extract 1200x900 if present, otherwise falls back to 600x450');
    } else {
      console.log('\n❌ ISSUE: Full-size images not extracted after click');
    }
    
    // Save both results for inspection
    await fs.writeFile('test1_no_click.json', JSON.stringify(results1, null, 2));
    await fs.writeFile('test2_after_click.json', JSON.stringify(results2, null, 2));
    
    console.log('\nResults saved to test1_no_click.json and test2_after_click.json');
    console.log('\nPress Ctrl+C to close...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testFinalSolution();