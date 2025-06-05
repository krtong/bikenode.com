const { Stagehand } = require('@browserbasehq/stagehand');
const fs = require('fs');
const path = require('path');

/**
 * Test 2: Test scraping on all 20+ supported platforms
 * This test verifies the extension works on each supported platform
 */
async function testAllPlatforms() {
  console.log('🧪 Test 2: Testing All Supported Platforms\n');
  
  // Load universalScraper.js code
  const scraperPath = path.join(__dirname, 'universalScraper.js');
  const scraperCode = fs.readFileSync(scraperPath, 'utf8');
  
  // Platform test URLs - these are example listings for each platform
  const platforms = [
    {
      name: 'Craigslist',
      url: 'https://sfbay.craigslist.org/search/bik#search=1~gallery~0~0',
      searchSelector: '.gallery-card',
      expectedFields: ['title', 'price', 'location']
    },
    {
      name: 'Facebook Marketplace',
      url: 'https://www.facebook.com/marketplace/category/bicycles',
      searchSelector: '[role="main"]',
      expectedFields: ['title', 'price', 'location'],
      requiresLogin: true
    },
    {
      name: 'eBay',
      url: 'https://www.ebay.com/sch/i.html?_nkw=bicycle',
      searchSelector: '.s-item__link',
      expectedFields: ['title', 'price', 'shipping']
    },
    {
      name: 'OfferUp',
      url: 'https://offerup.com/search/?q=bicycle',
      searchSelector: 'a[href*="/item/"]',
      expectedFields: ['title', 'price', 'location']
    },
    {
      name: 'Mercari',
      url: 'https://www.mercari.com/search/?keyword=bicycle',
      searchSelector: '[data-testid="ItemContainer"]',
      expectedFields: ['title', 'price']
    },
    {
      name: 'PinkBike',
      url: 'https://www.pinkbike.com/buysell/',
      searchSelector: '.buysell-item',
      expectedFields: ['title', 'price', 'location']
    },
    {
      name: 'Gumtree (UK)',
      url: 'https://www.gumtree.com/search?search_category=bicycles',
      searchSelector: '.listing-link',
      expectedFields: ['title', 'price', 'location']
    },
    {
      name: 'Kijiji (Canada)',
      url: 'https://www.kijiji.ca/b-bikes/canada/c644l0',
      searchSelector: '[data-testid="listing-card"]',
      expectedFields: ['title', 'price', 'location']
    },
    {
      name: 'OLX',
      url: 'https://www.olx.com/items/q-bicycle',
      searchSelector: '[data-aut-id="itemBox"]',
      expectedFields: ['title', 'price', 'location']
    },
    {
      name: 'AutoTrader',
      url: 'https://www.autotrader.com/motorcycles',
      searchSelector: '.inventory-listing',
      expectedFields: ['title', 'price', 'mileage']
    }
  ];
  
  const stagehand = new Stagehand({
    env: 'LOCAL',
    verbose: false,
    headless: false
  });

  try {
    await stagehand.init();
    console.log('✅ Browser initialized\n');
    
    const results = [];
    
    for (const platform of platforms) {
      console.log(`\n📝 Testing ${platform.name}...`);
      
      try {
        // Navigate to the platform
        await stagehand.page.goto(platform.url, { waitUntil: 'networkidle' });
        await stagehand.page.waitForTimeout(2000); // Give page time to load
        
        // Check if login is required
        const currentUrl = await stagehand.page.url();
        if (platform.requiresLogin && (currentUrl.includes('login') || currentUrl.includes('signin'))) {
          console.log(`⚠️ ${platform.name} requires login - skipping`);
          results.push({ platform: platform.name, status: 'requires_login', data: null });
          continue;
        }
        
        // Try to find a listing
        const hasListings = await stagehand.page.locator(platform.searchSelector).first().isVisible().catch(() => false);
        
        if (!hasListings) {
          console.log(`⚠️ No listings found on ${platform.name}`);
          results.push({ platform: platform.name, status: 'no_listings', data: null });
          continue;
        }
        
        // Click on first listing
        await stagehand.page.locator(platform.searchSelector).first().click();
        await stagehand.page.waitForLoadState('networkidle');
        
        // Run the scraper
        const scrapedData = await stagehand.page.evaluate((code) => {
          eval(code);
          if (window.extractClassifiedAd) {
            return window.extractClassifiedAd();
          }
          return null;
        }, scraperCode);
        
        if (scrapedData) {
          console.log(`✅ Successfully scraped from ${platform.name}`);
          console.log(`   Title: ${scrapedData.title || 'N/A'}`);
          console.log(`   Price: ${scrapedData.price || 'N/A'}`);
          console.log(`   Images: ${scrapedData.images?.length || 0}`);
          
          // Check if expected fields were extracted
          const missingFields = platform.expectedFields.filter(field => !scrapedData[field]);
          if (missingFields.length > 0) {
            console.log(`   ⚠️ Missing fields: ${missingFields.join(', ')}`);
          }
          
          results.push({ 
            platform: platform.name, 
            status: 'success', 
            data: scrapedData,
            missingFields: missingFields
          });
        } else {
          console.log(`❌ Failed to scrape from ${platform.name}`);
          results.push({ platform: platform.name, status: 'failed', data: null });
        }
        
      } catch (error) {
        console.log(`❌ Error testing ${platform.name}: ${error.message}`);
        results.push({ platform: platform.name, status: 'error', error: error.message });
      }
    }
    
    // Summary
    console.log('\n\n📊 Test Summary:');
    console.log('================');
    
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const errors = results.filter(r => r.status === 'error').length;
    const loginRequired = results.filter(r => r.status === 'requires_login').length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Login Required: ${loginRequired}`);
    console.log(`🚫 Errors: ${errors}`);
    
    console.log('\nDetailed Results:');
    results.forEach(result => {
      const emoji = result.status === 'success' ? '✅' : 
                   result.status === 'requires_login' ? '🔒' :
                   result.status === 'no_listings' ? '⚠️' : '❌';
      console.log(`${emoji} ${result.platform}: ${result.status}`);
    });
    
    // Save results to file
    fs.writeFileSync(
      path.join(__dirname, 'test_results_platforms.json'), 
      JSON.stringify(results, null, 2)
    );
    console.log('\n💾 Results saved to test_results_platforms.json');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await stagehand.close();
    console.log('\n✅ Test 2 completed!');
  }
}

// Run the test
testAllPlatforms().catch(console.error);