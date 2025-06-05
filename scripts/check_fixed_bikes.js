import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
});

async function checkFixedBikes() {
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Get distinct manufacturers
    const manufacturersResult = await client.query(`
      SELECT DISTINCT make, COUNT(*) as count
      FROM bikes_catalog
      WHERE make NOT LIKE '%-%'
        AND make NOT LIKE '% %'
        AND LENGTH(make) > 2
      GROUP BY make
      ORDER BY count DESC
      LIMIT 20
    `);
    
    console.log('Top 20 Manufacturers (cleaned data):');
    console.log('=====================================');
    for (const row of manufacturersResult.rows) {
      console.log(`${row.make.padEnd(20)} ${row.count} bikes`);
    }
    
    // Get sample of fixed bikes
    console.log('\n\nSample of Fixed Bikes:');
    console.log('======================');
    
    const samplesResult = await client.query(`
      SELECT make, model, year, variant
      FROM bikes_catalog
      WHERE make IN ('Trek', 'Specialized', 'Giant', 'Cannondale', 'Scott')
        AND year >= 2020
      ORDER BY make, model, year
      LIMIT 15
    `);
    
    for (const row of samplesResult.rows) {
      console.log(`${row.year} ${row.make} ${row.model} - ${row.variant || 'Base'}`);
    }
    
    // Check if there are still concatenated issues
    console.log('\n\nRemaining Concatenated Issues:');
    console.log('==============================');
    
    const issuesResult = await client.query(`
      SELECT make, COUNT(*) as count
      FROM bikes_catalog
      WHERE make ~ '^[A-Z][a-z]+[A-Z]'
        AND make NOT IN ('BMC', 'GT', 'KHS', 'KTM', 'NS', 'OPEN', 'REEB', 'RSD', 'SCOR', 'TIME', 'VAAST', 'YT')
      GROUP BY make
      ORDER BY count DESC
      LIMIT 10
    `);
    
    if (issuesResult.rows.length === 0) {
      console.log('No major concatenation issues found!');
    } else {
      for (const row of issuesResult.rows) {
        console.log(`${row.make} - ${row.count} entries`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkFixedBikes();