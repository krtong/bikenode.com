const { Stagehand } = require('@browserbasehq/stagehand');
const fs = require('fs');
const path = require('path');

async function debugModuleLoading() {
  console.log('🔍 Debugging Module Loading Issues\n');
  
  const stagehand = new Stagehand({
    env: 'LOCAL',
    verbose: false,
    headless: false
  });

  try {
    await stagehand.init();
    await stagehand.page.goto('about:blank');
    
    // Test 1: Load priceComparison.js exactly as-is
    console.log('📝 Test 1: Load priceComparison.js as-is');
    const priceComparisonRaw = fs.readFileSync(path.join(__dirname, 'priceComparison.js'), 'utf8');
    
    const test1Result = await stagehand.page.evaluate((code) => {
      try {
        eval(code);
        return {
          success: true,
          hasClass: typeof PriceComparison !== 'undefined',
          windowKeys: Object.keys(window).filter(k => k.includes('Price') || k.includes('Comparison'))
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
          errorLine: e.lineNumber || 'unknown'
        };
      }
    }, priceComparisonRaw);
    
    console.log('Result:', test1Result);
    
    // Test 2: Load with my cleaning method
    console.log('\n📝 Test 2: Load with cleaning');
    let cleanedCode = priceComparisonRaw.replace(/\/\/ Export for use in other scripts[\s\S]*$/m, '');
    
    const test2Result = await stagehand.page.evaluate((code) => {
      try {
        eval(code);
        return {
          success: true,
          hasClass: typeof PriceComparison !== 'undefined',
          codeLength: code.length
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
          codePreview: code.slice(-200) // Last 200 chars to see what's broken
        };
      }
    }, cleanedCode);
    
    console.log('Result:', test2Result);
    
    // Test 3: Manual cleaning approach
    console.log('\n📝 Test 3: Manual approach');
    const lines = priceComparisonRaw.split('\n');
    const filteredLines = lines.filter(line => {
      return !line.includes('module.exports') && 
             !line.includes('// Export for use') &&
             !line.includes('// Make globally available') &&
             !line.trim().startsWith('window.PriceComparison');
    });
    const manualCleaned = filteredLines.join('\n') + '\n\n// Make globally available\nwindow.PriceComparison = PriceComparison;';
    
    const test3Result = await stagehand.page.evaluate((code) => {
      try {
        eval(code);
        return {
          success: true,
          hasClass: typeof PriceComparison !== 'undefined',
          canInstantiate: (() => {
            try {
              const pc = new PriceComparison();
              return pc.parsePrice('$123.45') === 123.45;
            } catch (e) {
              return false;
            }
          })()
        };
      } catch (e) {
        return {
          success: false,
          error: e.message
        };
      }
    }, manualCleaned);
    
    console.log('Result:', test3Result);
    
    // Test 4: SpreadsheetExporter
    console.log('\n📝 Test 4: SpreadsheetExporter');
    const exporterRaw = fs.readFileSync(path.join(__dirname, 'spreadsheetExporter.js'), 'utf8');
    const exporterLines = exporterRaw.split('\n');
    const exporterFiltered = exporterLines.filter(line => {
      return !line.includes('module.exports') && 
             !line.includes('// Export classes') &&
             !line.includes('// Make globally available') &&
             !line.trim().startsWith('window.SpreadsheetExporter') &&
             !line.trim().startsWith('window.AdStorage');
    });
    const exporterCleaned = exporterFiltered.join('\n') + '\n\n// Make globally available\nwindow.SpreadsheetExporter = SpreadsheetExporter;\nwindow.AdStorage = AdStorage;';
    
    const test4Result = await stagehand.page.evaluate((code) => {
      try {
        eval(code);
        return {
          success: true,
          hasExporter: typeof SpreadsheetExporter !== 'undefined',
          hasStorage: typeof AdStorage !== 'undefined',
          canUse: (() => {
            try {
              const exporter = new SpreadsheetExporter();
              const testData = [{ title: 'Test', price: '$100' }];
              const csv = exporter.generateCSV(testData);
              return csv && csv.length > 0;
            } catch (e) {
              return false;
            }
          })()
        };
      } catch (e) {
        return {
          success: false,
          error: e.message
        };
      }
    }, exporterCleaned);
    
    console.log('Result:', test4Result);

  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    await stagehand.close();
  }
}

debugModuleLoading().catch(console.error);