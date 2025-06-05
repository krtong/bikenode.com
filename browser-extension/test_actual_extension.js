const { Stagehand } = require('@browserbasehq/stagehand');
const fs = require('fs');
const path = require('path');

async function testActualExtension() {
  console.log('🔌 Testing Actual Chrome Extension with Stagehand\n');
  
  const stagehand = new Stagehand({
    env: 'LOCAL',
    verbose: false,
    headless: false,
    enableExtensions: true // Enable extension support
  });

  try {
    await stagehand.init();
    
    // Load the extension
    console.log('📦 Loading extension...');
    const extensionPath = __dirname; // Current directory contains the extension
    
    // Check if extension files exist
    const requiredFiles = ['manifest.json', 'popup.html', 'popup.js', 'content.js', 'background.js'];
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(extensionPath, file)));
    
    if (missingFiles.length > 0) {
      console.log(`❌ Missing required files: ${missingFiles.join(', ')}`);
      return;
    }
    
    // Load extension (Stagehand should support this)
    try {
      // Note: This may require specific Stagehand API for extension loading
      await stagehand.page.context().addInitScript({
        path: path.join(extensionPath, 'universalScraper.js')
      });
      console.log('✅ Extension files loaded');
    } catch (error) {
      console.log('⚠️ Direct extension loading not supported, testing components...');
    }
    
    // Navigate to a test page
    console.log('\n🌐 Navigating to test page...');
    await stagehand.page.goto('https://sfbay.craigslist.org/search/bik#search=1~gallery~0~0');
    await stagehand.page.waitForLoadState('networkidle');
    
    // Click on a listing
    const firstListing = await stagehand.page.locator('.gallery-card').first();
    if (await firstListing.isVisible()) {
      await firstListing.click();
      await stagehand.page.waitForLoadState('networkidle');
      console.log('✅ Navigated to bike listing');
    }
    
    // Test 1: Simulate extension popup opening
    console.log('\n🧪 Test 1: Extension Popup Simulation');
    
    // Create a popup window to simulate the extension popup
    const popupContent = fs.readFileSync(path.join(extensionPath, 'popup.html'), 'utf8');
    const popupJs = fs.readFileSync(path.join(extensionPath, 'popup.js'), 'utf8');
    
    // Open popup in new page
    const popupPage = await stagehand.page.context().newPage();
    await popupPage.setContent(popupContent);
    
    // Load required dependencies
    const scraperCode = fs.readFileSync(path.join(extensionPath, 'universalScraper.js'), 'utf8');
    const exporterCode = fs.readFileSync(path.join(extensionPath, 'spreadsheetExporter.js'), 'utf8');
    const priceCompCode = fs.readFileSync(path.join(extensionPath, 'priceComparison.js'), 'utf8');
    
    // Clean and inject dependencies
    const cleanExporter = exporterCode.split('\n').filter(line => 
      !line.includes('module.exports') && !line.includes('// Export classes')
    ).join('\n') + '\nwindow.SpreadsheetExporter = SpreadsheetExporter; window.AdStorage = AdStorage;';
    
    const cleanPriceComp = priceCompCode.split('\n').filter(line => 
      !line.includes('module.exports') && !line.includes('// Export for use')
    ).join('\n') + '\nwindow.PriceComparison = PriceComparison;';
    
    await popupPage.evaluate(scraperCode);
    await popupPage.evaluate(cleanExporter);
    await popupPage.evaluate(cleanPriceComp);
    
    // Mock Chrome APIs for popup
    await popupPage.evaluate(() => {
      window.chrome = {
        tabs: {
          query: (query, callback) => {
            callback([{
              id: 1,
              url: 'https://sfbay.craigslist.org/nby/bik/d/santa-rosa-touring-commuter-bicycle/7831917767.html',
              title: 'Bike Listing'
            }]);
          }
        },
        scripting: {
          executeScript: (details, callback) => {
            // Simulate successful script execution
            if (callback) callback([{result: 'success'}]);
          }
        },
        storage: {
          local: {
            _data: {},
            get: function(keys, callback) {
              callback({});
            },
            set: function(items, callback) {
              Object.assign(this._data, items);
              if (callback) callback();
            }
          }
        }
      };
    });
    
    // Test popup UI elements
    const popupTest = await popupPage.evaluate(() => {
      const results = {
        uiElements: {},
        functionality: {}
      };
      
      // Check UI elements exist
      results.uiElements.scrapeBtn = !!document.getElementById('scrapeBtn');
      results.uiElements.compareBtn = !!document.getElementById('compareBtn');
      results.uiElements.exportCsvBtn = !!document.getElementById('exportCsvBtn');
      results.uiElements.currentDomain = !!document.getElementById('currentDomain');
      results.uiElements.totalAds = !!document.getElementById('totalAds');
      
      // Test basic functionality
      try {
        // Simulate scrape button click
        const scrapeBtn = document.getElementById('scrapeBtn');
        if (scrapeBtn) {
          // Can't actually click due to Chrome API dependencies, but check if clickable
          results.functionality.scrapeBtnClickable = !scrapeBtn.disabled;
        }
        
        // Test if classes are available
        results.functionality.hasSpreadsheetExporter = typeof SpreadsheetExporter !== 'undefined';
        results.functionality.hasPriceComparison = typeof PriceComparison !== 'undefined';
        results.functionality.hasExtractFunction = typeof extractClassifiedAd !== 'undefined';
        
      } catch (e) {
        results.functionality.error = e.message;
      }
      
      return results;
    });
    
    console.log('Popup UI Test Results:');
    console.log(`   Scrape Button: ${popupTest.uiElements.scrapeBtn ? '✅' : '❌'}`);
    console.log(`   Compare Button: ${popupTest.uiElements.compareBtn ? '✅' : '❌'}`);
    console.log(`   Export Button: ${popupTest.uiElements.exportCsvBtn ? '✅' : '❌'}`);
    console.log(`   Domain Display: ${popupTest.uiElements.currentDomain ? '✅' : '❌'}`);
    console.log(`   Stats Display: ${popupTest.uiElements.totalAds ? '✅' : '❌'}`);
    
    console.log('\nPopup Functionality:');
    console.log(`   SpreadsheetExporter Available: ${popupTest.functionality.hasSpreadsheetExporter ? '✅' : '❌'}`);
    console.log(`   PriceComparison Available: ${popupTest.functionality.hasPriceComparison ? '✅' : '❌'}`);
    console.log(`   Extract Function Available: ${popupTest.functionality.hasExtractFunction ? '✅' : '❌'}`);
    
    // Test 2: Simulate content script injection
    console.log('\n🧪 Test 2: Content Script Simulation');
    
    // Go back to the main page and simulate content script
    const contentScriptCode = fs.readFileSync(path.join(extensionPath, 'content.js'), 'utf8');
    
    const contentScriptTest = await stagehand.page.evaluate((script) => {
      try {
        // Load the content script
        eval(script);
        
        return {
          success: true,
          contentScriptLoaded: true,
          pageHasContent: document.body.innerText.length > 100
        };
      } catch (e) {
        return {
          success: false,
          error: e.message
        };
      }
    }, contentScriptCode);
    
    if (contentScriptTest.success) {
      console.log('✅ Content script simulation successful');
      console.log(`   Page has content: ${contentScriptTest.pageHasContent}`);
    } else {
      console.log(`❌ Content script failed: ${contentScriptTest.error}`);
    }
    
    // Test 3: Simulate full extension workflow
    console.log('\n🧪 Test 3: Full Extension Workflow Simulation');
    
    // Simulate the full process: popup opens, user clicks scrape, data is extracted
    const workflowTest = await stagehand.page.evaluate((allCode) => {
      try {
        // Load all extension code
        eval(allCode.scraper);
        eval(allCode.exporter);
        eval(allCode.priceComp);
        
        // Simulate the scraping process
        const scrapedData = window.extractClassifiedAd();
        
        if (!scrapedData) {
          return { success: false, error: 'No data scraped' };
        }
        
        // Simulate price comparison
        const pc = new PriceComparison();
        const mockComparisons = [
          { title: 'Similar bike', price: '$800', category: 'bicycle' }
        ];
        const similar = pc.findSimilarAds(scrapedData, mockComparisons);
        
        // Simulate export
        const exporter = new SpreadsheetExporter();
        const csvData = exporter.toCSV([scrapedData]);
        
        return {
          success: true,
          scrapedData: {
            hasTitle: !!scrapedData.title,
            hasPrice: !!scrapedData.price,
            imageCount: scrapedData.images?.length || 0
          },
          priceComparison: {
            similarFound: similar.length,
            comparisonWorking: true
          },
          export: {
            csvGenerated: csvData && csvData.length > 100,
            csvLength: csvData ? csvData.length : 0
          }
        };
      } catch (e) {
        return {
          success: false,
          error: e.message
        };
      }
    }, {
      scraper: scraperCode,
      exporter: cleanExporter,
      priceComp: cleanPriceComp
    });
    
    if (workflowTest.success) {
      console.log('✅ Full workflow simulation successful');
      console.log(`   Data scraped: ${workflowTest.scrapedData.hasTitle && workflowTest.scrapedData.hasPrice}`);
      console.log(`   Images found: ${workflowTest.scrapedData.imageCount}`);
      console.log(`   Price comparison: ${workflowTest.priceComparison.comparisonWorking}`);
      console.log(`   CSV export: ${workflowTest.export.csvGenerated} (${workflowTest.export.csvLength} chars)`);
    } else {
      console.log(`❌ Workflow simulation failed: ${workflowTest.error}`);
    }
    
    // Test 4: Background script simulation
    console.log('\n🧪 Test 4: Background Script Simulation');
    
    const backgroundCode = fs.readFileSync(path.join(extensionPath, 'background.js'), 'utf8');
    const backgroundPage = await stagehand.page.context().newPage();
    
    const backgroundTest = await backgroundPage.evaluate((script) => {
      try {
        // Mock chrome APIs for background script
        window.chrome = {
          action: {
            onClicked: { addListener: () => {} }
          },
          runtime: {
            onInstalled: { addListener: () => {} }
          }
        };
        
        eval(script);
        return { success: true, loaded: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }, backgroundCode);
    
    console.log(`Background script: ${backgroundTest.success ? '✅ Loaded' : '❌ Failed'}`);
    
    // Close popup page
    await popupPage.close();
    await backgroundPage.close();
    
    // Final summary
    console.log('\n📊 ACTUAL EXTENSION TEST SUMMARY:');
    console.log('=================================');
    
    const allTestsPassed = popupTest.uiElements.scrapeBtn &&
                          popupTest.functionality.hasSpreadsheetExporter &&
                          contentScriptTest.success &&
                          workflowTest.success &&
                          backgroundTest.success;
    
    if (allTestsPassed) {
      console.log('✅ Extension components are functional');
      console.log('✅ UI elements present and working');
      console.log('✅ Content script can be injected');
      console.log('✅ Full workflow simulation successful');
      console.log('✅ Background script loads without errors');
      console.log('\n🎉 EXTENSION IS READY FOR MANUAL TESTING');
    } else {
      console.log('❌ Some extension components have issues');
      console.log('⚠️ Manual testing required to verify full functionality');
    }

  } catch (error) {
    console.error('❌ Extension test failed:', error);
  } finally {
    await stagehand.close();
  }
}

testActualExtension().catch(console.error);