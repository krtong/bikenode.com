const puppeteer = require('puppeteer');
const path = require('path');

async function testCraigslistScraper() {
  console.log('Starting automated scraper test...\n');
  
  const extensionPath = path.join(__dirname);
  
  // Launch Chrome with the extension
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  try {
    // Get the extension ID
    const targets = await browser.targets();
    const extensionTarget = targets.find(target => target.type() === 'service_worker');
    
    if (!extensionTarget) {
      throw new Error('Extension not loaded');
    }

    // Navigate to the Craigslist page
    const page = await browser.newPage();
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });

    // Wait for page to load
    await page.waitForSelector('.postingtitletext', { timeout: 10000 });

    // Inject and run the universal scraper
    await page.addScriptTag({ path: path.join(__dirname, 'universalScraper.js') });
    
    // Extract data using the scraper
    const scrapedData = await page.evaluate(() => {
      if (typeof extractClassifiedAd === 'function') {
        return extractClassifiedAd();
      }
      throw new Error('Scraper not loaded');
    });

    // Validate the results
    console.log('=== SCRAPER TEST RESULTS ===\n');
    
    // Title check
    console.log(`✓ Title: ${scrapedData.title}`);
    if (!scrapedData.title.includes('2014 BMW R1200RT')) {
      console.error('✗ ERROR: Title not extracted correctly');
    }

    // Price check
    console.log(`✓ Price: ${scrapedData.price}`);
    if (scrapedData.price !== '$7,000') {
      console.error('✗ ERROR: Price not extracted correctly');
    }

    // Location check
    console.log(`✓ Location: ${scrapedData.location}`);
    if (scrapedData.location !== 'santa cruz') {
      console.error(`✗ ERROR: Location should be "santa cruz", got "${scrapedData.location}"`);
    }

    // Images check
    console.log(`\n✓ Images found: ${scrapedData.images.length}`);
    if (scrapedData.images.length !== 23) {
      console.error(`✗ ERROR: Should have 23 images, got ${scrapedData.images.length}`);
    }

    // Check image URLs are full resolution
    const thumbnailCount = scrapedData.images.filter(url => 
      url.includes('50x50c') || url.includes('300x300') || url.includes('600x450')
    ).length;
    
    if (thumbnailCount > 0) {
      console.error(`✗ ERROR: Found ${thumbnailCount} thumbnail images instead of full resolution`);
      console.log('\nSample image URLs:');
      scrapedData.images.slice(0, 3).forEach(url => console.log(`  - ${url}`));
    } else {
      console.log('✓ All images are full resolution');
    }

    // Attributes check
    console.log('\n✓ Attributes:');
    const expectedAttrs = {
      condition: 'excellent',
      odometer: '48,000',
      vin: 'WB10A1305EZ190344',
      year: '2014'
    };

    for (const [key, expected] of Object.entries(expectedAttrs)) {
      const actual = scrapedData.attributes[key] || scrapedData.attributes[key.toUpperCase()];
      if (actual) {
        console.log(`  ✓ ${key}: ${actual}`);
      } else {
        console.error(`  ✗ ERROR: Missing ${key} (expected: ${expected})`);
      }
    }

    // Description check
    console.log(`\n✓ Description length: ${scrapedData.description.length} chars`);
    if (!scrapedData.description.includes('Recent Service')) {
      console.error('✗ ERROR: Description not extracted correctly');
    }

    console.log('\n=== TEST COMPLETE ===');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testCraigslistScraper();