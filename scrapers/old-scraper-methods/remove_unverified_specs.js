const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bikenode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function removeUnverifiedSpecs() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Removing unverified specifications...\n');
    
    // Reset all specs to NULL except for the original 8 demo entries from migration
    const result = await client.query(`
      UPDATE electrified_data
      SET motor_power = NULL,
          battery = NULL,
          top_speed = NULL,
          range = NULL,
          weight = NULL,
          msrp = NULL
      WHERE id NOT IN (
        SELECT id FROM electrified_data 
        ORDER BY created_at 
        LIMIT 8
      )
    `);
    
    console.log(`✅ Cleared specs from ${result.rowCount} entries`);
    
    // Show what we have
    const summary = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(motor_power) as with_specs
      FROM electrified_data
    `);
    
    console.log(`\n📊 Database now has:`);
    console.log(`   Total entries: ${summary.rows[0].total}`);
    console.log(`   Entries with specs: ${summary.rows[0].with_specs}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

removeUnverifiedSpecs().catch(console.error);