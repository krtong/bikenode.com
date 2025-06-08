const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

// Test accessibility of sources
async function checkUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const options = {
      method: 'HEAD',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    const req = protocol.request(url, options, (res) => {
      resolve({
        url,
        status: res.statusCode,
        accessible: res.statusCode >= 200 && res.statusCode < 400,
        headers: res.headers
      });
    });
    
    req.on('error', (error) => {
      resolve({
        url,
        status: 0,
        accessible: false,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        status: 0,
        accessible: false,
        error: 'Timeout'
      });
    });
    
    req.end();
  });
}

async function validateSources() {
  console.log('🔍 Validating Electrified Bike Sources...\n');
  
  // Load potential sources
  const sourcesPath = path.join(__dirname, '../sources/potential-sources.json');
  const sources = JSON.parse(await fs.readFile(sourcesPath, 'utf-8'));
  
  const results = {
    timestamp: new Date().toISOString(),
    manufacturer_sites: {},
    retailer_sites: {},
    review_sites: {}
  };
  
  // Check manufacturer sites
  console.log('📊 Checking Manufacturer Sites:');
  for (const [brand, data] of Object.entries(sources.manufacturer_sites)) {
    console.log(`\n${brand}:`);
    results.manufacturer_sites[brand] = {
      urls: [],
      notes: data.notes
    };
    
    for (const url of data.urls) {
      const result = await checkUrl(url);
      results.manufacturer_sites[brand].urls.push(result);
      
      const status = result.accessible ? '✅' : '❌';
      console.log(`  ${status} ${url} (${result.status || result.error})`);
    }
  }
  
  // Check retailer sites
  console.log('\n\n📊 Checking Retailer Sites:');
  for (const [name, data] of Object.entries(sources.retailer_sites)) {
    const result = await checkUrl(data.url);
    results.retailer_sites[name] = {
      ...data,
      check: result
    };
    
    const status = result.accessible ? '✅' : '❌';
    console.log(`${status} ${name}: ${data.url} (${result.status || result.error})`);
  }
  
  // Check review sites
  console.log('\n\n📊 Checking Review Sites:');
  for (const [name, data] of Object.entries(sources.review_sites)) {
    const result = await checkUrl(data.url);
    results.review_sites[name] = {
      ...data,
      check: result
    };
    
    const status = result.accessible ? '✅' : '❌';
    console.log(`${status} ${name}: ${data.url} (${result.status || result.error})`);
  }
  
  // Save results
  const outputPath = path.join(__dirname, '../sources/validated-sources.json');
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n\n💾 Validation results saved to: validated-sources.json`);
  
  // Summary
  const totalChecked = Object.values(results.manufacturer_sites)
    .reduce((sum, brand) => sum + brand.urls.length, 0) +
    Object.keys(results.retailer_sites).length +
    Object.keys(results.review_sites).length;
    
  const totalAccessible = Object.values(results.manufacturer_sites)
    .reduce((sum, brand) => sum + brand.urls.filter(u => u.accessible).length, 0) +
    Object.values(results.retailer_sites).filter(r => r.check.accessible).length +
    Object.values(results.review_sites).filter(r => r.check.accessible).length;
  
  console.log('\n📊 Summary:');
  console.log(`   Total URLs checked: ${totalChecked}`);
  console.log(`   Accessible: ${totalAccessible}`);
  console.log(`   Failed: ${totalChecked - totalAccessible}`);
  
  return results;
}

// Run validation
if (require.main === module) {
  validateSources().catch(console.error);
}

module.exports = { checkUrl, validateSources };