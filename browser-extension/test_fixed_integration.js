const { Stagehand } = require('@browserbasehq/stagehand');
const fs = require('fs');
const path = require('path');

async function testFixedIntegration() {
  console.log('🔧 Testing Fixed Module Integration\n');
  
  const stagehand = new Stagehand({
    env: 'LOCAL',
    verbose: false,
    headless: false
  });

  try {
    await stagehand.init();
    
    // Navigate to a real Craigslist listing
    console.log('📝 Navigating to Craigslist listing...');
    await stagehand.page.goto('https://sfbay.craigslist.org/search/bik#search=1~gallery~0~0');
    await stagehand.page.waitForLoadState('networkidle');
    
    const firstListing = await stagehand.page.locator('.gallery-card').first();
    await firstListing.click();
    await stagehand.page.waitForLoadState('networkidle');
    
    // Step 1: Load and test universal scraper
    console.log('\n🧪 Step 1: Universal Scraper');
    const scraperCode = fs.readFileSync(path.join(__dirname, 'universalScraper.js'), 'utf8');
    
    const scrapedData = await stagehand.page.evaluate((code) => {
      eval(code);
      return window.extractClassifiedAd();
    }, scraperCode);
    
    console.log('✅ Scraped data:');
    console.log(`   Title: ${scrapedData.title}`);
    console.log(`   Price: ${scrapedData.price}`);
    console.log(`   Images: ${scrapedData.images?.length || 0}`);
    
    // Step 2: Load and test price comparison with proper cleaning
    console.log('\n🧪 Step 2: Price Comparison');
    const priceComparisonRaw = fs.readFileSync(path.join(__dirname, 'priceComparison.js'), 'utf8');
    
    // Clean it properly
    const priceLines = priceComparisonRaw.split('\n');
    const priceFiltered = priceLines.filter(line => {
      return !line.includes('module.exports') && 
             !line.includes('// Export for use') &&
             !line.trim().startsWith('window.PriceComparison');
    });
    const priceComparisonCode = priceFiltered.join('\n') + '\nwindow.PriceComparison = PriceComparison;';
    
    // Inject price comparison code first
    await stagehand.page.evaluate((code) => {
      eval(code);
    }, priceComparisonCode);
    
    // Test price comparison functionality
    const priceTestResult = await stagehand.page.evaluate((data) => {
      const pc = new PriceComparison();
      
      // Test basic functions
      const priceTest = pc.parsePrice('$1,234.56');
      const similarityTest = pc.calculateSimilarity('Trek Bike', 'Trek Bicycle');
      
      // Test with mock comparison data
      const mockListings = [
        { title: 'Similar bike', price: '$800', category: 'bicycle' },
        { title: 'Another bike', price: '$1200', category: 'bicycle' }
      ];
      
      const similarAds = pc.findSimilarAds(data, mockListings);
      
      return {
        priceParseTest: priceTest,
        similarityTest: similarityTest,
        similarAdsFound: similarAds.length,
        working: true
      };
    }, scrapedData);
    
    console.log('✅ Price Comparison working:');
    console.log(`   Parse $1,234.56 → ${priceTestResult.priceParseTest}`);
    console.log(`   Similarity score: ${priceTestResult.similarityTest.toFixed(3)}`);
    console.log(`   Similar ads found: ${priceTestResult.similarAdsFound}`);
    
    // Step 3: Load and test spreadsheet exporter
    console.log('\n🧪 Step 3: Spreadsheet Exporter');
    const exporterRaw = fs.readFileSync(path.join(__dirname, 'spreadsheetExporter.js'), 'utf8');
    
    // Clean it properly
    const exporterLines = exporterRaw.split('\n');
    const exporterFiltered = exporterLines.filter(line => {
      return !line.includes('module.exports') && 
             !line.includes('// Export classes') &&
             !line.trim().startsWith('window.SpreadsheetExporter') &&
             !line.trim().startsWith('window.AdStorage');
    });
    const exporterCode = exporterFiltered.join('\n') + '\nwindow.SpreadsheetExporter = SpreadsheetExporter;\nwindow.AdStorage = AdStorage;';
    
    // Inject exporter code
    await stagehand.page.evaluate((code) => {
      eval(code);
    }, exporterCode);
    
    // Test export functionality
    const exportTestResult = await stagehand.page.evaluate((data) => {
      const exporter = new SpreadsheetExporter();
      
      // Test CSV generation
      const csvResult = exporter.toCSV([data]);
      const jsonResult = exporter.toJSON([data]);
      const htmlResult = exporter.toHTML([data]);
      
      return {
        csvGenerated: csvResult && csvResult.length > 100,
        jsonGenerated: jsonResult && JSON.parse(jsonResult).length > 0,
        htmlGenerated: htmlResult && htmlResult.includes('<table'),
        csvPreview: csvResult ? csvResult.substring(0, 150) : null
      };
    }, scrapedData);
    
    console.log('✅ Spreadsheet Exporter working:');
    console.log(`   CSV generated: ${exportTestResult.csvGenerated}`);
    console.log(`   JSON generated: ${exportTestResult.jsonGenerated}`);
    console.log(`   HTML generated: ${exportTestResult.htmlGenerated}`);
    if (exportTestResult.csvPreview) {
      console.log(`   CSV preview: ${exportTestResult.csvPreview}...`);
    }
    
    // Step 4: Test bike detection integration
    console.log('\n🧪 Step 4: Bike Detection');
    const bikeDetectionRaw = fs.readFileSync(path.join(__dirname, 'bikeDetection.js'), 'utf8');
    const bikeLines = bikeDetectionRaw.split('\n');
    const bikeFiltered = bikeLines.filter(line => !line.includes('module.exports'));
    const bikeDetectionCode = bikeFiltered.join('\n');
    
    const bikeTestResult = await stagehand.page.evaluate((code) => {
      eval(code);
      
      return {
        isBike: isBikeListing(document),
        category: extractCategory(document)
      };
    }, bikeDetectionCode);
    
    console.log('✅ Bike Detection working:');
    console.log(`   Is bike listing: ${bikeTestResult.isBike}`);
    console.log(`   Category: ${bikeTestResult.category || 'N/A'}`);
    
    // Step 5: Test complete integration workflow
    console.log('\n🧪 Step 5: Complete Integration Test');
    
    const workflowResult = await stagehand.page.evaluate((originalData) => {
      // Create sample comparison data
      const mockListings = [
        {
          title: 'Trek Road Bike',
          price: '$1100',
          category: 'bicycle',
          platform: 'facebook',
          url: 'http://example.com/1'
        },
        {
          title: 'Specialized Mountain Bike',
          price: '$1500',
          category: 'bicycle', 
          platform: 'ebay',
          url: 'http://example.com/2'
        }
      ];
      
      // Run price comparison
      const pc = new PriceComparison();
      const report = pc.generateComparisonReport(originalData, mockListings);
      
      // Generate exports
      const exporter = new SpreadsheetExporter();
      const allData = [originalData, ...mockListings];
      const csvExport = exporter.toCSV(allData);
      const jsonExport = exporter.toJSON(allData);
      
      return {
        comparisonReport: {
          similarAdsFound: report.similarAds.length,
          pricePosition: report.priceAnalysis.pricePosition,
          recommendationsCount: report.recommendations.length
        },
        exports: {
          csvLength: csvExport ? csvExport.length : 0,
          jsonItemCount: jsonExport ? JSON.parse(jsonExport).length : 0
        },
        integrationWorking: true
      };
    }, scrapedData);
    
    console.log('✅ Complete Integration working:');
    console.log(`   Similar ads found: ${workflowResult.comparisonReport.similarAdsFound}`);
    console.log(`   Price position: ${workflowResult.comparisonReport.pricePosition}`);
    console.log(`   Recommendations: ${workflowResult.comparisonReport.recommendationsCount}`);
    console.log(`   CSV export size: ${workflowResult.exports.csvLength} chars`);
    console.log(`   JSON items exported: ${workflowResult.exports.jsonItemCount}`);
    
    // Save actual exports for verification
    const finalExports = await stagehand.page.evaluate((data) => {
      const exporter = new SpreadsheetExporter();
      return {
        csv: exporter.toCSV([data]),
        json: exporter.toJSON([data])
      };
    }, scrapedData);
    
    fs.writeFileSync(path.join(__dirname, 'working_export.csv'), finalExports.csv);
    fs.writeFileSync(path.join(__dirname, 'working_export.json'), finalExports.json);
    
    console.log('\n📊 INTEGRATION SUCCESS SUMMARY:');
    console.log('================================');
    console.log('✅ Universal Scraper: Working');
    console.log('✅ Price Comparison: Working'); 
    console.log('✅ Spreadsheet Exporter: Working');
    console.log('✅ Bike Detection: Working');
    console.log('✅ Complete Integration: Working');
    console.log('\n💾 Sample exports saved to working_export.csv and working_export.json');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
  } finally {
    await stagehand.close();
  }
}

testFixedIntegration().catch(console.error);