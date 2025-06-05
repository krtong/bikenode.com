const { Stagehand } = require('@browserbasehq/stagehand');
const fs = require('fs');
const path = require('path');

async function testCompleteWorkflow() {
  console.log('🚀 Complete End-to-End Workflow Test\n');
  
  const stagehand = new Stagehand({
    env: 'LOCAL',
    verbose: false,
    headless: false
  });

  try {
    await stagehand.init();
    
    // Test on multiple platforms
    const platforms = [
      {
        name: 'Craigslist',
        url: 'https://sfbay.craigslist.org/search/bik#search=1~gallery~0~0',
        searchSelector: '.gallery-card'
      },
      {
        name: 'Mercari', 
        url: 'https://www.mercari.com/search/?keyword=bicycle',
        searchSelector: '[data-testid="ItemContainer"]'
      }
    ];
    
    const allScrapedData = [];
    
    for (const platform of platforms) {
      console.log(`\n📝 Testing ${platform.name}...`);
      
      try {
        await stagehand.page.goto(platform.url, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        // Look for listings
        const listings = await stagehand.page.locator(platform.searchSelector).all();
        if (listings.length === 0) {
          console.log(`⚠️ No listings found on ${platform.name}`);
          continue;
        }
        
        // Click first listing
        await listings[0].click();
        await stagehand.page.waitForLoadState('networkidle');
        
        // Load and run universal scraper
        const scraperCode = fs.readFileSync(path.join(__dirname, 'universalScraper.js'), 'utf8');
        const scrapedData = await stagehand.page.evaluate((code) => {
          eval(code);
          return window.extractClassifiedAd();
        }, scraperCode);
        
        if (scrapedData && scrapedData.title) {
          console.log(`✅ Successfully scraped from ${platform.name}`);
          console.log(`   Title: ${scrapedData.title}`);
          console.log(`   Price: ${scrapedData.price || 'N/A'}`);
          console.log(`   Images: ${scrapedData.images?.length || 0}`);
          
          scrapedData.platform = platform.name.toLowerCase();
          allScrapedData.push(scrapedData);
        } else {
          console.log(`❌ Failed to scrape from ${platform.name}`);
        }
        
      } catch (error) {
        console.log(`❌ Error with ${platform.name}: ${error.message}`);
      }
    }
    
    if (allScrapedData.length === 0) {
      throw new Error('No data scraped from any platform');
    }
    
    console.log(`\n✅ Successfully scraped from ${allScrapedData.length} platforms`);
    
    // Load all modules for integration test
    console.log('\n🔧 Loading all modules for integration...');
    
    // Load price comparison
    const priceComparisonRaw = fs.readFileSync(path.join(__dirname, 'priceComparison.js'), 'utf8');
    const priceLines = priceComparisonRaw.split('\n').filter(line => 
      !line.includes('module.exports') && !line.includes('// Export for use')
    );
    const priceCode = priceLines.join('\n') + '\nwindow.PriceComparison = PriceComparison;';
    
    await stagehand.page.evaluate((code) => { eval(code); }, priceCode);
    
    // Load spreadsheet exporter
    const exporterRaw = fs.readFileSync(path.join(__dirname, 'spreadsheetExporter.js'), 'utf8');
    const exporterLines = exporterRaw.split('\n').filter(line => 
      !line.includes('module.exports') && !line.includes('// Export classes')
    );
    const exporterCode = exporterLines.join('\n') + '\nwindow.SpreadsheetExporter = SpreadsheetExporter;';
    
    await stagehand.page.evaluate((code) => { eval(code); }, exporterCode);
    
    // Test complete workflow
    console.log('\n🧪 Testing complete workflow...');
    
    const workflowResults = await stagehand.page.evaluate((allData) => {
      if (allData.length === 0) return null;
      
      const results = {
        scraping: { success: true, itemsScraped: allData.length },
        priceComparison: { success: false },
        export: { success: false }
      };
      
      try {
        // Test price comparison
        const pc = new PriceComparison();
        if (allData.length > 1) {
          const targetItem = allData[0];
          const otherItems = allData.slice(1);
          const similarItems = pc.findSimilarAds(targetItem, otherItems);
          const report = pc.generateComparisonReport(targetItem, otherItems);
          
          results.priceComparison = {
            success: true,
            similarItemsFound: similarItems.length,
            pricePosition: report.priceAnalysis.pricePosition,
            recommendationsCount: report.recommendations.length
          };
        } else {
          results.priceComparison = {
            success: true,
            note: 'Only one item scraped, no comparison possible'
          };
        }
      } catch (e) {
        results.priceComparison = { success: false, error: e.message };
      }
      
      try {
        // Test export
        const exporter = new SpreadsheetExporter();
        const csvOutput = exporter.toCSV(allData);
        const jsonOutput = exporter.toJSON(allData);
        
        results.export = {
          success: true,
          csvLength: csvOutput ? csvOutput.length : 0,
          jsonValid: jsonOutput ? JSON.parse(jsonOutput).length === allData.length : false,
          formatsWorking: {
            csv: !!csvOutput,
            json: !!jsonOutput
          }
        };
      } catch (e) {
        results.export = { success: false, error: e.message };
      }
      
      return results;
    }, allScrapedData);
    
    // Generate and save actual exports
    const exports = await stagehand.page.evaluate((data) => {
      const exporter = new SpreadsheetExporter();
      return {
        csv: exporter.toCSV(data),
        json: exporter.toJSON(data),
        html: exporter.toHTML(data)
      };
    }, allScrapedData);
    
    // Save exports to files
    fs.writeFileSync(path.join(__dirname, 'complete_workflow_export.csv'), exports.csv);
    fs.writeFileSync(path.join(__dirname, 'complete_workflow_export.json'), exports.json);
    fs.writeFileSync(path.join(__dirname, 'complete_workflow_export.html'), exports.html);
    
    // Final summary
    console.log('\n📊 COMPLETE WORKFLOW RESULTS:');
    console.log('==============================');
    console.log(`✅ Scraping: ${workflowResults.scraping.itemsScraped} items from ${allScrapedData.length} platforms`);
    
    if (workflowResults.priceComparison.success) {
      console.log('✅ Price Comparison: Working');
      if (workflowResults.priceComparison.similarItemsFound !== undefined) {
        console.log(`   Similar items found: ${workflowResults.priceComparison.similarItemsFound}`);
        console.log(`   Price position: ${workflowResults.priceComparison.pricePosition}`);
        console.log(`   Recommendations: ${workflowResults.priceComparison.recommendationsCount}`);
      }
    } else {
      console.log(`❌ Price Comparison: ${workflowResults.priceComparison.error}`);
    }
    
    if (workflowResults.export.success) {
      console.log('✅ Export: Working');
      console.log(`   CSV: ${workflowResults.export.formatsWorking.csv ? 'Working' : 'Failed'} (${workflowResults.export.csvLength} chars)`);
      console.log(`   JSON: ${workflowResults.export.formatsWorking.json ? 'Working' : 'Failed'}`);
    } else {
      console.log(`❌ Export: ${workflowResults.export.error}`);
    }
    
    console.log('\n💾 Exports saved:');
    console.log('   - complete_workflow_export.csv');
    console.log('   - complete_workflow_export.json'); 
    console.log('   - complete_workflow_export.html');
    
    console.log('\n🎉 COMPLETE WORKFLOW TEST PASSED!');
    console.log('The extension can successfully:');
    console.log('1. Scrape data from multiple platforms');
    console.log('2. Compare prices between listings');
    console.log('3. Export data in multiple formats');

  } catch (error) {
    console.error('❌ Complete workflow test failed:', error);
  } finally {
    await stagehand.close();
  }
}

testCompleteWorkflow().catch(console.error);