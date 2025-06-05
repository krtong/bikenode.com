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
    
    // Check if bikes table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bikes'
      );
    `);
    
    console.log('Bikes table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Get column info
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'bikes' 
        ORDER BY ordinal_position;
      `);
      
      console.log('\nBikes table columns:');
      columns.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type}`);
      });
      
      // Get row count
      const count = await client.query('SELECT COUNT(*) FROM bikes');
      console.log(`\nRow count: ${count.rows[0].count}`);
    }
    
    // Check scraped_bike_data table
    const scrapedCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'scraped_bike_data'
      );
    `);
    
    console.log('\nscraped_bike_data table exists:', scrapedCheck.rows[0].exists);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTable();