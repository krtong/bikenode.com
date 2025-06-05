import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testWithClickFirst() {
  console.log('=== TESTING CLICK-THEN-SCRAPE APPROACH ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false
  });

  try {
    const page = await browser.newPage();
    
    // Load both scrapers
    const dynamicScraperCode = await fs.readFile(path.join(__dirname, 'dynamicScraperV2.js'), 'utf8');
    const fullSizeScraperCode = await fs.readFile(path.join(__dirname, 'craigslistFullSizeScraper.js'), 'utf8');
    
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });
    
    console.log('Page loaded.\n');
    
    // Step 1: Click forward arrow then main image (like in successful test)
    console.log('STEP 1: Clicking to trigger 1200x900 images...');
    
    await page.evaluate(() => {
      // Click forward arrow
      const forwardArrow = document.querySelector('.slider-forward.arrow');
      if (forwardArrow) {
        console.log('Clicking forward arrow...');
        forwardArrow.click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await page.evaluate(() => {
      // Click main image
      const mainImage = document.querySelector('.slide.visible img');
      if (mainImage) {
        console.log('Clicking main image...');
        mainImage.click();
      }
    });
    
    console.log('Waiting for images to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 2: Check what images are in DOM
    const imageCheck = await page.evaluate(() => {
      const allImages = document.querySelectorAll('.slide img');
      const largeImages = document.querySelectorAll('.slide img[src*="1200x900"]');
      const mediumImages = document.querySelectorAll('.slide img[src*="600x450"]');
      
      return {
        total: allImages.length,
        large: largeImages.length,
        medium: mediumImages.length,
        firstLarge: largeImages[0]?.src || 'none',
        firstMedium: mediumImages[0]?.src || 'none'
      };
    });
    
    console.log('\nImage check after clicks:', imageCheck);
    
    // Step 3: Run the scraper
    console.log('\nSTEP 2: Running dynamic scraper V2...');
    
    await page.evaluate(dynamicScraperCode);
    
    const results = await page.evaluate(async () => {
      const scraper = new DynamicScraper(document);
      return await scraper.extractAll();
    });
    
    console.log('\nSCRAPER RESULTS:');
    console.log(`Title: ${results.title}`);
    console.log(`Images found: ${results.images.length}`);
    
    if (results.images.length > 0) {
      console.log('\nExtracted images:');
      results.images.slice(0, 5).forEach((url, i) => {
        console.log(`${i + 1}. ${url}`);
      });
      if (results.images.length > 5) {
        console.log(`... and ${results.images.length - 5} more`);
      }
    }
    
    // Step 4: Test the full-size scraper
    console.log('\n\nSTEP 3: Testing CraigslistFullSizeScraper...');
    
    await page.evaluate(fullSizeScraperCode);
    
    const fullSizeResults = await page.evaluate(async () => {
      const scraper = new CraigslistFullSizeScraper(document);
      return await scraper.extractFullSizeImages();
    });
    
    console.log(`Full-size scraper found: ${fullSizeResults.length} images`);
    
    // Summary
    console.log('\n=== SUMMARY ===');
    if (results.images.length > 0 && results.images[0].includes('1200x900')) {
      console.log('✅ SUCCESS: Dynamic scraper V2 extracted full-size images!');
    } else {
      console.log('❌ FAIL: Dynamic scraper V2 did not get full-size images');
    }
    
    if (fullSizeResults.length > 0) {
      console.log('✅ Full-size scraper found images after interaction');
    }
    
    // Save results
    await fs.writeFile('click_first_results.json', JSON.stringify({
      imageCheck,
      scraperResults: results,
      fullSizeResults
    }, null, 2));
    
    console.log('\nResults saved to click_first_results.json');
    console.log('\nPress Ctrl+C to close...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testWithClickFirst();