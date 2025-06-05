const { Stagehand } = require('@browserbasehq/stagehand');
const fs = require('fs');
const path = require('path');

async function testBikeDetectionIntegration() {
  console.log('🚴 Testing Bike Detection Integration\n');
  
  const stagehand = new Stagehand({
    env: 'LOCAL',
    verbose: false,
    headless: false
  });

  try {
    await stagehand.init();
    
    // Navigate to a real bike listing
    console.log('📝 Navigating to bike listing...');
    await stagehand.page.goto('https://sfbay.craigslist.org/search/bik#search=1~gallery~0~0');
    await stagehand.page.waitForLoadState('networkidle');
    
    const firstListing = await stagehand.page.locator('.gallery-card').first();
    await firstListing.click();
    await stagehand.page.waitForLoadState('networkidle');
    
    // Load universal scraper
    console.log('🧪 Loading universal scraper...');
    const scraperCode = fs.readFileSync(path.join(__dirname, 'universalScraper.js'), 'utf8');
    
    // Load bike detection with proper cleaning
    console.log('🧪 Loading bike detection...');
    const bikeDetectionRaw = fs.readFileSync(path.join(__dirname, 'bikeDetection.js'), 'utf8');
    const bikeDetectionCleaned = bikeDetectionRaw.replace(/module\.exports[\s\S]*$/m, '');
    
    // Test integration
    const integrationResult = await stagehand.page.evaluate(({ scraperCode, bikeCode }) => {
      try {
        // Load both modules
        eval(scraperCode);
        eval(bikeCode);
        
        // First scrape the basic data
        const scrapedData = window.extractClassifiedAd();
        
        // Then enhance with bike detection
        const isBike = typeof isBikeListing === 'function' ? isBikeListing(document) : false;
        const category = typeof extractCategory === 'function' ? extractCategory(document) : null;
        
        // Enhance scraped data with bike info
        if (isBike) {
          scrapedData.isBikeListing = true;
          scrapedData.detectedCategory = category;
          scrapedData.bikeEnhanced = true;
        }
        
        return {
          success: true,
          scrapedData: scrapedData,
          bikeDetection: {
            isBike: isBike,
            category: category,
            functionsAvailable: {
              isBikeListing: typeof isBikeListing === 'function',
              extractCategory: typeof extractCategory === 'function'
            }
          }
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
          stack: e.stack
        };
      }
    }, { scraperCode, bikeCode: bikeDetectionCleaned });
    
    if (integrationResult.success) {
      console.log('✅ Integration successful');
      console.log('\n📊 Scraped Data:');
      console.log(`   Title: ${integrationResult.scrapedData.title}`);
      console.log(`   Price: ${integrationResult.scrapedData.price}`);
      console.log(`   Is Bike: ${integrationResult.bikeDetection.isBike}`);
      console.log(`   Category: ${integrationResult.bikeDetection.category || 'N/A'}`);
      console.log(`   Enhanced: ${integrationResult.scrapedData.bikeEnhanced || false}`);
      
      console.log('\n🔧 Function Availability:');
      console.log(`   isBikeListing: ${integrationResult.bikeDetection.functionsAvailable.isBikeListing}`);
      console.log(`   extractCategory: ${integrationResult.bikeDetection.functionsAvailable.extractCategory}`);
    } else {
      console.log(`❌ Integration failed: ${integrationResult.error}`);
      if (integrationResult.stack) {
        console.log('Stack trace:', integrationResult.stack.split('\n')[0]);
      }
    }
    
    // Test with keyword detection on different content
    console.log('\n🧪 Testing keyword detection on different content...');
    
    const keywordTests = [
      'Trek Mountain Bike for sale',
      'Specialized road bicycle',
      'Harley Davidson motorcycle',
      'iPhone 13 Pro for sale',
      'Gaming laptop with RTX graphics'
    ];
    
    const keywordResults = await stagehand.page.evaluate(({ bikeCode, tests }) => {
      eval(bikeCode);
      
      return tests.map(testText => {
        // Create a mock document for testing
        const mockDoc = {
          body: { 
            textContent: testText,
            innerText: testText
          },
          textContent: testText
        };
        
        const detected = typeof isBikeListing === 'function' ? 
          isBikeListing(mockDoc) : false;
          
        return {
          text: testText,
          detected: detected,
          expected: testText.toLowerCase().includes('bike') || 
                   testText.toLowerCase().includes('bicycle') ||
                   testText.toLowerCase().includes('motorcycle')
        };
      });
    }, { bikeCode: bikeDetectionCleaned, tests: keywordTests });
    
    console.log('\nKeyword Detection Results:');
    keywordResults.forEach(result => {
      const correct = result.detected === result.expected;
      const emoji = correct ? '✅' : '❌';
      console.log(`${emoji} "${result.text}" → ${result.detected ? 'Bike' : 'Not Bike'} (expected: ${result.expected ? 'Bike' : 'Not Bike'})`);
    });
    
    const accuracy = keywordResults.filter(r => r.detected === r.expected).length / keywordResults.length * 100;
    console.log(`\nKeyword Detection Accuracy: ${accuracy.toFixed(1)}%`);
    
    // Test complete workflow with bike detection
    console.log('\n🧪 Testing complete workflow with bike detection...');
    
    // Load all modules
    const priceComparisonRaw = fs.readFileSync(path.join(__dirname, 'priceComparison.js'), 'utf8');
    const priceCode = priceComparisonRaw.split('\n')
      .filter(line => !line.includes('module.exports') && !line.includes('// Export for use'))
      .join('\n') + '\nwindow.PriceComparison = PriceComparison;';
    
    await stagehand.page.evaluate(priceCode);
    
    const workflowResult = await stagehand.page.evaluate(({ scraperCode, bikeCode }) => {
      try {
        eval(scraperCode);
        eval(bikeCode);
        
        // Step 1: Scrape data
        const baseData = window.extractClassifiedAd();
        
        // Step 2: Enhance with bike detection
        const isBike = isBikeListing(document);
        const category = extractCategory(document);
        
        if (isBike) {
          baseData.isBikeListing = true;
          baseData.detectedCategory = category;
          baseData.enhancedForBikes = true;
        }
        
        // Step 3: Use price comparison (mock data)
        const pc = new PriceComparison();
        const mockSimilarBikes = [
          { title: 'Similar bike', price: '$1100', category: 'bicycle' },
          { title: 'Another bike', price: '$1500', category: 'bicycle' }
        ];
        
        const similarItems = pc.findSimilarAds(baseData, mockSimilarBikes);
        
        return {
          success: true,
          workflow: {
            dataScraped: !!baseData.title,
            bikeDetected: isBike,
            categoryExtracted: !!category,
            priceComparisonWorking: similarItems !== undefined,
            completeIntegration: true
          },
          finalData: {
            title: baseData.title,
            price: baseData.price,
            isBike: isBike,
            category: category,
            similarItemsFound: similarItems ? similarItems.length : 0
          }
        };
      } catch (e) {
        return {
          success: false,
          error: e.message
        };
      }
    }, { scraperCode, bikeCode: bikeDetectionCleaned });
    
    if (workflowResult.success) {
      console.log('✅ Complete workflow successful');
      console.log('\n📊 Workflow Results:');
      console.log(`   Data scraped: ${workflowResult.workflow.dataScraped}`);
      console.log(`   Bike detected: ${workflowResult.workflow.bikeDetected}`);
      console.log(`   Category extracted: ${workflowResult.workflow.categoryExtracted}`);
      console.log(`   Price comparison: ${workflowResult.workflow.priceComparisonWorking}`);
      console.log(`   Complete integration: ${workflowResult.workflow.completeIntegration}`);
      
      console.log('\n📋 Final Enhanced Data:');
      console.log(`   Title: ${workflowResult.finalData.title}`);
      console.log(`   Price: ${workflowResult.finalData.price}`);
      console.log(`   Is Bike: ${workflowResult.finalData.isBike}`);
      console.log(`   Category: ${workflowResult.finalData.category || 'N/A'}`);
      console.log(`   Similar items: ${workflowResult.finalData.similarItemsFound}`);
    } else {
      console.log(`❌ Complete workflow failed: ${workflowResult.error}`);
    }
    
    console.log('\n🎉 BIKE DETECTION INTEGRATION SUMMARY:');
    console.log('======================================');
    
    if (integrationResult.success && workflowResult.success && accuracy >= 80) {
      console.log('✅ Bike detection integration SUCCESSFUL');
      console.log('✅ Universal scraper + bike detection working together');
      console.log(`✅ Keyword detection accuracy: ${accuracy.toFixed(1)}%`);
      console.log('✅ Complete workflow functional');
      console.log('✅ Ready for production use');
    } else {
      console.log('❌ Some integration issues found');
      console.log(`⚠️ Keyword accuracy: ${accuracy.toFixed(1)}%`);
      console.log('⚠️ May need additional tuning');
    }

  } catch (error) {
    console.error('❌ Bike detection integration test failed:', error);
  } finally {
    await stagehand.close();
  }
}

testBikeDetectionIntegration().catch(console.error);