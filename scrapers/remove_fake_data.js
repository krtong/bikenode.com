const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bikenode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function removeFakeData() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Removing all data that was added by add_electrified_models.js...\n');
    
    // Get count before deletion
    const beforeCount = await client.query('SELECT COUNT(*) as count FROM electrified_data');
    console.log(`Records before: ${beforeCount.rows[0].count}`);
    
    // Remove all entries except the original demo data from the migration
    // The original migration only had 8 demo entries
    const deleteResult = await client.query(`
      DELETE FROM electrified_data 
      WHERE id NOT IN (
        SELECT id FROM electrified_data 
        ORDER BY created_at 
        LIMIT 8
      )
    `);
    
    console.log(`\n✅ Removed ${deleteResult.rowCount} fake records`);
    
    // Get count after deletion
    const afterCount = await client.query('SELECT COUNT(*) as count FROM electrified_data');
    console.log(`Records after: ${afterCount.rows[0].count}`);
    
    // Show what remains
    const remaining = await client.query(`
      SELECT brand, model, year 
      FROM electrified_data 
      ORDER BY brand, model, year
    `);
    
    console.log('\n📊 Remaining data (from original migration):');
    remaining.rows.forEach(row => {
      console.log(`  - ${row.year} ${row.brand} ${row.model}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

removeFakeData().catch(console.error);