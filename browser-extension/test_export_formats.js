const { Stagehand } = require('@browserbasehq/stagehand');
const fs = require('fs');
const path = require('path');

/**
 * Test 6: Test all export formats (CSV, TSV, JSON, HTML)
 * This test verifies that the SpreadsheetExporter can generate all formats correctly
 */
async function testExportFormats() {
  console.log('🧪 Test 6: Export Format Testing\n');
  
  // Load the exporter module
  const exporterCode = fs.readFileSync(path.join(__dirname, 'spreadsheetExporter.js'), 'utf8')
    .replace(/module\.exports[\s\S]*$/m, '');
  
  // Sample data to export
  const sampleData = [
    {
      title: 'Trek Domane SL 6 Road Bike',
      price: '$3,500',
      location: 'San Francisco, CA',
      platform: 'craigslist',
      category: 'bicycle',
      description: 'Carbon frame road bike, Shimano 105 groupset, excellent condition',
      images: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
      dateScraped: new Date().toISOString(),
      url: 'https://sfbay.craigslist.org/example',
      contactPhone: '555-1234',
      contactEmail: 'seller@example.com'
    },
    {
      title: 'Specialized Stumpjumper Mountain Bike',
      price: '$2,800',
      location: 'Oakland, CA',
      platform: 'offerup',
      category: 'bicycle',
      description: 'Full suspension MTB, 29er wheels, SRAM Eagle drivetrain',
      images: ['mtb1.jpg', 'mtb2.jpg'],
      dateScraped: new Date().toISOString(),
      url: 'https://offerup.com/example',
      contactPhone: '555-5678',
      contactEmail: null
    },
    {
      title: 'Harley Davidson Iron 883',
      price: '$8,500',
      location: 'San Jose, CA',
      platform: 'facebook',
      category: 'motorcycle',
      description: '2019 model, low miles, custom exhaust',
      images: ['harley1.jpg'],
      dateScraped: new Date().toISOString(),
      url: 'https://facebook.com/marketplace/example',
      contactPhone: null,
      contactEmail: 'hd@example.com'
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
    
    // Navigate to a blank page
    await stagehand.page.goto('about:blank');
    
    // Test each export format
    const formats = ['csv', 'tsv', 'json', 'html'];
    const results = {};
    
    for (const format of formats) {
      console.log(`\n📝 Testing ${format.toUpperCase()} export...`);
      
      try {
        const exportResult = await stagehand.page.evaluate(({ code, data, fmt }) => {
          eval(code);
          
          if (typeof SpreadsheetExporter !== 'undefined') {
            const exporter = new SpreadsheetExporter();
            
            switch(fmt) {
              case 'csv':
                return exporter.generateCSV(data);
              case 'tsv':
                return exporter.generateTSV(data);
              case 'json':
                return exporter.generateJSON(data);
              case 'html':
                return exporter.generateHTML(data);
              default:
                return null;
            }
          }
          return null;
        }, { code: exporterCode, data: sampleData, fmt: format });
        
        if (exportResult) {
          console.log(`✅ ${format.toUpperCase()} generated successfully`);
          
          // Save to file for inspection
          const filename = `test_export_sample.${format}`;
          fs.writeFileSync(path.join(__dirname, 'test_exports', filename), exportResult);
          console.log(`💾 Saved to test_exports/${filename}`);
          
          // Validate format
          let isValid = false;
          switch(format) {
            case 'csv':
            case 'tsv':
              const delimiter = format === 'csv' ? ',' : '\t';
              const lines = exportResult.split('\n');
              const headers = lines[0].split(delimiter);
              isValid = headers.length > 5 && lines.length === sampleData.length + 1;
              console.log(`   Headers: ${headers.length} columns`);
              console.log(`   Rows: ${lines.length - 1} data rows`);
              break;
              
            case 'json':
              try {
                const parsed = JSON.parse(exportResult);
                isValid = Array.isArray(parsed) && parsed.length === sampleData.length;
                console.log(`   Valid JSON with ${parsed.length} items`);
              } catch (e) {
                console.log(`   ❌ Invalid JSON: ${e.message}`);
              }
              break;
              
            case 'html':
              isValid = exportResult.includes('<table') && 
                       exportResult.includes('</table>') &&
                       exportResult.includes('<tr>') &&
                       exportResult.includes('</tr>');
              console.log(`   Contains table structure: ${isValid ? 'Yes' : 'No'}`);
              break;
          }
          
          results[format] = {
            status: 'success',
            valid: isValid,
            size: exportResult.length
          };
          
        } else {
          console.log(`❌ Failed to generate ${format.toUpperCase()}`);
          results[format] = { status: 'failed' };
        }
        
      } catch (error) {
        console.log(`❌ Error generating ${format.toUpperCase()}: ${error.message}`);
        results[format] = { status: 'error', error: error.message };
      }
    }
    
    // Test edge cases
    console.log('\n\n📝 Testing Edge Cases...');
    
    const edgeCases = [
      {
        name: 'Empty data',
        data: []
      },
      {
        name: 'Data with special characters',
        data: [{
          title: 'Bike with "quotes" and, commas',
          price: '$1,234.56',
          description: 'Line 1\nLine 2\tTabbed',
          location: 'San José, CA'
        }]
      },
      {
        name: 'Data with missing fields',
        data: [{
          title: 'Incomplete listing',
          price: null,
          location: undefined,
          images: []
        }]
      }
    ];
    
    for (const testCase of edgeCases) {
      console.log(`\nTesting: ${testCase.name}`);
      
      const csvResult = await stagehand.page.evaluate(({ code, data }) => {
        eval(code);
        
        if (typeof SpreadsheetExporter !== 'undefined') {
          const exporter = new SpreadsheetExporter();
          try {
            return {
              success: true,
              result: exporter.generateCSV(data)
            };
          } catch (e) {
            return {
              success: false,
              error: e.message
            };
          }
        }
        return { success: false, error: 'Exporter not found' };
      }, { code: exporterCode, data: testCase.data });
      
      if (csvResult.success) {
        console.log(`✅ Handled correctly`);
      } else {
        console.log(`❌ Error: ${csvResult.error}`);
      }
    }
    
    // Create test_exports directory if it doesn't exist
    const exportDir = path.join(__dirname, 'test_exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }
    
    // Summary
    console.log('\n\n📊 Test Summary:');
    console.log('================');
    
    Object.entries(results).forEach(([format, result]) => {
      const emoji = result.status === 'success' && result.valid ? '✅' : '❌';
      console.log(`${emoji} ${format.toUpperCase()}: ${result.status} ${result.valid ? '(valid)' : '(invalid)'}`);
    });
    
    // Save test results
    fs.writeFileSync(
      path.join(__dirname, 'test_results_export_formats.json'),
      JSON.stringify(results, null, 2)
    );
    console.log('\n💾 Results saved to test_results_export_formats.json');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await stagehand.close();
    console.log('\n✅ Test 6 completed!');
  }
}

// Run the test
testExportFormats().catch(console.error);