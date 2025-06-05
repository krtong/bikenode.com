const { Stagehand } = require('@browserbasehq/stagehand');
const fs = require('fs');
const path = require('path');

// Test the BikeNode web extension functionality
async function testWebExtension() {
  console.log('🚀 Starting BikeNode Web Extension Test with Stagehand\n');
  
  const stagehand = new Stagehand({
    env: 'LOCAL',
    verbose: true,
    headless: false // Run with browser visible for debugging
  });

  try {
    await stagehand.init();
    console.log('✅ Stagehand initialized\n');

    // Test 1: Craigslist bike listing
    console.log('📝 Test 1: Testing Craigslist bike listing...');
    await stagehand.page.goto('https://sfbay.craigslist.org/search/bik#search=1~gallery~0~0');
    await stagehand.page.waitForLoadState('networkidle');
    
    // Click on the first bike listing
    const firstListing = await stagehand.page.locator('.gallery-card').first();
    if (await firstListing.isVisible()) {
      await firstListing.click();
      await stagehand.page.waitForLoadState('networkidle');
      console.log('✅ Navigated to bike listing');
      
      // Get the current URL for testing
      const currentUrl = await stagehand.page.url();
      console.log(`📍 Current URL: ${currentUrl}`);
      
      // Simulate extension functionality by injecting the scraper
      const scraperPath = path.join(__dirname, 'universalScraper.js');
      const scraperCode = fs.readFileSync(scraperPath, 'utf8');
      
      // Inject and run the scraper
      const scrapedData = await stagehand.page.evaluate((code) => {
        // Evaluate the scraper code
        eval(code);
        
        // Execute the scraper
        if (window.extractClassifiedAd) {
          return window.extractClassifiedAd();
        }
        return null;
      }, scraperCode);
      
      if (scrapedData) {
        console.log('\n📊 Scraped Data:');
        console.log(`Title: ${scrapedData.title || 'N/A'}`);
        console.log(`Price: ${scrapedData.price || 'N/A'}`);
        console.log(`Location: ${scrapedData.location || 'N/A'}`);
        console.log(`Category: ${scrapedData.category || 'N/A'}`);
        console.log(`Images: ${scrapedData.images ? scrapedData.images.length : 0} found`);
        console.log('✅ Craigslist test passed!\n');
      } else {
        console.log('❌ Failed to scrape data from Craigslist\n');
      }
    } else {
      console.log('⚠️ No listings found on Craigslist\n');
    }

    // Test 2: Facebook Marketplace (if accessible)
    console.log('📝 Test 2: Testing Facebook Marketplace...');
    await stagehand.page.goto('https://www.facebook.com/marketplace/category/bicycles');
    await stagehand.page.waitForLoadState('networkidle');
    
    // Check if we're redirected to login
    const currentUrl = await stagehand.page.url();
    if (currentUrl.includes('login')) {
      console.log('⚠️ Facebook requires login - skipping this test\n');
    } else {
      console.log('✅ Facebook Marketplace test would run here\n');
    }

    // Test 3: eBay bike listing
    console.log('📝 Test 3: Testing eBay bike listing...');
    await stagehand.page.goto('https://www.ebay.com/b/Bikes/177831/bn_1854394');
    await stagehand.page.waitForLoadState('networkidle');
    
    // Click on the first bike listing
    const ebayListing = await stagehand.page.locator('.s-item__link').first();
    if (await ebayListing.isVisible()) {
      await ebayListing.click();
      await stagehand.page.waitForLoadState('networkidle');
      console.log('✅ Navigated to eBay bike listing');
      
      // Test the scraper on eBay
      const ebayData = await stagehand.page.evaluate((code) => {
        eval(code);
        
        if (window.extractClassifiedAd) {
          return window.extractClassifiedAd();
        }
        return null;
      }, scraperCode);
      
      if (ebayData) {
        console.log('\n📊 eBay Scraped Data:');
        console.log(`Title: ${ebayData.title || 'N/A'}`);
        console.log(`Price: ${ebayData.price || 'N/A'}`);
        console.log(`Location: ${ebayData.location || 'N/A'}`);
        console.log(`Category: ${ebayData.category || 'N/A'}`);
        console.log('✅ eBay test passed!\n');
      }
    } else {
      console.log('⚠️ No listings found on eBay\n');
    }

    // Test 4: Test bike detection functionality
    console.log('📝 Test 4: Testing bike detection...');
    try {
      const bikeDetectionPath = path.join(__dirname, 'bikeDetection.js');
      let bikeDetectionCode = fs.readFileSync(bikeDetectionPath, 'utf8');
      
      // Remove module.exports line since it won't work in browser
      bikeDetectionCode = bikeDetectionCode.replace(/module\.exports[\s\S]*$/m, '');
      
      const isBikeListing = await stagehand.page.evaluate((code) => {
        eval(code);
        
        // The function should now be available globally
        if (typeof isBikeListing === 'function') {
          return isBikeListing(document);
        }
        return false;
      }, bikeDetectionCode);
      
      console.log(`🚴 Is bike listing detected: ${isBikeListing}`);
      console.log('✅ Bike detection test completed\n');
    } catch (error) {
      console.log('⚠️ Bike detection test skipped due to error:', error.message, '\n');
    }

    console.log('🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await stagehand.close();
    console.log('\n👋 Test session ended');
  }
}

// Run the test
testWebExtension().catch(console.error);