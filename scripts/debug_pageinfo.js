import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
});

async function debugPageInfo() {
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT 
        bd.keyid,
        bc.make,
        bc.model,
        bd.comprehensive_data->>'pageInfo' as page_info_text,
        bd.comprehensive_data->'pageInfo' as page_info_json,
        jsonb_typeof(bd.comprehensive_data->'pageInfo') as page_info_type
      FROM bikes_data bd
      JOIN bikes_catalog bc ON bd.keyid = bc.keyid
      WHERE bd.comprehensive_data IS NOT NULL
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log('Sample record:');
      console.log(`  keyid: ${row.keyid}`);
      console.log(`  bike: ${row.make} ${row.model}`);
      console.log(`  page_info_type: ${row.page_info_type}`);
      console.log(`  page_info_text: ${row.page_info_text}`);
      console.log(`  page_info_json:`, row.page_info_json);
      
      // Try to get URL directly
      const urlResult = await client.query(`
        SELECT 
          bd.comprehensive_data->'pageInfo'->>'url' as url
        FROM bikes_data bd
        WHERE bd.keyid = $1
      `, [row.keyid]);
      
      console.log(`  Direct URL extraction: ${urlResult.rows[0].url}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

debugPageInfo();