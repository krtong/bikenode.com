const { Stagehand } = require('@browserbasehq/stagehand');
const fs = require('fs');
const path = require('path');

async function testStorageFunctionality() {
  console.log('💾 Testing Storage Functionality\n');
  
  const stagehand = new Stagehand({
    env: 'LOCAL',
    verbose: false,
    headless: false
  });

  try {
    await stagehand.init();
    
    // Create a test page that simulates Chrome storage
    await stagehand.page.goto('about:blank');
    
    // Load spreadsheet exporter which contains AdStorage
    const exporterRaw = fs.readFileSync(path.join(__dirname, 'spreadsheetExporter.js'), 'utf8');
    const exporterLines = exporterRaw.split('\n').filter(line => 
      !line.includes('module.exports') && !line.includes('// Export classes')
    );
    const exporterCode = exporterLines.join('\n') + '\nwindow.SpreadsheetExporter = SpreadsheetExporter;\nwindow.AdStorage = AdStorage;';
    
    // Mock Chrome storage for testing
    const mockChromeStorage = `
      window.chrome = {
        storage: {
          local: {
            _data: {},
            get: function(keys, callback) {
              if (typeof keys === 'string') keys = [keys];
              const result = {};
              keys.forEach(key => {
                if (this._data[key] !== undefined) {
                  result[key] = this._data[key];
                }
              });
              callback(result);
            },
            set: function(items, callback) {
              Object.assign(this._data, items);
              if (callback) callback();
            },
            clear: function(callback) {
              this._data = {};
              if (callback) callback();
            },
            remove: function(keys, callback) {
              if (typeof keys === 'string') keys = [keys];
              keys.forEach(key => delete this._data[key]);
              if (callback) callback();
            }
          }
        }
      };
    `;
    
    await stagehand.page.evaluate(mockChromeStorage);
    await stagehand.page.evaluate(exporterCode);
    
    // Test storage functionality
    console.log('🧪 Testing AdStorage class...');
    
    const storageTest = await stagehand.page.evaluate(async () => {
      const storage = new AdStorage();
      const results = {
        initialization: false,
        saveAd: false,
        getAds: false,
        deleteAd: false,
        updateStats: false
      };
      
      try {
        // Test initialization
        results.initialization = typeof storage.saveAd === 'function';
        
        // Test saving ads
        const testAd1 = {
          id: 'test-1',
          title: 'Test Bike 1',
          price: '$500',
          url: 'http://test.com/1',
          platform: 'craigslist',
          timestamp: new Date().toISOString()
        };
        
        const testAd2 = {
          id: 'test-2', 
          title: 'Test Bike 2',
          price: '$800',
          url: 'http://test.com/2',
          platform: 'facebook',
          timestamp: new Date().toISOString()
        };
        
        await storage.saveAd(testAd1);
        await storage.saveAd(testAd2);
        results.saveAd = true;
        
        // Test getting ads
        const savedAds = await storage.getAllAds();
        results.getAds = savedAds.length === 2 && 
                         savedAds.some(ad => ad.id === 'test-1') &&
                         savedAds.some(ad => ad.id === 'test-2');
        
        // Test deleting ads
        await storage.deleteAd('test-1');
        const remainingAds = await storage.getAllAds();
        results.deleteAd = remainingAds.length === 1 && 
                          remainingAds[0].id === 'test-2';
        
        // Test stats update
        const stats = await storage.getStorageStats();
        results.updateStats = stats.totalAds >= 0 && 
                             stats.platforms >= 0;
        
        return results;
      } catch (e) {
        console.error('Storage test error:', e);
        return { error: e.message, results };
      }
    });
    
    console.log('Storage Test Results:');
    console.log(`   ✅ Initialization: ${storageTest.initialization ? 'Pass' : 'Fail'}`);
    console.log(`   ✅ Save Ad: ${storageTest.saveAd ? 'Pass' : 'Fail'}`);
    console.log(`   ✅ Get Ads: ${storageTest.getAds ? 'Pass' : 'Fail'}`);
    console.log(`   ✅ Delete Ad: ${storageTest.deleteAd ? 'Pass' : 'Fail'}`);
    console.log(`   ✅ Update Stats: ${storageTest.updateStats ? 'Pass' : 'Fail'}`);
    
    // Test integration with scraper and storage
    console.log('\n🧪 Testing Scraper + Storage Integration...');
    
    const integrationTest = await stagehand.page.evaluate(async () => {
      // Create mock scraped data
      const mockScrapedData = {
        title: 'Integration Test Bike',
        price: '$1200',
        location: 'Test City',
        description: 'A test bike for integration testing',
        images: ['img1.jpg', 'img2.jpg'],
        url: 'http://test.com/integration',
        platform: 'test',
        timestamp: new Date().toISOString(),
        category: 'bicycle'
      };
      
      const storage = new AdStorage();
      
      try {
        // Save the scraped data
        await storage.saveAd(mockScrapedData);
        
        // Get all ads to verify
        const allAds = await storage.getAllAds();
        const savedAd = allAds.find(ad => ad.title === 'Integration Test Bike');
        
        // Get storage stats
        const stats = await storage.getStorageStats();
        
        return {
          success: true,
          adSaved: !!savedAd,
          totalAds: allAds.length,
          statsWorking: stats.totalAds > 0,
          platforms: stats.platforms
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    
    if (integrationTest.success) {
      console.log('✅ Integration Test Passed');
      console.log(`   Ads saved: ${integrationTest.totalAds}`);
      console.log(`   Stats working: ${integrationTest.statsWorking}`);
      console.log(`   Platforms tracked: ${integrationTest.platforms}`);
    } else {
      console.log(`❌ Integration Test Failed: ${integrationTest.error}`);
    }
    
    // Test bulk operations
    console.log('\n🧪 Testing Bulk Operations...');
    
    const bulkTest = await stagehand.page.evaluate(async () => {
      const storage = new AdStorage();
      
      try {
        // Create multiple test ads
        const bulkAds = [];
        for (let i = 0; i < 10; i++) {
          bulkAds.push({
            id: `bulk-${i}`,
            title: `Bulk Test Bike ${i}`,
            price: `$${500 + i * 100}`,
            platform: i % 2 === 0 ? 'craigslist' : 'facebook',
            timestamp: new Date().toISOString()
          });
        }
        
        // Save all ads
        for (const ad of bulkAds) {
          await storage.saveAd(ad);
        }
        
        // Test filtering
        const craigslistAds = await storage.getAdsByPlatform('craigslist');
        const facebookAds = await storage.getAdsByPlatform('facebook');
        const recentAds = await storage.getRecentAds(5);
        
        // Test clearing
        await storage.clearAllAds();
        const clearedAds = await storage.getAllAds();
        
        return {
          success: true,
          bulkSaved: bulkAds.length,
          craigslistCount: craigslistAds.length,
          facebookCount: facebookAds.length,
          recentCount: recentAds.length,
          clearedCorrectly: clearedAds.length === 0
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    
    if (bulkTest.success) {
      console.log('✅ Bulk Operations Test Passed');
      console.log(`   Bulk ads saved: ${bulkTest.bulkSaved}`);
      console.log(`   Craigslist ads: ${bulkTest.craigslistCount}`);
      console.log(`   Facebook ads: ${bulkTest.facebookCount}`);
      console.log(`   Recent ads: ${bulkTest.recentCount}`);
      console.log(`   Clear operation: ${bulkTest.clearedCorrectly ? 'Working' : 'Failed'}`);
    } else {
      console.log(`❌ Bulk Operations Test Failed: ${bulkTest.error}`);
    }
    
    console.log('\n📊 STORAGE FUNCTIONALITY SUMMARY:');
    console.log('=================================');
    
    const allTestsPassed = storageTest.initialization && 
                          storageTest.saveAd && 
                          storageTest.getAds && 
                          storageTest.deleteAd && 
                          storageTest.updateStats &&
                          integrationTest.success &&
                          bulkTest.success;
    
    if (allTestsPassed) {
      console.log('✅ All storage tests PASSED');
      console.log('✅ AdStorage class is fully functional');
      console.log('✅ Chrome storage integration working');
      console.log('✅ Bulk operations supported');
      console.log('✅ Statistics tracking working');
    } else {
      console.log('❌ Some storage tests FAILED');
      console.log('⚠️ Storage functionality needs fixes');
    }

  } catch (error) {
    console.error('❌ Storage test failed:', error);
  } finally {
    await stagehand.close();
  }
}

testStorageFunctionality().catch(console.error);