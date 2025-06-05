const fs = require('fs');
const path = require('path');

async function testExportFix() {
  console.log('🔧 Testing Export Function Fixes\n');
  
  // Load the export code
  const exporterCode = fs.readFileSync(path.join(__dirname, 'spreadsheetExporter.js'), 'utf8');
  
  // Test in Node.js environment
  eval(exporterCode.replace(/module\.exports.*/, ''));
  
  // Test data that matches real scraping structure
  const testData = [
    {
      title: '1991 Kestrel 200SC Dura-Ace 7400 2x8 speed 54cm',
      price: '$400',
      platform: 'craigslist',
      category: 'bicycle',
      location: 'santa rosa',
      description: 'Vintage road bike in excellent condition with Dura-Ace components',
      images: ['img1.jpg', 'img2.jpg'],
      timestamp: new Date().toISOString(),
      url: 'https://example.com/listing1',
      domain: 'craigslist.org'
    },
    {
      title: 'Trek Mountain Bike 29er',
      price: '$1200',
      platform: 'facebook',
      category: 'bicycle', 
      location: 'oakland',
      description: 'Great mountain bike for trails and adventure',
      images: ['img3.jpg'],
      timestamp: new Date().toISOString(),
      url: 'https://example.com/listing2',
      domain: 'facebook.com'
    }
  ];
  
  try {
    console.log('📊 Testing CSV Export...');
    const exporter = new SpreadsheetExporter();
    const csvData = exporter.toCSV(testData);
    
    console.log(`✅ CSV generated: ${csvData.length} characters`);
    console.log('CSV Preview:');
    console.log(csvData.substring(0, 200) + '...\n');
    
    console.log('📊 Testing JSON Export...');
    const jsonData = exporter.toJSON(testData);
    const parsedJson = JSON.parse(jsonData);
    
    console.log(`✅ JSON generated: ${jsonData.length} characters, ${parsedJson.length} items`);
    console.log('JSON Preview:');
    console.log(JSON.stringify(parsedJson[0], null, 2).substring(0, 300) + '...\n');
    
    console.log('📊 Testing HTML Export...');
    const htmlData = exporter.toHTML(testData);
    
    console.log(`✅ HTML generated: ${htmlData.length} characters`);
    console.log('HTML has table:', htmlData.includes('<table'));
    console.log('HTML Preview:');
    console.log(htmlData.substring(0, 300) + '...\n');
    
    // Test with storage class
    console.log('💾 Testing AdStorage class...');
    const storage = new AdStorage();
    
    // Test saving ads
    for (const ad of testData) {
      await storage.saveAd(ad);
    }
    
    const allAds = await storage.getAllAds();
    const stats = await storage.getStorageStats();
    
    console.log(`✅ Storage working: ${allAds.length} ads saved`);
    console.log(`✅ Stats: ${stats.totalAds} total, ${stats.platforms} platforms`);
    
    // Test export with stored data
    const csvFromStorage = exporter.toCSV(allAds);
    console.log(`✅ Export from storage: ${csvFromStorage.length} characters`);
    
    console.log('\n🎉 Export functionality fully working!');
    
  } catch (error) {
    console.error('❌ Export test failed:', error);
  }
}

testExportFix().catch(console.error);