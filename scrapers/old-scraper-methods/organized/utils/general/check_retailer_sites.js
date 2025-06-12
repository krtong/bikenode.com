const https = require('https');
const http = require('http');

// List of known retailers and direct sources
const RETAILER_SOURCES = [
  {
    name: 'Sur-Ron USA Official',
    urls: [
      'https://sur-ronusa.com',
      'https://www.sur-ronusa.com/products'
    ]
  },
  {
    name: 'Talaria Official',
    urls: [
      'https://talaria.bike',
      'https://www.talaria-sting.com'
    ]
  },
  {
    name: 'Segway Powersports',
    urls: [
      'https://powersports.segway.com',
      'https://store.segway.com'
    ]
  },
  {
    name: 'Zero Motorcycles',
    urls: [
      'https://www.zeromotorcycles.com',
      'https://www.zeromotorcycles.com/motorcycles'
    ]
  },
  {
    name: 'Luna Cycle',
    urls: [
      'https://lunacycle.com',
      'https://lunacycle.com/electric-bikes'
    ]
  },
  {
    name: 'Alien Rides',
    urls: [
      'https://alienrides.com',
      'https://alienrides.com/collections/electric-bikes'
    ]
  }
];

// Check if a URL is accessible
async function checkUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const options = {
      method: 'HEAD',
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BikeNodeBot/1.0)'
      }
    };
    
    const req = protocol.request(url, options, (res) => {
      resolve({
        url,
        status: res.statusCode,
        accessible: res.statusCode >= 200 && res.statusCode < 400
      });
    });
    
    req.on('error', () => {
      resolve({
        url,
        status: 0,
        accessible: false
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        status: 0,
        accessible: false
      });
    });
    
    req.end();
  });
}

async function checkAllSources() {
  console.log('🔍 Checking electrified bike sources...\n');
  
  const results = [];
  
  for (const source of RETAILER_SOURCES) {
    console.log(`📍 ${source.name}:`);
    
    for (const url of source.urls) {
      const result = await checkUrl(url);
      results.push({
        source: source.name,
        ...result
      });
      
      const status = result.accessible ? '✅' : '❌';
      console.log(`   ${status} ${url} (${result.status})`);
    }
    
    console.log('');
  }
  
  // Summary
  const accessible = results.filter(r => r.accessible);
  console.log('📊 Summary:');
  console.log(`   Total URLs checked: ${results.length}`);
  console.log(`   Accessible: ${accessible.length}`);
  console.log(`   Failed: ${results.length - accessible.length}`);
  
  console.log('\n✅ Working sources:');
  accessible.forEach(r => {
    console.log(`   - ${r.url}`);
  });
  
  return accessible;
}

// Get data from accessible sources using simple HTTP requests
async function getDataFromUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    };
    
    protocol.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', reject);
  });
}

async function extractBikeInfo(html, source) {
  const bikes = [];
  
  // Simple regex patterns to find bike models
  const patterns = {
    surron: /(?:sur-ron|surron)\s+([a-z\s]+(?:bee|storm))/gi,
    talaria: /talaria\s+([a-z\s]+(?:sting|xxx|dragon))/gi,
    segway: /segway\s+(?:dirt\s+ebike\s+)?(x\d+)/gi,
    zero: /zero\s+(?:motorcycles\s+)?([a-z\/]+)/gi
  };
  
  // Extract models
  for (const [brand, pattern] of Object.entries(patterns)) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const model = match[1].trim();
      if (model && !bikes.some(b => b.model === model)) {
        bikes.push({
          brand: brand.charAt(0).toUpperCase() + brand.slice(1),
          model,
          source
        });
      }
    }
  }
  
  // Extract prices
  const pricePattern = /\$\s?([\d,]+)(?:\.\d{2})?/g;
  const prices = Array.from(html.matchAll(pricePattern))
    .map(m => parseInt(m[1].replace(',', '')))
    .filter(p => p > 1000 && p < 50000); // Reasonable price range
  
  return { bikes, prices };
}

async function main() {
  // First check which sources are accessible
  const workingSources = await checkAllSources();
  
  console.log('\n\n🌐 Attempting to extract data from working sources...\n');
  
  // Try to get data from accessible sources
  for (const source of workingSources.slice(0, 3)) { // Limit to first 3
    try {
      console.log(`📥 Getting data from ${source.url}...`);
      const html = await getDataFromUrl(source.url);
      const { bikes, prices } = await extractBikeInfo(html, source.source);
      
      if (bikes.length > 0) {
        console.log(`   ✓ Found ${bikes.length} bike models`);
        bikes.forEach(bike => {
          console.log(`     - ${bike.brand} ${bike.model}`);
        });
      }
      
      if (prices.length > 0) {
        console.log(`   ✓ Found ${prices.length} prices: $${Math.min(...prices)} - $${Math.max(...prices)}`);
      }
      
    } catch (error) {
      console.log(`   ✗ Error: ${error.message}`);
    }
    
    console.log('');
  }
}

main().catch(console.error);