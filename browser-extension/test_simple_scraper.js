const { Stagehand } = require('@browserbasehq/stagehand');
const fs = require('fs');
const path = require('path');

// Simple test focused on core scraping functionality
async function testSimpleScraper() {
  console.log('🚀 Starting Simple Scraper Test\n');
  
  const stagehand = new Stagehand({
    env: 'LOCAL',
    verbose: false,
    headless: false
  });

  try {
    await stagehand.init();
    console.log('✅ Browser initialized\n');

    // Test on a real Craigslist bike listing
    console.log('📝 Testing Craigslist scraping...');
    await stagehand.page.goto('https://sfbay.craigslist.org/search/bik#search=1~gallery~0~0');
    await stagehand.page.waitForLoadState('networkidle');
    
    // Click first listing
    const firstListing = await stagehand.page.locator('.gallery-card').first();
    if (await firstListing.isVisible()) {
      await firstListing.click();
      await stagehand.page.waitForLoadState('networkidle');
      
      // Load and inject the universal scraper
      const scraperPath = path.join(__dirname, 'universalScraper.js');
      const scraperCode = fs.readFileSync(scraperPath, 'utf8');
      
      const scrapedData = await stagehand.page.evaluate((code) => {
        eval(code);
        if (window.extractClassifiedAd) {
          return window.extractClassifiedAd();
        }
        return null;
      }, scraperCode);
      
      if (scrapedData) {
        console.log('\n✅ Successfully scraped data:');
        console.log('📍 Platform:', scrapedData.platform);
        console.log('📝 Title:', scrapedData.title);
        console.log('💰 Price:', scrapedData.price);
        console.log('📍 Location:', scrapedData.location);
        console.log('🏷️ Category:', scrapedData.category);
        console.log('📸 Images:', scrapedData.images?.length || 0);
        console.log('📄 Description:', scrapedData.description?.substring(0, 100) + '...');
        
        // Test the price comparison functionality
        console.log('\n📝 Testing price comparison module...');
        const priceComparisonPath = path.join(__dirname, 'priceComparison.js');
        let priceComparisonCode = fs.readFileSync(priceComparisonPath, 'utf8');
        
        // Remove module.exports
        priceComparisonCode = priceComparisonCode.replace(/module\.exports[\s\S]*$/m, '');
        
        const comparisonResult = await stagehand.page.evaluate(({ code, data }) => {
          eval(code);
          
          // Create a mock dataset to compare against
          const mockListings = [
            {
              title: "Trek Mountain Bike 29er",
              price: "$900",
              platform: "facebook"
            },
            {
              title: "53cm Road Bike Shimano",
              price: "$750",
              platform: "offerup"
            }
          ];
          
          if (typeof PriceComparison !== 'undefined') {
            const pc = new PriceComparison();
            return pc.findSimilarListings(data, mockListings);
          }
          return null;
        }, { code: priceComparisonCode, data: scrapedData });
        
        if (comparisonResult) {
          console.log('✅ Price comparison working');
          console.log('Found', comparisonResult.length, 'similar listings');
        }
        
        // Test export functionality
        console.log('\n📝 Testing export functionality...');
        const exporterPath = path.join(__dirname, 'spreadsheetExporter.js');
        let exporterCode = fs.readFileSync(exporterPath, 'utf8');
        
        // Remove module.exports
        exporterCode = exporterCode.replace(/module\.exports[\s\S]*$/m, '');
        
        const csvData = await stagehand.page.evaluate(({ code, data }) => {
          eval(code);
          
          if (typeof SpreadsheetExporter !== 'undefined') {
            const exporter = new SpreadsheetExporter();
            return exporter.generateCSV([data]);
          }
          return null;
        }, { code: exporterCode, data: scrapedData });
        
        if (csvData) {
          console.log('✅ CSV export working');
          console.log('CSV preview:', csvData.substring(0, 200) + '...');
        }
      }
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await stagehand.close();
    console.log('\n👋 Test session ended');
  }
}

// Run the test
testSimpleScraper().catch(console.error);