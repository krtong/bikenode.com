import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
});

async function findJsonPatterns() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Search for records containing makerid or familyid patterns
    const result = await client.query(`
      SELECT 
        keyid,
        comprehensive_data::text as data_text
      FROM bikes_data
      WHERE comprehensive_data::text LIKE '%makerid%' 
         OR comprehensive_data::text LIKE '%familyid%'
      LIMIT 10
    `);
    
    console.log(`Found ${result.rows.length} records with makerid/familyid patterns\n`);
    
    for (const row of result.rows) {
      console.log(`\nKeyID: ${row.keyid}`);
      console.log('Data preview:');
      
      // Find and display makerid
      const makeridMatch = row.data_text.match(/makerid[^,}]{0,50}/);
      if (makeridMatch) {
        console.log(`  Found makerid: ${makeridMatch[0]}`);
      }
      
      // Find and display familyid
      const familyidMatch = row.data_text.match(/familyid[^,}]{0,50}/);
      if (familyidMatch) {
        console.log(`  Found familyid: ${familyidMatch[0]}`);
      }
      
      // Find and display family
      const familyMatch = row.data_text.match(/"family"[^,}]{0,50}/);
      if (familyMatch) {
        console.log(`  Found family: ${familyMatch[0]}`);
      }
    }
    
    // Get total count
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM bikes_data
      WHERE comprehensive_data::text LIKE '%makerid%' 
         OR comprehensive_data::text LIKE '%familyid%'
    `);
    
    console.log(`\nTotal records with makerid/familyid: ${countResult.rows[0].total}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

findJsonPatterns();