const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testCraigslistScraper() {
  console.log('Starting direct scraper test...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for faster testing
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Navigate to the Craigslist page
    const page = await browser.newPage();
    console.log('Navigating to Craigslist page...');
    await page.goto('https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html', {
      waitUntil: 'networkidle2'
    });

    // Wait for page to load
    await page.waitForSelector('.postingtitletext', { timeout: 10000 });
    console.log('Page loaded successfully\n');

    // Read and inject the universal scraper
    const scraperCode = fs.readFileSync(path.join(__dirname, 'universalScraper.js'), 'utf8');
    await page.evaluate(scraperCode);
    
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
    console.log(`Title: ${scrapedData.title}`);
    const titleCorrect = scrapedData.title.includes('2014 BMW R1200RT');
    console.log(titleCorrect ? '✓ Title extracted correctly' : '✗ ERROR: Title not extracted correctly');

    // Price check
    console.log(`\nPrice: ${scrapedData.price}`);
    const priceCorrect = scrapedData.price === '$7,000';
    console.log(priceCorrect ? '✓ Price extracted correctly' : '✗ ERROR: Price not extracted correctly');

    // Location check
    console.log(`\nLocation: ${scrapedData.location}`);
    const locationCorrect = scrapedData.location === 'santa cruz';
    if (!locationCorrect) {
      console.log(`✗ ERROR: Location should be "santa cruz", got "${scrapedData.location}"`);
    } else {
      console.log('✓ Location extracted correctly');
    }

    // Images check
    console.log(`\nImages found: ${scrapedData.images.length}`);
    const imageCountCorrect = scrapedData.images.length === 23;
    if (!imageCountCorrect) {
      console.log(`✗ ERROR: Should have 23 images, got ${scrapedData.images.length}`);
    } else {
      console.log('✓ Correct number of images');
    }

    // Check image URLs resolution
    console.log('\nChecking image resolutions...');
    const imageAnalysis = {
      thumbnails: [],
      mediumRes: [],
      fullRes: [],
      unknown: []
    };
    
    scrapedData.images.forEach(url => {
      if (url.includes('50x50c')) {
        imageAnalysis.thumbnails.push(url);
      } else if (url.includes('300x300')) {
        imageAnalysis.mediumRes.push(url);
      } else if (url.includes('600x450')) {
        imageAnalysis.mediumRes.push(url);
      } else if (url.includes('1200x900') || !url.match(/_\d+x\d+/)) {
        imageAnalysis.fullRes.push(url);
      } else {
        imageAnalysis.unknown.push(url);
      }
    });

    console.log(`- Thumbnails (50x50c): ${imageAnalysis.thumbnails.length}`);
    console.log(`- Medium res (300x300, 600x450): ${imageAnalysis.mediumRes.length}`);
    console.log(`- Full res (1200x900 or no size): ${imageAnalysis.fullRes.length}`);
    console.log(`- Unknown: ${imageAnalysis.unknown.length}`);
    
    if (imageAnalysis.thumbnails.length > 0) {
      console.log('\n✗ ERROR: Still extracting thumbnail images!');
    }
    
    console.log('\nSample image URLs:');
    scrapedData.images.slice(0, 3).forEach(url => console.log(`  - ${url}`));

    // Attributes check
    console.log('\n\nAttributes found:');
    console.log(JSON.stringify(scrapedData.attributes, null, 2));
    
    const expectedAttrs = {
      condition: 'excellent',
      odometer: '48,000',
      vin: 'WB10A1305EZ190344',
      year: '2014'
    };

    console.log('\nChecking expected attributes:');
    for (const [key, expected] of Object.entries(expectedAttrs)) {
      const actual = scrapedData.attributes[key] || 
                     scrapedData.attributes[key.toUpperCase()] ||
                     scrapedData.attributes[key.toLowerCase()];
      if (actual) {
        console.log(`✓ ${key}: ${actual}`);
      } else {
        console.log(`✗ ERROR: Missing ${key} (expected: ${expected})`);
      }
    }

    // Description check
    console.log(`\nDescription length: ${scrapedData.description.length} chars`);
    const descCorrect = scrapedData.description.includes('Recent Service');
    console.log(descCorrect ? '✓ Description extracted correctly' : '✗ ERROR: Description not extracted correctly');

    // Contact info check
    console.log(`\nContact phone: ${scrapedData.contact?.phone || 'Not found'}`);
    console.log(`Contact email: ${scrapedData.contact?.email || 'Not found'}`);

    console.log('\n=== TEST COMPLETE ===');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testCraigslistScraper();