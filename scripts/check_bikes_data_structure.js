import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
});

async function checkStructure() {
  try {
    await client.connect();
    
    // Check bikes_data columns
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bikes_data' 
      ORDER BY ordinal_position;
    `);
    
    console.log('bikes_data table columns:');
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    // Get sample data
    const sample = await client.query(`
      SELECT bd.keyid, bd.comprehensive_data, bc.make, bc.model, bc.year
      FROM bikes_data bd
      JOIN bikes_catalog bc ON bd.keyid = bc.keyid
      WHERE bd.comprehensive_data IS NOT NULL
      LIMIT 1
    `);
    
    if (sample.rows.length > 0) {
      const row = sample.rows[0];
      console.log('\nSample record:');
      console.log(`  keyid: ${row.keyid}`);
      console.log(`  bike: ${row.year} ${row.make} ${row.model}`);
      console.log(`  comprehensive_data type: ${typeof row.comprehensive_data}`);
      
      // Check if comprehensive_data has pageInfo
      if (row.comprehensive_data && typeof row.comprehensive_data === 'object') {
        console.log(`  Has pageInfo: ${!!row.comprehensive_data.pageInfo}`);
        if (row.comprehensive_data.pageInfo) {
          console.log(`  URL: ${row.comprehensive_data.pageInfo.url}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkStructure();