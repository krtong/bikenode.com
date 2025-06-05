import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testCompleteSolution() {
  console.log('=== TESTING COMPLETE SOLUTION ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false
  });

  try {
    const page = await browser.newPage();
    
    // Load the scraper
    const scraperCode = await fs.readFile(path.join(__dirname, 'dynamicScraperV2.js'), 'utf8');
    
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });
    
    console.log('Page loaded.\n');
    
    // Replicate the EXACT sequence from test_craigslist_final.js
    console.log('STEP 1: Replicating successful click sequence...');
    
    // Click forward arrow
    await page.click('.slider-forward.arrow');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Click on the visible slide image
    console.log('Clicking on the visible slide image...');
    await page.click('.slide.visible img');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check what's in the DOM now
    const domCheck = await page.evaluate(() => {
      const allImages = document.querySelectorAll('img');
      const craigslistImages = Array.from(allImages).filter(img => img.src.includes('craigslist'));
      
      const bySize = {};
      craigslistImages.forEach(img => {
        const sizeMatch = img.src.match(/(\d+x\d+)/);
        const size = sizeMatch ? sizeMatch[1] : 'unknown';
        if (!bySize[size]) bySize[size] = 0;
        bySize[size]++;
      });
      
      return {
        total: craigslistImages.length,
        bySize: bySize,
        largeImages: document.querySelectorAll('.slide img[src*="1200x900"]').length
      };
    });
    
    console.log('\nDOM check after clicks:', domCheck);
    
    // Now run the scraper
    console.log('\nSTEP 2: Running scraper...');
    
    await page.evaluate(scraperCode);
    
    const results = await page.evaluate(async () => {
      const scraper = new DynamicScraper(document);
      return await scraper.extractAll();
    });
    
    console.log('\nSCRAPER RESULTS:');
    console.log(`Title: ${results.title}`);
    console.log(`Price: ${results.price}`);
    console.log(`Location: ${results.location}`);
    console.log(`Images found: ${results.images.length}`);
    
    // Check image sizes
    const imageSizes = {};
    results.images.forEach(url => {
      const sizeMatch = url.match(/(\d+x\d+)/);
      const size = sizeMatch ? sizeMatch[1] : 'unknown';
      if (!imageSizes[size]) imageSizes[size] = 0;
      imageSizes[size]++;
    });
    
    console.log('\nImage sizes extracted:');
    Object.entries(imageSizes).forEach(([size, count]) => {
      console.log(`  ${size}: ${count} images`);
    });
    
    if (results.images.length > 0) {
      console.log('\nFirst 3 images:');
      results.images.slice(0, 3).forEach((url, i) => {
        console.log(`  ${i + 1}. ${url}`);
      });
    }
    
    // Summary
    console.log('\n=== FINAL VERDICT ===');
    if (results.images.length === 23 && results.images[0].includes('1200x900')) {
      console.log('✅ SUCCESS: Scraper extracted all 23 full-size (1200x900) images!');
    } else if (results.images.length > 0 && results.images[0].includes('1200x900')) {
      console.log(`⚠️ PARTIAL SUCCESS: Got ${results.images.length} full-size images (expected 23)`);
    } else {
      console.log(`❌ FAIL: Got ${results.images.length} images, none are 1200x900`);
    }
    
    // Save complete results
    await fs.writeFile('complete_solution_results.json', JSON.stringify({
      domCheck,
      results,
      success: results.images.length === 23 && results.images[0].includes('1200x900')
    }, null, 2));
    
    console.log('\nResults saved to complete_solution_results.json');
    console.log('\nPress Ctrl+C to close...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCompleteSolution();