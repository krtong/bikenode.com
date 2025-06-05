const { Stagehand } = require('@browserbasehq/stagehand');
const fs = require('fs');
const path = require('path');

/**
 * Test 3: Verify bike-specific detection and parsing features
 * This test checks if the extension correctly identifies and parses bike listings
 */
async function testBikeDetection() {
  console.log('🧪 Test 3: Bike-Specific Detection and Parsing\n');
  
  // Load required modules
  const bikeDetectionCode = fs.readFileSync(path.join(__dirname, 'bikeDetection.js'), 'utf8')
    .replace(/module\.exports[\s\S]*$/m, ''); // Remove module.exports
  
  const bikeParserCode = fs.readFileSync(path.join(__dirname, 'bikeParser.js'), 'utf8')
    .replace(/module\.exports[\s\S]*$/m, '');
  
  const scraperCode = fs.readFileSync(path.join(__dirname, 'universalScraper.js'), 'utf8');
  
  // Test cases with different types of listings
  const testCases = [
    {
      name: 'Road Bike Listing',
      url: 'https://sfbay.craigslist.org/search/bik?query=road%20bike#search=1~gallery~0~0',
      expectedType: 'bicycle',
      expectedAttributes: ['wheelSize', 'frameMaterial', 'bikeType']
    },
    {
      name: 'Mountain Bike Listing', 
      url: 'https://sfbay.craigslist.org/search/bik?query=mountain%20bike#search=1~gallery~0~0',
      expectedType: 'bicycle',
      expectedAttributes: ['wheelSize', 'frameMaterial', 'bikeType']
    },
    {
      name: 'Motorcycle Listing',
      url: 'https://sfbay.craigslist.org/search/mca#search=1~gallery~0~0',
      expectedType: 'motorcycle',
      expectedAttributes: ['engineSize', 'year', 'make', 'model']
    },
    {
      name: 'Bike Parts/Components',
      url: 'https://sfbay.craigslist.org/search/bop#search=1~gallery~0~0',
      expectedType: 'component',
      expectedAttributes: ['componentType', 'brand']
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
    
    for (const testCase of testCases) {
      console.log(`\n📝 Testing: ${testCase.name}`);
      console.log(`URL: ${testCase.url}`);
      
      try {
        // Navigate to search results
        await stagehand.page.goto(testCase.url, { waitUntil: 'networkidle' });
        await stagehand.page.waitForTimeout(2000);
        
        // Click on first listing
        const firstListing = await stagehand.page.locator('.gallery-card').first();
        if (await firstListing.isVisible()) {
          await firstListing.click();
          await stagehand.page.waitForLoadState('networkidle');
          
          // Test bike detection
          const detectionResult = await stagehand.page.evaluate(({ detection, parser, scraper }) => {
            // Load all modules
            eval(detection);
            eval(parser);
            eval(scraper);
            
            // First extract the basic data
            const scrapedData = window.extractClassifiedAd ? window.extractClassifiedAd() : null;
            
            // Check if it's a bike listing
            const isBike = typeof isBikeListing === 'function' ? isBikeListing(document) : false;
            
            // Parse bike-specific attributes
            let bikeData = null;
            if (typeof BikeParser !== 'undefined' && scrapedData) {
              const bikeParser = new BikeParser();
              bikeData = bikeParser.parse(scrapedData);
            }
            
            return {
              scraped: scrapedData,
              isBike: isBike,
              bikeData: bikeData
            };
          }, { 
            detection: bikeDetectionCode, 
            parser: bikeParserCode,
            scraper: scraperCode
          });
          
          if (detectionResult.scraped) {
            console.log(`✅ Page scraped successfully`);
            console.log(`   Title: ${detectionResult.scraped.title || 'N/A'}`);
            console.log(`   Price: ${detectionResult.scraped.price || 'N/A'}`);
            console.log(`   Is Bike: ${detectionResult.isBike ? 'Yes' : 'No'}`);
            
            if (detectionResult.bikeData) {
              console.log(`   Bike Type: ${detectionResult.bikeData.bikeType || 'N/A'}`);
              console.log(`   Category: ${detectionResult.bikeData.category || 'N/A'}`);
              
              // Check for expected attributes
              const foundAttributes = testCase.expectedAttributes.filter(attr => 
                detectionResult.bikeData[attr] !== undefined
              );
              console.log(`   Found Attributes: ${foundAttributes.join(', ') || 'None'}`);
              
              if (foundAttributes.length < testCase.expectedAttributes.length) {
                const missing = testCase.expectedAttributes.filter(attr => 
                  !foundAttributes.includes(attr)
                );
                console.log(`   ⚠️ Missing Attributes: ${missing.join(', ')}`);
              }
            }
            
            results.push({
              testCase: testCase.name,
              status: 'success',
              isBike: detectionResult.isBike,
              category: detectionResult.bikeData?.category,
              foundAttributes: detectionResult.bikeData ? 
                Object.keys(detectionResult.bikeData).length : 0
            });
          }
        } else {
          console.log('⚠️ No listings found');
          results.push({
            testCase: testCase.name,
            status: 'no_listings'
          });
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        results.push({
          testCase: testCase.name,
          status: 'error',
          error: error.message
        });
      }
    }
    
    // Test bike keyword detection
    console.log('\n\n📝 Testing Bike Keyword Detection...');
    
    const keywordTests = [
      { text: 'Trek Domane road bike for sale', expected: true },
      { text: 'Specialized mountain bike 29er', expected: true },
      { text: 'Vintage Schwinn cruiser bicycle', expected: true },
      { text: 'Harley Davidson motorcycle', expected: true },
      { text: 'iPhone 13 Pro Max for sale', expected: false },
      { text: 'Gaming laptop RTX 3080', expected: false }
    ];
    
    const keywordResults = await stagehand.page.evaluate((tests, code) => {
      eval(code);
      
      return tests.map(test => {
        const detected = typeof isBikeListing === 'function' ? 
          isBikeListing({ body: { innerText: test.text } }) : false;
        return {
          text: test.text,
          expected: test.expected,
          detected: detected,
          correct: detected === test.expected
        };
      });
    }, keywordTests, bikeDetectionCode);
    
    console.log('\nKeyword Detection Results:');
    keywordResults.forEach(result => {
      const emoji = result.correct ? '✅' : '❌';
      console.log(`${emoji} "${result.text.substring(0, 30)}..." - ${result.detected ? 'Bike' : 'Not Bike'}`);
    });
    
    const accuracy = keywordResults.filter(r => r.correct).length / keywordResults.length * 100;
    console.log(`\nKeyword Detection Accuracy: ${accuracy.toFixed(1)}%`);
    
    // Summary
    console.log('\n\n📊 Test Summary:');
    console.log('================');
    
    const successful = results.filter(r => r.status === 'success').length;
    const bikeListings = results.filter(r => r.isBike).length;
    
    console.log(`✅ Successfully tested: ${successful}/${testCases.length}`);
    console.log(`🚴 Bike listings detected: ${bikeListings}`);
    console.log(`🎯 Keyword detection accuracy: ${accuracy.toFixed(1)}%`);
    
    // Save results
    fs.writeFileSync(
      path.join(__dirname, 'test_results_bike_detection.json'),
      JSON.stringify({ results, keywordResults }, null, 2)
    );
    console.log('\n💾 Results saved to test_results_bike_detection.json');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await stagehand.close();
    console.log('\n✅ Test 3 completed!');
  }
}

// Run the test
testBikeDetection().catch(console.error);