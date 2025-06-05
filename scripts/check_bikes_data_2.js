import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
});

async function checkTable() {
  try {
    await client.connect();
    
    // Check if bikes_data_2 exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bikes_data_2'
      );
    `);
    
    console.log('bikes_data_2 table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Get column info
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'bikes_data_2' 
        ORDER BY ordinal_position;
      `);
      
      console.log('\nbikes_data_2 table columns:');
      columns.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type}`);
      });
      
      // Get row count
      const count = await client.query('SELECT COUNT(*) FROM bikes_data_2');
      console.log(`\nRow count: ${count.rows[0].count}`);
      
      // Show sample record
      const sample = await client.query('SELECT keyid, url, scraped_at, has_embedded_data FROM bikes_data_2 LIMIT 3');
      console.log('\nSample records:');
      sample.rows.forEach(row => {
        console.log(`  KeyID ${row.keyid}: ${row.url}`);
        console.log(`    Scraped at: ${row.scraped_at}`);
        console.log(`    Has embedded data: ${row.has_embedded_data}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTable();