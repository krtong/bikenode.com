const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test different page structures and edge cases
const mockPages = [
  {
    name: 'Craigslist-style page with all attributes',
    html: `
      <!DOCTYPE html>
      <html>
      <body>
        <h1 class="postingtitletext">2022 Trek Checkpoint SL5 - $3,500 (san francisco)</h1>
        <div class="price">$3,500</div>
        
        <section class="body">
          <div class="attrgroup">
            <span class="year">2022</span>
            <span class="makemodel">Trek Checkpoint SL5</span>
          </div>
          
          <div class="attrgroup">
            <div class="attr">
              <span class="labl">condition:</span>
              <span class="valu">like new</span>
            </div>
            <div class="attr">
              <span class="labl">size:</span>
              <span class="valu">56cm</span>
            </div>
          </div>
          
          <section id="postingbody">
            Excellent gravel bike, barely used. Carbon frame, Shimano GRX groupset.
          </section>
          
          <script>
            var imgList = [
              {imgid:"3:00y0y_test1", url:"https://images.craigslist.org/00y0y_test1_600x450.jpg"},
              {imgid:"3:00h0h_test2", url:"https://images.craigslist.org/00h0h_test2_600x450.jpg"}
            ];
          </script>
        </section>
      </body>
      </html>
    `,
    expected: {
      title: '2022 Trek Checkpoint SL5 - $3,500 (san francisco)',
      price: '$3,500',
      location: 'san francisco',
      imageCount: 2,
      attributes: {
        condition: 'like new',
        size: '56cm',
        year: '2022'
      }
    }
  },
  {
    name: 'Page with price but no clear location',
    html: `
      <html>
      <body>
        <h1>Mountain Bike For Sale - Great Deal!</h1>
        <div class="listing-price">$1,200</div>
        <div class="description">
          Located in the Bay Area. 
          Contact me at 555-1234 for details.
        </div>
      </body>
      </html>
    `,
    expected: {
      hasTitle: true,
      hasPrice: true,
      hasLocation: false,
      hasPhoneNumber: false // Should not extract this format
    }
  },
  {
    name: 'eBay-style listing',
    html: `
      <html>
      <body>
        <h1 id="itemTitle">Details about 2021 Specialized Stumpjumper</h1>
        <span id="prcIsum">US $4,500.00</span>
        <div class="item-specifics">
          <table>
            <tr><th>Brand:</th><td>Specialized</td></tr>
            <tr><th>Model:</th><td>Stumpjumper</td></tr>
            <tr><th>Year:</th><td>2021</td></tr>
          </table>
        </div>
      </body>
      </html>
    `,
    expected: {
      title: '2021 Specialized Stumpjumper',
      price: 'US $4,500.00',
      hasBrand: true
    }
  },
  {
    name: 'Page with various image formats',
    html: `
      <html>
      <body>
        <h1>Bike Sale - $800</h1>
        <div class="gallery">
          <img src="https://example.com/thumb_50x50c.jpg">
          <img src="https://example.com/small_300x300.jpg">
          <img src="https://example.com/medium_600x450.jpg">
          <img src="https://example.com/large_1200x900.jpg">
          <img src="https://example.com/original.jpg">
        </div>
      </body>
      </html>
    `,
    expected: {
      shouldNotHaveThumbnails: true,
      shouldHaveFullSizeImages: true
    }
  }
];

async function validateScraper() {
  console.log('=== SCRAPER VALIDATION TEST ===\n');
  
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
    for (const test of mockPages) {
      console.log(`\nTesting: ${test.name}`);
      console.log('─'.repeat(50));
      
      const page = await browser.newPage();
      const testResult = {
        name: test.name,
        passed: true,
        errors: []
      };
      
      try {
        // Set the HTML content
        await page.setContent(test.html);
        
        // Inject and run scraper
        await page.evaluate(scraperCode);
        const data = await page.evaluate(() => extractClassifiedAd());
        
        // Validate results
        if (test.expected.title) {
          console.log(`Title: ${data.title === test.expected.title ? '✓' : '✗'} "${data.title}"`);
          if (data.title !== test.expected.title) {
            testResult.errors.push(`Title mismatch: expected "${test.expected.title}", got "${data.title}"`);
            testResult.passed = false;
          }
        }
        
        if (test.expected.price) {
          console.log(`Price: ${data.price === test.expected.price ? '✓' : '✗'} "${data.price}"`);
          if (data.price !== test.expected.price) {
            testResult.errors.push(`Price mismatch: expected "${test.expected.price}", got "${data.price}"`);
            testResult.passed = false;
          }
        }
        
        if (test.expected.location) {
          console.log(`Location: ${data.location === test.expected.location ? '✓' : '✗'} "${data.location}"`);
          if (data.location !== test.expected.location) {
            testResult.errors.push(`Location mismatch: expected "${test.expected.location}", got "${data.location}"`);
            testResult.passed = false;
          }
        }
        
        if (test.expected.imageCount !== undefined) {
          console.log(`Images: ${data.images.length === test.expected.imageCount ? '✓' : '✗'} ${data.images.length} images`);
          if (data.images.length !== test.expected.imageCount) {
            testResult.errors.push(`Image count mismatch: expected ${test.expected.imageCount}, got ${data.images.length}`);
            testResult.passed = false;
          }
          
          // Check image URLs
          if (data.images.length > 0) {
            console.log('Sample images:');
            data.images.forEach(url => console.log(`  - ${url}`));
            
            const hasThumbnails = data.images.some(url => 
              url.includes('50x50') || url.includes('100x100') || url.includes('150x150') ||
              url.includes('200x200') || url.includes('300x300') || url.includes('400x400') ||
              url.includes('600x450') || url.includes('thumb') || url.includes('thumbnail') ||
              url.includes('small') || url.includes('_s.') || url.includes('_t.') || url.includes('_m.')
            );
            
            if (test.expected.shouldNotHaveThumbnails && hasThumbnails) {
              testResult.errors.push('Should not have thumbnail images');
              testResult.passed = false;
            }
          }
        }
        
        if (test.expected.attributes) {
          console.log(`Attributes: ${Object.keys(data.attributes || {}).length} found`);
          for (const [key, value] of Object.entries(test.expected.attributes)) {
            const actual = data.attributes[key];
            if (actual === value) {
              console.log(`  ✓ ${key}: "${actual}"`);
            } else {
              console.log(`  ✗ ${key}: expected "${value}", got "${actual}"`);
              testResult.errors.push(`Attribute ${key} mismatch`);
              testResult.passed = false;
            }
          }
        }
        
        if (test.expected.hasPhoneNumber === false) {
          const hasPhone = data.contact && data.contact.phone;
          if (hasPhone) {
            console.log(`✗ Should not extract phone number "555-1234"`);
            testResult.errors.push('Incorrectly extracted non-formatted phone number');
            testResult.passed = false;
          } else {
            console.log(`✓ Correctly ignored non-formatted phone number`);
          }
        }
        
        // Category detection
        console.log(`Category: ${data.category}`);
        
        testResult.data = data;
        
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
        console.log('Errors:', testResult.errors);
        results.failed++;
      }
      
      results.details.push(testResult);
    }
    
  } finally {
    await browser.close();
  }
  
  // Summary
  console.log('\n\n=== VALIDATION SUMMARY ===');
  console.log(`Total tests: ${mockPages.length}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  
  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.details.filter(r => !r.passed).forEach(r => {
      console.log(`- ${r.name}`);
      r.errors.forEach(err => console.log(`  • ${err}`));
    });
  }
  
  // Save results
  fs.writeFileSync('validation_results.json', JSON.stringify(results, null, 2));
  console.log('\nDetailed results saved to validation_results.json');
}

validateScraper();