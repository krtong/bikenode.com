const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test cases for different platforms and scenarios
const testCases = [
  {
    name: 'Craigslist - Motorcycle',
    url: 'https://sfbay.craigslist.org/scz/mcy/d/santa-cruz-2014-bmw-r1200rt-motorcycle/7855748254.html',
    expectedData: {
      title: '2014 BMW R1200RT',
      price: '$7,000',
      location: 'santa cruz',
      imageCount: 23,
      attributes: {
        condition: 'excellent',
        odometer: '48,000',
        vin: 'WB10A1305EZ190344'
      }
    }
  },
  {
    name: 'Craigslist - Bicycle',
    url: 'https://sfbay.craigslist.org/pen/bik/d/redwood-city-trek-domane-sl5-disc-56cm/7855123456.html',
    expectedData: {
      title: 'Trek Domane',
      price: null, // Will check if exists
      location: null,
      imageCount: null,
      attributes: {}
    }
  },
  {
    name: 'Facebook Marketplace',
    url: 'https://www.facebook.com/marketplace/item/1234567890',
    expectedData: {
      title: null,
      price: null,
      location: null,
      imageCount: null,
      attributes: {}
    }
  },
  {
    name: 'eBay',
    url: 'https://www.ebay.com/itm/123456789',
    expectedData: {
      title: null,
      price: null,
      location: null,
      imageCount: null,
      attributes: {}
    }
  },
  {
    name: 'Pinkbike',
    url: 'https://www.pinkbike.com/buysell/1234567/',
    expectedData: {
      title: null,
      price: null,
      location: null,
      imageCount: null,
      attributes: {}
    }
  }
];

async function testMultipleSites() {
  console.log('Starting multi-site scraper test...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = {
    passed: 0,
    failed: 0,
    errors: [],
    details: []
  };

  try {
    // Read the universal scraper code
    const scraperCode = fs.readFileSync(path.join(__dirname, 'universalScraper.js'), 'utf8');
    
    for (const testCase of testCases) {
      console.log(`\n=== Testing: ${testCase.name} ===`);
      console.log(`URL: ${testCase.url}`);
      
      const page = await browser.newPage();
      const testResult = {
        name: testCase.name,
        url: testCase.url,
        status: 'pending',
        errors: []
      };
      
      try {
        // Set timeout for navigation
        await page.goto(testCase.url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        }).catch(e => {
          console.log(`⚠️  Could not load ${testCase.name} - URL might be invalid`);
          testResult.status = 'skipped';
          testResult.errors.push('Could not load page');
        });

        if (testResult.status !== 'skipped') {
          // Wait a bit for dynamic content
          await page.waitForTimeout(2000);
          
          // Inject the scraper
          await page.evaluate(scraperCode);
          
          // Extract data
          const scrapedData = await page.evaluate(() => {
            if (typeof extractClassifiedAd === 'function') {
              return extractClassifiedAd();
            }
            throw new Error('Scraper not loaded');
          });

          // Validate results
          console.log('\nExtracted data:');
          console.log(`- Title: ${scrapedData.title || 'Not found'}`);
          console.log(`- Price: ${scrapedData.price || 'Not found'}`);
          console.log(`- Location: ${scrapedData.location || 'Not found'}`);
          console.log(`- Images: ${scrapedData.images ? scrapedData.images.length : 0}`);
          console.log(`- Category: ${scrapedData.category || 'Not detected'}`);
          
          // Check for errors
          if (scrapedData.error) {
            testResult.errors.push(`Scraper error: ${scrapedData.error}`);
          }
          
          // Validate against expected data if provided
          if (testCase.expectedData.title && scrapedData.title) {
            if (!scrapedData.title.includes(testCase.expectedData.title)) {
              testResult.errors.push(`Title mismatch: expected "${testCase.expectedData.title}", got "${scrapedData.title}"`);
            }
          }
          
          if (testCase.expectedData.price && scrapedData.price !== testCase.expectedData.price) {
            testResult.errors.push(`Price mismatch: expected "${testCase.expectedData.price}", got "${scrapedData.price}"`);
          }
          
          // Check image quality
          if (scrapedData.images && scrapedData.images.length > 0) {
            const thumbnailCount = scrapedData.images.filter(url => 
              url.includes('thumb') || url.includes('50x50') || url.includes('300x300') || url.includes('600x450')
            ).length;
            
            if (thumbnailCount > 0) {
              testResult.errors.push(`Found ${thumbnailCount} thumbnail images instead of full resolution`);
            }
            
            console.log(`\nSample images:`);
            scrapedData.images.slice(0, 3).forEach(url => console.log(`  - ${url}`));
          }
          
          // Store full result
          testResult.data = scrapedData;
          testResult.status = testResult.errors.length === 0 ? 'passed' : 'failed';
        }
        
      } catch (error) {
        console.error(`Error testing ${testCase.name}:`, error.message);
        testResult.status = 'error';
        testResult.errors.push(error.message);
      } finally {
        await page.close();
      }
      
      // Update results
      if (testResult.status === 'passed') {
        results.passed++;
        console.log(`\n✅ ${testCase.name}: PASSED`);
      } else if (testResult.status === 'failed') {
        results.failed++;
        console.log(`\n❌ ${testCase.name}: FAILED`);
        testResult.errors.forEach(err => console.log(`   - ${err}`));
      } else if (testResult.status === 'error') {
        results.failed++;
        console.log(`\n🔥 ${testCase.name}: ERROR`);
      } else {
        console.log(`\n⏭️  ${testCase.name}: SKIPPED`);
      }
      
      results.details.push(testResult);
    }

  } catch (error) {
    console.error('Test suite failed:', error);
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n\n=== TEST SUMMARY ===');
  console.log(`Total tests: ${testCases.length}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Skipped: ${results.details.filter(r => r.status === 'skipped').length}`);
  
  // Save detailed results
  fs.writeFileSync(
    path.join(__dirname, 'test_results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('\nDetailed results saved to test_results.json');
}

// Additional edge case tests
async function testEdgeCases() {
  console.log('\n\n=== EDGE CASE TESTS ===\n');
  
  const edgeCases = [
    {
      name: 'Page with no images',
      html: '<html><body><h1>Test Item - $100</h1><p>Description here</p></body></html>'
    },
    {
      name: 'Page with mixed image sizes',
      html: `<html><body>
        <h1>Bike for Sale - $500</h1>
        <img src="http://example.com/thumb_50x50.jpg">
        <img src="http://example.com/medium_600x450.jpg">
        <img src="http://example.com/full_1200x900.jpg">
        <img src="http://example.com/original.jpg">
      </body></html>`
    },
    {
      name: 'Page with price in different formats',
      html: `<html><body>
        <h1>Item for Sale</h1>
        <div class="price">Price: $1,234.56</div>
        <div>Also available for €1000</div>
        <div>Or £900</div>
      </body></html>`
    }
  ];
  
  // Test edge cases with mock HTML
  const browser = await puppeteer.launch({ headless: true });
  
  for (const testCase of edgeCases) {
    console.log(`Testing: ${testCase.name}`);
    const page = await browser.newPage();
    
    await page.setContent(testCase.html);
    
    // Inject scraper
    const scraperCode = fs.readFileSync(path.join(__dirname, 'universalScraper.js'), 'utf8');
    await page.evaluate(scraperCode);
    
    const result = await page.evaluate(() => extractClassifiedAd());
    
    console.log(`- Title: ${result.title}`);
    console.log(`- Price: ${result.price}`);
    console.log(`- Images: ${result.images.length}`);
    console.log('');
    
    await page.close();
  }
  
  await browser.close();
}

// Run all tests
async function runAllTests() {
  await testMultipleSites();
  await testEdgeCases();
}

runAllTests();