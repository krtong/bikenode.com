const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bikenode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function removeFakePrices() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Removing fake price data...\n');
    
    // Remove prices that were added by api_based_scraper.js
    // Keep only the original 8 migration entries
    const result = await client.query(`
      UPDATE electrified_data
      SET msrp = NULL
      WHERE id NOT IN (
        SELECT id FROM electrified_data 
        ORDER BY created_at 
        LIMIT 8
      )
    `);
    
    console.log(`✅ Removed fake prices from ${result.rowCount} entries`);
    
    // Show what remains
    const remaining = await client.query(`
      SELECT COUNT(*) as total, COUNT(msrp) as with_price 
      FROM electrified_data
    `);
    
    console.log(`\n📊 Database now has:`);
    console.log(`   Total entries: ${remaining.rows[0].total}`);
    console.log(`   Entries with prices: ${remaining.rows[0].with_price} (only original migration data)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

removeFakePrices().catch(console.error);