const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bikenode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

// Priority brands to scrape
const PRIORITY_BRANDS = [
  'Sur-Ron',
  'Talaria',
  'Segway',
  'Zero Motorcycles',
  'Super73',
  'ONYX',
  'Cake',
  'Stark Future',
  'Delfast',
  'Stealth Electric Bikes',
  'Monday Motorbikes',
  'Volcon',
  'Electric Motion',
  'Kuberg',
  'Flux Performance',
  '79Bike',
  'HappyRun',
  'Rawrr',
  'E-Ride Pro',
  'Qulbix'
];

async function loadScrapedData() {
  try {
    const dataPath = path.join(__dirname, 'scraped_data/electrified_bikes_data.json');
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading scraped data:', error);
    return { brands: [] };
  }
}

async function populateDatabase() {
  const client = await pool.connect();
  
  try {
    const scrapedData = await loadScrapedData();
    console.log(`📊 Loaded data for ${scrapedData.brands.length} brands`);
    
    await client.query('BEGIN');
    
    let totalModels = 0;
    let successCount = 0;
    
    for (const brand of scrapedData.brands) {
      if (!PRIORITY_BRANDS.includes(brand.name)) continue;
      
      console.log(`\n🏍️  Processing ${brand.name}...`);
      
      // Ensure brand exists
      const brandQuery = `
        INSERT INTO electrified_brands (name, website, category)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE
        SET website = EXCLUDED.website
        RETURNING id
      `;
      
      const brandResult = await client.query(brandQuery, [
        brand.name,
        brand.website || '',
        brand.category || 'general'
      ]);
      
      // Insert models
      for (const model of brand.models) {
        try {
          // Extract numeric values from strings
          const motorPower = extractPower(model.specs?.motor_power);
          const batteryCapacity = extractBattery(model.specs?.battery);
          const topSpeed = extractNumber(model.specs?.top_speed);
          const range = extractNumber(model.specs?.range);
          const weight = extractNumber(model.specs?.weight);
          const price = extractPrice(model.specs?.price);
          
          const modelQuery = `
            INSERT INTO electrified_data 
            (year, brand, model, category, motor_power, battery, 
             range, top_speed, weight, msrp)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (brand, model, year, variant) DO UPDATE
            SET category = EXCLUDED.category,
                motor_power = EXCLUDED.motor_power,
                battery = EXCLUDED.battery,
                range = EXCLUDED.range,
                top_speed = EXCLUDED.top_speed,
                weight = EXCLUDED.weight,
                msrp = EXCLUDED.msrp
          `;
          
          await client.query(modelQuery, [
            model.year || new Date().getFullYear(),
            brand.name,
            model.model,
            model.category || 'general',
            motorPower,
            batteryCapacity,
            range ? `${range} miles` : null,
            topSpeed ? `${topSpeed} mph` : null,
            weight ? `${weight} lbs` : null,
            price ? price * 100 : null // Convert to cents
          ]);
          
          successCount++;
          console.log(`  ✅ ${model.year || 'Current'} ${model.model}`);
          
        } catch (error) {
          console.error(`  ❌ Error with ${model.model}:`, error.message);
        }
        
        totalModels++;
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Database population complete!`);
    console.log(`   Total models processed: ${totalModels}`);
    console.log(`   Successfully imported: ${successCount}`);
    console.log(`   Failed: ${totalModels - successCount}`);
    
    // Show statistics
    await showStats(client);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database error:', error);
  } finally {
    client.release();
  }
}

// Helper functions to extract numeric values
function extractPower(powerStr) {
  if (!powerStr) return null;
  const match = powerStr.match(/(\d+(?:\.\d+)?)\s*(?:k?W|hp)/i);
  if (match) {
    const value = parseFloat(match[1]);
    if (powerStr.toLowerCase().includes('kw')) {
      return `${value}kW`;
    } else if (powerStr.toLowerCase().includes('hp')) {
      return `${Math.round(value * 0.7457)}kW`; // Convert HP to kW
    }
    return `${value}W`;
  }
  return powerStr;
}

function extractBattery(batteryStr) {
  if (!batteryStr) return null;
  const match = batteryStr.match(/(\d+(?:\.\d+)?)\s*V\s*(\d+(?:\.\d+)?)\s*Ah/i);
  if (match) {
    return `${match[1]}V ${match[2]}Ah`;
  }
  const kwhMatch = batteryStr.match(/(\d+(?:\.\d+)?)\s*kWh/i);
  if (kwhMatch) {
    return `${kwhMatch[1]} kWh`;
  }
  return batteryStr;
}

function extractNumber(str) {
  if (!str) return null;
  const match = str.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function extractPrice(priceStr) {
  if (!priceStr) return null;
  const match = priceStr.match(/\$?(\d+,?\d*)/);
  if (match) {
    return parseFloat(match[1].replace(',', ''));
  }
  return null;
}

async function showStats(client) {
  const stats = await client.query(`
    SELECT 
      e.brand,
      COUNT(DISTINCT e.model) as models,
      COUNT(DISTINCT e.year) as years,
      MIN(e.msrp) as min_price,
      MAX(e.msrp) as max_price
    FROM electrified_data e
    GROUP BY e.brand
    ORDER BY models DESC
  `);
  
  console.log('\n📊 Database Statistics:');
  console.log('Brand               Models  Years  Price Range');
  console.log('────────────────────────────────────────────────');
  
  stats.rows.forEach(row => {
    const priceRange = row.min_price && row.max_price 
      ? `$${(row.min_price/100).toLocaleString()}-$${(row.max_price/100).toLocaleString()}`
      : 'N/A';
    
    console.log(
      `${row.brand.padEnd(20)} ${row.models.toString().padEnd(7)} ${row.years.toString().padEnd(6)} ${priceRange}`
    );
  });
}

// Add manual entries for brands that are hard to scrape
async function addManualEntries(client) {
  const manualEntries = [
    // Segway Dirt eBike models
    {
      year: 2024,
      make: 'Segway',
      model: 'Dirt eBike X260',
      type: 'off-road',
      motor_power: '5000W',
      battery_capacity: '74V 31.2Ah',
      range_miles: 74.6,
      top_speed_mph: 46.6,
      weight_lbs: 123,
      price_usd: 4999
    },
    {
      year: 2024,
      make: 'Segway',
      model: 'Dirt eBike X160',
      type: 'off-road',
      motor_power: '3000W',
      battery_capacity: '48V 20.4Ah',
      range_miles: 40.4,
      top_speed_mph: 31.1,
      weight_lbs: 104,
      price_usd: 2999
    },
    // Stage 2 (Razor) models
    {
      year: 2023,
      make: 'Stage 2 (Razor)',
      model: 'MX650',
      type: 'youth',
      motor_power: '650W',
      battery_capacity: '36V 12Ah',
      range_miles: 10,
      top_speed_mph: 17,
      weight_lbs: 98,
      price_usd: 649
    },
    // Arctic Leopard models
    {
      year: 2024,
      make: 'Arctic Leopard',
      model: 'AL-8000',
      type: 'off-road',
      motor_power: '8000W',
      battery_capacity: '72V 35Ah',
      range_miles: 60,
      top_speed_mph: 50,
      weight_lbs: 132,
      price_usd: 3999
    },
    // Ventus models
    {
      year: 2024,
      make: 'Ventus',
      model: 'Ventus V1',
      type: 'performance',
      motor_power: '15kW',
      battery_capacity: '72V 50Ah',
      range_miles: 80,
      top_speed_mph: 70,
      weight_lbs: 187,
      price_usd: 8999
    },
    // Altis models
    {
      year: 2024,
      make: 'Altis',
      model: 'Sigma',
      type: 'urban',
      motor_power: '2000W',
      battery_capacity: '48V 20Ah',
      range_miles: 45,
      top_speed_mph: 32,
      weight_lbs: 75,
      price_usd: 2799
    },
    // Bultaco models
    {
      year: 2022,
      make: 'Bultaco',
      model: 'Brinco RE',
      type: 'hybrid',
      motor_power: '2000W',
      battery_capacity: '37.8V 17.1Ah',
      range_miles: 60,
      top_speed_mph: 37,
      weight_lbs: 84,
      price_usd: 4990
    },
    // KTM electric models
    {
      year: 2024,
      make: 'KTM',
      model: 'Freeride E-XC',
      type: 'off-road',
      motor_power: '18kW',
      battery_capacity: '260V 2.6kWh',
      range_miles: 50,
      top_speed_mph: 50,
      weight_lbs: 238,
      price_usd: 11099
    },
    // Drill One models
    {
      year: 2023,
      make: 'Drill One (CZEM)',
      model: 'EVO',
      type: 'performance',
      motor_power: '30kW',
      battery_capacity: '72V 60Ah',
      range_miles: 90,
      top_speed_mph: 75,
      weight_lbs: 220,
      price_usd: 12999
    },
    // Alta Motors (historical)
    {
      year: 2018,
      make: 'Alta Motors',
      model: 'Redshift MXR',
      type: 'motocross',
      motor_power: '40kW',
      battery_capacity: '350V 5.8kWh',
      range_miles: 60,
      top_speed_mph: 65,
      weight_lbs: 259,
      price_usd: 12295
    }
  ];

  console.log('\n📝 Adding manual entries...');
  
  for (const entry of manualEntries) {
    try {
      const query = `
        INSERT INTO electrified_data 
        (year, brand, model, category, motor_power, battery, 
         range, top_speed, weight, msrp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (brand, model, year, variant) DO UPDATE
        SET category = EXCLUDED.category,
            motor_power = EXCLUDED.motor_power,
            battery = EXCLUDED.battery,
            range = EXCLUDED.range,
            top_speed = EXCLUDED.top_speed,
            weight = EXCLUDED.weight,
            msrp = EXCLUDED.msrp
      `;
      
      await client.query(query, [
        entry.year,
        entry.make,
        entry.model,
        entry.type,
        entry.motor_power,
        entry.battery_capacity,
        entry.range_miles ? `${entry.range_miles} miles` : null,
        entry.top_speed_mph ? `${entry.top_speed_mph} mph` : null,
        entry.weight_lbs ? `${entry.weight_lbs} lbs` : null,
        entry.price_usd * 100 // Convert to cents
      ]);
      
      console.log(`  ✅ ${entry.year} ${entry.make} ${entry.model}`);
    } catch (error) {
      console.error(`  ❌ Error with ${entry.make} ${entry.model}:`, error.message);
    }
  }
}

async function main() {
  console.log('🚀 Starting Electrified Database Population...\n');
  
  // First check if we have scraped data
  const dataPath = path.join(__dirname, 'scraped_data/electrified_bikes_data.json');
  
  try {
    await fs.access(dataPath);
    console.log('✅ Found scraped data file');
  } catch {
    console.log('⚠️  No scraped data found. Run the scraper first:');
    console.log('   node manage_electrified_bikes.js scrape');
    console.log('\n📝 Adding manual entries only...');
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await addManualEntries(client);
      await client.query('COMMIT');
      await showStats(client);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error:', error);
    } finally {
      client.release();
    }
    
    await pool.end();
    return;
  }
  
  // Populate from scraped data
  await populateDatabase();
  
  // Add manual entries
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await addManualEntries(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding manual entries:', error);
  } finally {
    client.release();
  }
  
  await pool.end();
  console.log('\n✅ Complete!');
}

// Run the script
main().catch(console.error);