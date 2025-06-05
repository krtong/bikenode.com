const { Stagehand } = require('@browserbasehq/stagehand');
const fs = require('fs');
const path = require('path');

/**
 * Mock Data Testing for Login-Required Platforms and Edge Cases
 */
async function testMockData() {
  console.log('🧪 Mock Data Testing Suite\n');
  
  const stagehand = new Stagehand({
    env: 'LOCAL',
    verbose: false,
    headless: false
  });

  try {
    await stagehand.init();
    console.log('✅ Browser initialized\n');
    
    // Create mock HTML pages for different platforms
    console.log('📝 Testing with Mock Platform Data...\n');
    
    // Mock Facebook Marketplace data
    const facebookMockHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Mountain Bike - $850 | Facebook Marketplace</title></head>
      <body>
        <h1>Trek Mountain Bike 29er</h1>
        <div class="price">$850</div>
        <div class="location">San Francisco, CA</div>
        <div class="description">
          2020 Trek mountain bike, 29 inch wheels, excellent condition.
          Shimano components, recently serviced. Perfect for trails.
        </div>
        <div class="seller">Posted by John Doe</div>
        <img src="bike1.jpg" alt="Mountain bike">
        <img src="bike2.jpg" alt="Mountain bike detail">
        <img src="bike3.jpg" alt="Mountain bike wheels">
      </body>
      </html>
    `;
    
    // Mock eBay data
    const ebayMockHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Specialized Road Bike | eBay</title></head>
      <body>
        <h1 id="itemTitle">Specialized Allez Road Bike - Size 56cm</h1>
        <span class="price">$1,200.00</span>
        <div class="shipping">+ $25.00 shipping</div>
        <div class="location">Ships from: Oakland, CA</div>
        <div class="description">
          Specialized Allez road bike in great condition. 
          Aluminum frame, carbon fork, Shimano 105 groupset.
          Size 56cm suitable for riders 5'8" to 6'0".
        </div>
        <div class="seller-info">Seller: bike_enthusiast_2024 (98.5% positive)</div>
        <img src="ebay1.jpg">
        <img src="ebay2.jpg">
      </body>
      </html>
    `;
    
    // Mock PinkBike data (bike-specific platform)
    const pinkbikeMockHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Santa Cruz Hightower - Pinkbike Buy/Sell</title></head>
      <body>
        <h1 class="buysell-title">Santa Cruz Hightower CC - Large</h1>
        <div class="price-container">
          <span class="price">$4,500</span>
          <span class="currency">USD</span>
        </div>
        <div class="location">Vancouver, BC</div>
        <div class="bike-specs">
          <div>Year: 2021</div>
          <div>Size: Large</div>
          <div>Wheel Size: 29"</div>
          <div>Frame Material: Carbon</div>
          <div>Travel: 140mm</div>
        </div>
        <div class="description">
          Carbon Santa Cruz Hightower in excellent condition.
          Full XTR groupset, Fox suspension, Chris King headset.
          Barely used, stored indoors.
        </div>
        <div class="image-gallery">
          <img src="santa1.jpg">
          <img src="santa2.jpg">
          <img src="santa3.jpg">
          <img src="santa4.jpg">
        </div>
      </body>
      </html>
    `;
    
    const mockDataTests = [
      {
        name: 'Facebook Marketplace Mock',
        html: facebookMockHtml,
        expectedFields: ['title', 'price', 'location', 'description'],
        expectedPrice: '$850',
        platform: 'facebook'
      },
      {
        name: 'eBay Mock',
        html: ebayMockHtml,
        expectedFields: ['title', 'price', 'shipping'],
        expectedPrice: '$1,200.00',
        platform: 'ebay'
      },
      {
        name: 'PinkBike Mock',
        html: pinkbikeMockHtml,
        expectedFields: ['title', 'price', 'location'],
        expectedPrice: '$4,500',
        platform: 'pinkbike'
      }
    ];
    
    const scraperCode = fs.readFileSync(path.join(__dirname, 'universalScraper.js'), 'utf8');
    const results = [];
    
    for (const mockTest of mockDataTests) {
      console.log(`🧪 Testing: ${mockTest.name}`);
      
      try {
        // Navigate to blank page and inject mock HTML
        await stagehand.page.goto('about:blank');
        await stagehand.page.setContent(mockTest.html);
        
        // Run the scraper
        const scrapedData = await stagehand.page.evaluate((code) => {
          eval(code);
          if (window.extractClassifiedAd) {
            return window.extractClassifiedAd();
          }
          return null;
        }, scraperCode);
        
        if (scrapedData) {
          console.log(`✅ ${mockTest.name} - Scraping successful`);
          console.log(`   Title: ${scrapedData.title || 'N/A'}`);
          console.log(`   Price: ${scrapedData.price || 'N/A'}`);
          console.log(`   Location: ${scrapedData.location || 'N/A'}`);
          console.log(`   Images: ${scrapedData.images?.length || 0}`);
          
          // Validate expected fields
          const missingFields = mockTest.expectedFields.filter(field => !scrapedData[field]);
          if (missingFields.length === 0) {
            console.log(`   ✅ All expected fields extracted`);
          } else {
            console.log(`   ⚠️ Missing fields: ${missingFields.join(', ')}`);
          }
          
          // Validate price
          const priceMatch = scrapedData.price === mockTest.expectedPrice;
          console.log(`   Price match: ${priceMatch ? '✅' : '⚠️'} (expected: ${mockTest.expectedPrice})`);
          
          results.push({
            test: mockTest.name,
            status: 'success',
            data: scrapedData,
            fieldsComplete: missingFields.length === 0,
            priceMatch: priceMatch
          });
        } else {
          console.log(`❌ ${mockTest.name} - No data extracted`);
          results.push({
            test: mockTest.name,
            status: 'no_data'
          });
        }
        
      } catch (error) {
        console.log(`❌ ${mockTest.name} - Error: ${error.message}`);
        results.push({
          test: mockTest.name,
          status: 'error',
          error: error.message
        });
      }
      
      console.log('');
    }
    
    // Test edge cases
    console.log('🧪 Testing Edge Cases...\n');
    
    const edgeCases = [
      {
        name: 'Missing Price',
        html: '<html><body><h1>Bike for sale</h1><p>Contact for price</p></body></html>'
      },
      {
        name: 'Multiple Prices',
        html: '<html><body><h1>Bike $500</h1><p>Was $800, now $500</p><span>$500</span></body></html>'
      },
      {
        name: 'Non-English Content',
        html: '<html><body><h1>Vélo de route - 750€</h1><p>Très bon état</p></body></html>'
      },
      {
        name: 'Empty Page',
        html: '<html><body></body></html>'
      },
      {
        name: 'Complex Layout',
        html: `
          <html><body>
            <div class="header">
              <h1>Premium Road Bike</h1>
              <div class="breadcrumb">Home > Bikes > Road</div>
            </div>
            <div class="main">
              <div class="price-section">
                <span class="old-price">$2000</span>
                <span class="current-price">$1500</span>
                <span class="discount">25% OFF</span>
              </div>
              <div class="details">
                <p>High-end carbon fiber road bike with electronic shifting</p>
                <ul>
                  <li>Frame: Carbon fiber</li>
                  <li>Size: 58cm</li>
                  <li>Weight: 7.2kg</li>
                </ul>
              </div>
            </div>
          </body></html>
        `
      }
    ];
    
    for (const edgeCase of edgeCases) {
      console.log(`🧪 Edge Case: ${edgeCase.name}`);
      
      try {
        await stagehand.page.goto('about:blank');
        await stagehand.page.setContent(edgeCase.html);
        
        const result = await stagehand.page.evaluate((code) => {
          eval(code);
          if (window.extractClassifiedAd) {
            return window.extractClassifiedAd();
          }
          return null;
        }, scraperCode);
        
        if (result) {
          console.log(`   ✅ Handled gracefully`);
          console.log(`   Title: ${result.title || 'None'}`);
          console.log(`   Price: ${result.price || 'None'}`);
        } else {
          console.log(`   ⚠️ No data extracted (expected for some cases)`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      console.log('');
    }
    
    // Generate summary
    console.log('📊 Mock Data Test Summary:');
    console.log('==========================');
    
    const successful = results.filter(r => r.status === 'success').length;
    const withCompleteFields = results.filter(r => r.fieldsComplete).length;
    const withCorrectPrice = results.filter(r => r.priceMatch).length;
    
    console.log(`✅ Successful extractions: ${successful}/${results.length}`);
    console.log(`✅ Complete field sets: ${withCompleteFields}/${results.length}`);
    console.log(`✅ Correct price extraction: ${withCorrectPrice}/${results.length}`);
    
    // Save results
    fs.writeFileSync(
      path.join(__dirname, 'test_results_mock_data.json'),
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n💾 Results saved to test_results_mock_data.json');

  } catch (error) {
    console.error('❌ Mock data test failed:', error);
  } finally {
    await stagehand.close();
    console.log('\n✅ Mock data testing completed!');
  }
}

// Run the test
testMockData().catch(console.error);