const puppeteer = require('puppeteer');
const fs = require('fs');

async function testDynamicScraper() {
  console.log('=== TESTING DYNAMIC SCRAPER ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    console.log('Loading Craigslist listing...');
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });
    
    // Inject the dynamic scraper
    const scraperCode = fs.readFileSync('dynamicScraper.js', 'utf8');
    await page.evaluate(scraperCode);
    
    console.log('Running dynamic extraction...');
    const data = await page.evaluate(async () => {
      return await extractClassifiedAd();
    });
    
    console.log('\nExtraction Results:');
    console.log('Title:', data.title);
    console.log('Price:', data.price);
    console.log('Location:', data.location);
    console.log('Category:', data.category);
    console.log('Images found:', data.images.length);
    
    console.log('\nImage URLs:');
    data.images.slice(0, 5).forEach((url, i) => {
      console.log(`${i+1}. ${url}`);
    });
    
    if (data.images.length > 5) {
      console.log(`... and ${data.images.length - 5} more`);
    }
    
    // Check what types of images we got
    const has600x450 = data.images.some(url => url.includes('600x450'));
    const uniqueSizes = new Set();
    data.images.forEach(url => {
      const sizeMatch = url.match(/(\d+x\d+)/);
      if (sizeMatch) uniqueSizes.add(sizeMatch[1]);
    });
    
    console.log('\nImage Analysis:');
    console.log('Contains 600x450:', has600x450 ? 'YES' : 'NO');
    console.log('Unique sizes found:', Array.from(uniqueSizes).join(', ') || 'No size patterns');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    console.log('\nPress Ctrl+C to close browser...');
    // Keep browser open to see results
    await new Promise(() => {});
  }
}

testDynamicScraper();