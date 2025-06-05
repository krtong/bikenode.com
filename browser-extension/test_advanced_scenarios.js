const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Advanced test scenarios covering edge cases and different platforms
const advancedTests = [
  {
    name: 'Facebook Marketplace Style',
    html: `
      <html>
      <body>
        <span data-testid="marketplace_listing_title">2020 Giant TCR Advanced Pro - Carbon Road Bike</span>
        <span data-testid="marketplace_listing_price">$2,800</span>
        <div data-testid="marketplace-listing-item-description">
          Excellent condition carbon road bike. Shimano Ultegra groupset, size 54cm.
          Located in Berkeley, CA. Serious inquiries only.
        </div>
        <img data-visualcompletion="media-vc-image" src="https://facebook.com/image1_600x600.jpg">
        <img data-visualcompletion="media-vc-image" src="https://facebook.com/image2_600x600.jpg">
      </body>
      </html>
    `,
    expected: {
      title: '2020 Giant TCR Advanced Pro - Carbon Road Bike',
      price: '$2,800',
      imageCount: 2,
      category: 'bicycle'
    }
  },
  {
    name: 'eBay Detailed Listing',
    html: `
      <html>
      <body>
        <h1 id="itemTitle">Details about 2019 Trek Fuel EX 8 Mountain Bike</h1>
        <span id="prcIsum">US $3,200.00</span>
        <div class="item-specifics">
          <div><span>Brand:</span> Trek</div>
          <div><span>Model:</span> Fuel EX 8</div>
          <div><span>Year:</span> 2019</div>
          <div><span>Frame Size:</span> Large</div>
        </div>
        <img id="icImg" src="https://ebay.com/main_image.jpg">
        <div class="gallery">
          <img src="https://ebay.com/thumb1_50x50.jpg">
          <img src="https://ebay.com/image1_800x600.jpg">
          <img src="https://ebay.com/image2_800x600.jpg">
        </div>
      </body>
      </html>
    `,
    expected: {
      title: '2019 Trek Fuel EX 8 Mountain Bike',
      price: 'US $3,200.00',
      imageCount: 3, // Should exclude 50x50 thumbnail
      category: 'bicycle'
    }
  },
  {
    name: 'Motorcycle Listing with Detailed Specs',
    html: `
      <html>
      <body>
        <div class="attrgroup">
          <span class="year">2018</span>
          <span class="makemodel">Yamaha MT-07</span>
        </div>
        <div class="attrgroup">
          <div class="attr">
            <span class="labl">condition:</span>
            <span class="valu">excellent</span>
          </div>
          <div class="attr">
            <span class="labl">odometer:</span>
            <span class="valu">12,500</span>
          </div>
          <div class="attr">
            <span class="labl">VIN:</span>
            <span class="valu">JYA2P02J0JA012345</span>
          </div>
        </div>
        <h1 class="postingtitletext">2018 Yamaha MT-07 - Low Miles! - $6,800 (san jose)</h1>
        <script>
          var imgList = [
            {imgid:"3:00a0a_bike1", url:"https://images.craigslist.org/00a0a_bike1_600x450.jpg"},
            {imgid:"3:00b0b_bike2", url:"https://images.craigslist.org/00b0b_bike2_600x450.jpg"}
          ];
        </script>
      </body>
      </html>
    `,
    expected: {
      title: '2018 Yamaha MT-07 - Low Miles! - $6,800 (san jose)',
      price: '$6,800',
      location: 'san jose',
      imageCount: 2,
      category: 'motorcycle',
      attributes: {
        condition: 'excellent',
        odometer: '12,500',
        vin: 'JYA2P02J0JA012345',
        year: '2018'
      }
    }
  },
  {
    name: 'Page with Multiple Prices',
    html: `
      <html>
      <body>
        <h1>Mountain Bike For Sale</h1>
        <div class="sidebar">Was $1,200</div>
        <div class="price">$850</div>
        <div class="description">
          Originally paid $1,500. Selling for $850.
        </div>
      </body>
      </html>
    `,
    expected: {
      price: '$850'
    }
  }
];

async function runAdvancedTests() {
  console.log('=== ADVANCED SCRAPER TESTS ===\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const scraperCode = fs.readFileSync(path.join(__dirname, 'universalScraper.js'), 'utf8');
  const results = {
    passed: 0,
    failed: 0,
    details: []
  };

  try {
    for (const test of advancedTests) {
      console.log(`\nTesting: ${test.name}`);
      console.log('─'.repeat(60));
      
      const page = await browser.newPage();
      const testResult = {
        name: test.name,
        passed: true,
        errors: []
      };
      
      try {
        await page.setContent(test.html);
        await page.evaluate(scraperCode);
        const data = await page.evaluate(() => extractClassifiedAd());
        
        // Validate results
        if (test.expected.title) {
          if (data.title === test.expected.title) {
            console.log(`✓ Title: "${data.title}"`);
          } else {
            console.log(`✗ Title: expected "${test.expected.title}", got "${data.title}"`);
            testResult.errors.push('Title mismatch');
            testResult.passed = false;
          }
        }
        
        if (test.expected.price) {
          if (data.price === test.expected.price) {
            console.log(`✓ Price: "${data.price}"`);
          } else {
            console.log(`✗ Price: expected "${test.expected.price}", got "${data.price}"`);
            testResult.errors.push('Price mismatch');
            testResult.passed = false;
          }
        }
        
        if (test.expected.location) {
          if (data.location === test.expected.location) {
            console.log(`✓ Location: "${data.location}"`);
          } else {
            console.log(`✗ Location: expected "${test.expected.location}", got "${data.location}"`);
            testResult.errors.push('Location mismatch');
            testResult.passed = false;
          }
        }
        
        if (test.expected.imageCount !== undefined) {
          const actualCount = data.images ? data.images.length : 0;
          if (actualCount === test.expected.imageCount) {
            console.log(`✓ Images: ${actualCount}`);
          } else {
            console.log(`✗ Images: expected ${test.expected.imageCount}, got ${actualCount}`);
            testResult.errors.push('Image count mismatch');
            testResult.passed = false;
          }
          
          // Check for thumbnails
          if (data.images && data.images.length > 0) {
            const thumbnails = data.images.filter(url => 
              url.includes('50x50') || url.includes('thumb')
            );
            if (thumbnails.length > 0) {
              console.log(`✗ Found ${thumbnails.length} thumbnail images`);
              testResult.errors.push('Contains thumbnails');
              testResult.passed = false;
            } else {
              console.log(`✓ No thumbnails detected`);
            }
            
            console.log('Sample images:');
            data.images.slice(0, 2).forEach(url => console.log(`  - ${url}`));
          }
        }
        
        if (test.expected.category) {
          if (data.category === test.expected.category) {
            console.log(`✓ Category: "${data.category}"`);
          } else {
            console.log(`✗ Category: expected "${test.expected.category}", got "${data.category}"`);
            testResult.errors.push('Category mismatch');
            testResult.passed = false;
          }
        }
        
        if (test.expected.attributes) {
          const attrs = data.attributes || {};
          console.log(`Attributes found: ${Object.keys(attrs).length}`);
          
          for (const [key, value] of Object.entries(test.expected.attributes)) {
            const actual = attrs[key] || attrs[key.toLowerCase()];
            if (actual === value) {
              console.log(`✓ ${key}: "${actual}"`);
            } else {
              console.log(`✗ ${key}: expected "${value}", got "${actual}"`);
              testResult.errors.push(`Attribute ${key} mismatch`);
              testResult.passed = false;
            }
          }
        }
        
      } catch (error) {
        console.error(`Error: ${error.message}`);
        testResult.errors.push(error.message);
        testResult.passed = false;
      } finally {
        await page.close();
      }
      
      if (testResult.passed) {
        console.log('\n✅ PASSED');
        results.passed++;
      } else {
        console.log('\n❌ FAILED');
        results.failed++;
      }
      
      results.details.push(testResult);
    }
    
  } finally {
    await browser.close();
  }
  
  // Summary
  console.log('\n\n=== ADVANCED TEST SUMMARY ===');
  console.log(`Total tests: ${advancedTests.length}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success rate: ${Math.round((results.passed / advancedTests.length) * 100)}%`);
  
  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.details.filter(r => !r.passed).forEach(r => {
      console.log(`- ${r.name}: ${r.errors.join(', ')}`);
    });
  }
  
  // Save results
  fs.writeFileSync('advanced_test_results.json', JSON.stringify(results, null, 2));
  console.log('\nDetailed results saved to advanced_test_results.json');
}

runAdvancedTests();