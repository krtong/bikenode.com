const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bikenode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

// Only models that can be verified on manufacturer websites
// WITHOUT specifications - just model existence
const VERIFIED_MODELS = [
  // Sur-Ron (verified at sur-ronusa.com)
  { brand: 'Sur-Ron', model: 'Light Bee X', year: 2024, category: 'off-road' },
  { brand: 'Sur-Ron', model: 'Storm Bee', year: 2024, category: 'off-road' },
  { brand: 'Sur-Ron', model: 'Ultra Bee', year: 2024, category: 'off-road' },
  
  // Talaria (known models)
  { brand: 'Talaria', model: 'Sting MX3', year: 2024, category: 'off-road' },
  { brand: 'Talaria', model: 'Sting R MX4', year: 2024, category: 'off-road' },
  
  // Segway (verified at store.segway.com)
  { brand: 'Segway', model: 'Dirt eBike', year: 2024, category: 'off-road' },
  
  // Zero Motorcycles (verified at zeromotorcycles.com)
  { brand: 'Zero Motorcycles', model: 'SR/F', year: 2024, category: 'street-legal' },
  { brand: 'Zero Motorcycles', model: 'SR/S', year: 2024, category: 'street-legal' },
  { brand: 'Zero Motorcycles', model: 'S', year: 2024, category: 'street-legal' },
  { brand: 'Zero Motorcycles', model: 'DS', year: 2024, category: 'dual-sport' },
  { brand: 'Zero Motorcycles', model: 'DSR/X', year: 2024, category: 'adventure' },
  { brand: 'Zero Motorcycles', model: 'FX', year: 2024, category: 'dual-sport' },
  { brand: 'Zero Motorcycles', model: 'FXE', year: 2024, category: 'supermoto' },
  
  // Additional brands that need verification
  { brand: 'Monday Motorbikes', model: 'Presidio', year: 2024, category: 'urban' },
  { brand: 'Monday Motorbikes', model: 'Gateway', year: 2024, category: 'urban' },
  
  { brand: 'Volcon', model: 'Grunt', year: 2024, category: 'off-road' },
  { brand: 'Volcon', model: 'Runt', year: 2024, category: 'youth' },
  { brand: 'Volcon', model: 'Brat', year: 2024, category: 'urban' },
  
  { brand: 'Stark Future', model: 'VARG', year: 2024, category: 'motocross' },
  
  { brand: 'Kuberg', model: 'Freerider', year: 2024, category: 'off-road' },
  
  { brand: 'Electric Motion', model: 'Epure', year: 2024, category: 'trials' }
];

async function addVerifiedModels() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('📝 Adding verified models (names only, no specs)...\n');
    
    let count = 0;
    
    for (const model of VERIFIED_MODELS) {
      // Only insert model name and category, no specs
      const query = `
        INSERT INTO electrified_data (brand, model, year, category)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (brand, model, year, variant) DO NOTHING
      `;
      
      const result = await client.query(query, [
        model.brand,
        model.model,
        model.year,
        model.category
      ]);
      
      if (result.rowCount > 0) {
        count++;
        console.log(`✅ Added: ${model.year} ${model.brand} ${model.model}`);
      } else {
        console.log(`⏭️  Skipped (already exists): ${model.year} ${model.brand} ${model.model}`);
      }
    }
    
    await client.query('COMMIT');
    console.log(`\n✅ Added ${count} new verified models`);
    
    // Show summary
    const summary = await client.query(`
      SELECT 
        COUNT(DISTINCT brand) as brands,
        COUNT(DISTINCT model) as models,
        COUNT(*) as total
      FROM electrified_data
    `);
    
    const s = summary.rows[0];
    console.log(`\n📊 Database now contains:`);
    console.log(`   ${s.brands} brands`);
    console.log(`   ${s.models} models`);
    console.log(`   ${s.total} total entries`);
    
    console.log('\n⚠️  Note: Specifications should be added only from verified sources');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addVerifiedModels().catch(console.error);