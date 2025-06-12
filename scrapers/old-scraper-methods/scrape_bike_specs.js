const puppeteer = require('puppeteer');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bikenode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

// Search engines and review sites that have real spec data
const SPEC_SOURCES = [
  {
    name: 'Electric Bike Review',
    searchUrl: (brand, model) => `https://electricbikereview.com/?s=${encodeURIComponent(brand + ' ' + model)}`,
    specSelectors: {
      motor: '.motor-power, .specs-table td:contains("Motor")',
      battery: '.battery-capacity, .specs-table td:contains("Battery")',
      range: '.range, .specs-table td:contains("Range")',
      speed: '.top-speed, .specs-table td:contains("Speed")',
      weight: '.weight, .specs-table td:contains("Weight")',
      price: '.price, .msrp'
    }
  },
  {
    name: 'Electrek',
    searchUrl: (brand, model) => `https://electrek.co/?s=${encodeURIComponent(brand + ' ' + model)}`,
    specSelectors: {
      content: 'article .entry-content'
    }
  }
];

async function searchForSpecs(browser, brand, model) {
  console.log(`\n🔍 Searching specs for ${brand} ${model}...`);
  
  const specs = {
    motor_power: null,
    battery: null,
    top_speed: null,
    range: null,
    weight: null,
    msrp: null
  };
  
  for (const source of SPEC_SOURCES) {
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const url = source.searchUrl(brand, model);
      console.log(`  Checking ${source.name}...`);
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Get page text
      const pageText = await page.evaluate(() => document.body.innerText);
      
      // Search for spec patterns in text
      const specPatterns = {
        motor_power: /(\d+(?:\.\d+)?)\s*(?:k)?W(?:att)?(?:\s*(?:peak|motor|power))?/i,
        battery: /(\d+(?:\.\d+)?)\s*V\s*(\d+(?:\.\d+)?)\s*Ah/i,
        top_speed: /(?:top\s*speed|max\s*speed)[:\s]+(\d+)\s*mph/i,
        range: /(?:range)[:\s]+(\d+)(?:-(\d+))?\s*miles?/i,
        weight: /(?:weight)[:\s]+(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/i,
        msrp: /(?:price|msrp)[:\s]+\$?([\d,]+)/i
      };
      
      // Extract specs from text
      for (const [key, pattern] of Object.entries(specPatterns)) {
        if (!specs[key]) {
          const match = pageText.match(pattern);
          if (match) {
            if (key === 'motor_power') {
              specs[key] = match[0];
            } else if (key === 'battery') {
              specs[key] = `${match[1]}V ${match[2]}Ah`;
            } else if (key === 'range' && match[2]) {
              specs[key] = `${match[1]}-${match[2]} miles`;
            } else if (key === 'top_speed') {
              specs[key] = `${match[1]} mph`;
            } else if (key === 'weight') {
              specs[key] = `${match[1]} lbs`;
            } else if (key === 'msrp') {
              specs[key] = parseInt(match[1].replace(/,/g, '')) * 100; // Convert to cents
            } else {
              specs[key] = match[1];
            }
            console.log(`    ✓ Found ${key}: ${specs[key]}`);
          }
        }
      }
      
      await page.close();
      
      // If we found some specs, don't check other sources
      if (Object.values(specs).some(v => v !== null)) {
        break;
      }
      
    } catch (error) {
      console.log(`    ✗ Error with ${source.name}: ${error.message}`);
    }
  }
  
  return specs;
}

async function updateBikeSpecs() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const client = await pool.connect();
  
  try {
    // Get bikes without specs
    const result = await client.query(`
      SELECT DISTINCT brand, model 
      FROM electrified_data 
      WHERE motor_power IS NULL 
         OR battery IS NULL 
         OR top_speed IS NULL
      ORDER BY brand, model
      LIMIT 10
    `);
    
    console.log(`🎯 Found ${result.rows.length} bikes needing specs\n`);
    
    for (const bike of result.rows) {
      const specs = await searchForSpecs(browser, bike.brand, bike.model);
      
      // Update database if we found any specs
      if (Object.values(specs).some(v => v !== null)) {
        const updateQuery = `
          UPDATE electrified_data
          SET motor_power = COALESCE(motor_power, $1),
              battery = COALESCE(battery, $2),
              top_speed = COALESCE(top_speed, $3),
              range = COALESCE(range, $4),
              weight = COALESCE(weight, $5),
              msrp = COALESCE(msrp, $6)
          WHERE brand = $7 AND model = $8
        `;
        
        await client.query(updateQuery, [
          specs.motor_power,
          specs.battery,
          specs.top_speed,
          specs.range,
          specs.weight,
          specs.msrp,
          bike.brand,
          bike.model
        ]);
        
        console.log(`  ✅ Updated ${bike.brand} ${bike.model}`);
      } else {
        console.log(`  ⚠️  No specs found for ${bike.brand} ${bike.model}`);
      }
      
      // Be nice to servers
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
    client.release();
    await pool.end();
  }
}

async function main() {
  console.log('🚀 Starting spec data collection...\n');
  await updateBikeSpecs();
  console.log('\n✅ Complete!');
}

main().catch(console.error);