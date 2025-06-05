const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function searchAndTestCraigslist() {
  console.log('=== TESTING MULTIPLE CRAIGSLIST PAGES ===\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // First, go to Craigslist bikes section
    console.log('1. Searching for bike listings on Craigslist...');
    await page.goto('https://sfbay.craigslist.org/search/bia#search=1~gallery~0~0', {
      waitUntil: 'networkidle2'
    });
    
    // Get listing URLs
    const listingUrls = await page.evaluate(() => {
      const links = document.querySelectorAll('.result-row .result-title');
      return Array.from(links).slice(0, 5).map(link => link.href); // Get first 5 listings
    });
    
    console.log(`Found ${listingUrls.length} listings to test\n`);
    
    // Read scraper code
    const scraperCode = fs.readFileSync(path.join(__dirname, 'universalScraper.js'), 'utf8');
    
    const results = [];
    
    // Test each listing
    for (let i = 0; i < listingUrls.length; i++) {
      console.log(`\n--- Testing listing ${i + 1}/${listingUrls.length} ---`);
      console.log(`URL: ${listingUrls[i]}`);
      
      const listingPage = await browser.newPage();
      
      try {
        await listingPage.goto(listingUrls[i], {
          waitUntil: 'networkidle2'
        });
        
        // Wait for content
        await listingPage.waitForSelector('.postingtitletext', { timeout: 5000 }).catch(() => {});
        
        // Inject and run scraper
        await listingPage.evaluate(scraperCode);
        const data = await listingPage.evaluate(() => extractClassifiedAd());
        
        // Analyze results
        const result = {
          url: listingUrls[i],
          title: data.title,
          price: data.price,
          location: data.location,
          imageCount: data.images ? data.images.length : 0,
          hasFullResImages: false,
          hasThumbnails: false,
          attributes: data.attributes || {},
          errors: []
        };
        
        // Check image quality
        if (data.images && data.images.length > 0) {
          result.hasFullResImages = data.images.some(url => 
            !url.includes('50x50') && !url.includes('300x300') && !url.includes('600x450')
          );
          result.hasThumbnails = data.images.some(url => 
            url.includes('50x50') || url.includes('300x300') || url.includes('600x450')
          );
        }
        
        // Validate data
        if (!result.title) result.errors.push('No title found');
        if (!result.price) result.errors.push('No price found');
        if (!result.location || result.location === 'google map') result.errors.push('Location not properly extracted');
        if (result.hasThumbnails) result.errors.push('Contains thumbnail images');
        if (result.imageCount === 0) result.errors.push('No images found');
        
        // Print results
        console.log(`Title: ${result.title || 'NOT FOUND'}`);
        console.log(`Price: ${result.price || 'NOT FOUND'}`);
        console.log(`Location: ${result.location || 'NOT FOUND'}`);
        console.log(`Images: ${result.imageCount} (Full res: ${result.hasFullResImages ? 'Yes' : 'No'})`);
        console.log(`Attributes: ${Object.keys(result.attributes).length} found`);
        
        if (result.errors.length > 0) {
          console.log(`❌ Issues found:`);
          result.errors.forEach(err => console.log(`   - ${err}`));
        } else {
          console.log(`✅ All checks passed`);
        }
        
        results.push(result);
        
      } catch (error) {
        console.error(`Error testing listing: ${error.message}`);
      } finally {
        await listingPage.close();
      }
    }
    
    // Summary
    console.log('\n\n=== SUMMARY ===');
    const successCount = results.filter(r => r.errors.length === 0).length;
    console.log(`Total tested: ${results.length}`);
    console.log(`Fully successful: ${successCount}`);
    console.log(`With issues: ${results.length - successCount}`);
    
    // Common issues
    const allErrors = results.flatMap(r => r.errors);
    const errorCounts = {};
    allErrors.forEach(err => {
      errorCounts[err] = (errorCounts[err] || 0) + 1;
    });
    
    console.log('\nCommon issues:');
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`- ${error}: ${count} times`);
    });
    
    // Save results
    fs.writeFileSync('craigslist_test_results.json', JSON.stringify(results, null, 2));
    console.log('\nDetailed results saved to craigslist_test_results.json');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Test other platforms
async function testOtherPlatforms() {
  console.log('\n\n=== TESTING OTHER PLATFORMS ===\n');
  
  const testUrls = {
    'OfferUp': 'https://offerup.com/',
    'Facebook Marketplace': 'https://www.facebook.com/marketplace/',
    'Mercari': 'https://www.mercari.com/'
  };
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const scraperCode = fs.readFileSync(path.join(__dirname, 'universalScraper.js'), 'utf8');
    
    for (const [platform, url] of Object.entries(testUrls)) {
      console.log(`\nTesting ${platform}...`);
      const page = await browser.newPage();
      
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.evaluate(scraperCode);
        
        // Try to extract from homepage (won't find listings but tests scraper doesn't crash)
        const data = await page.evaluate(() => extractClassifiedAd());
        
        console.log(`- Title: ${data.title || 'Not found'}`);
        console.log(`- Category detected: ${data.category}`);
        console.log(`- Domain: ${data.domain}`);
        console.log(`- Error: ${data.error || 'None'}`);
        
      } catch (error) {
        console.log(`- Error: ${error.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}

// Run all tests
async function runAllTests() {
  await searchAndTestCraigslist();
  await testOtherPlatforms();
}

runAllTests();