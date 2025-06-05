import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
});

async function verifyData() {
  try {
    await client.connect();
    
    console.log('\n🔍 Verifying Scraped Data\n');
    
    // Check bikes_data_2 table
    const scrapedCount = await client.query('SELECT COUNT(*) FROM bikes_data_2');
    console.log(`📊 Records in bikes_data_2: ${scrapedCount.rows[0].count}`);
    
    // Check bikes table
    const bikesCount = await client.query('SELECT COUNT(*) FROM bikes');
    console.log(`📊 Records in bikes table: ${bikesCount.rows[0].count}`);
    
    // Get sample data from bikes table
    console.log('\n📋 Sample Records from bikes table:\n');
    
    const samples = await client.query(`
      SELECT 
        keyid,
        bike_id,
        manufacturer,
        model,
        year,
        variant,
        is_ebike,
        category,
        msrp_cents,
        canonical_url
      FROM bikes
      LIMIT 5
    `);
    
    samples.rows.forEach((bike, i) => {
      console.log(`${i + 1}. ${bike.year} ${bike.manufacturer} ${bike.model}`);
      console.log(`   Variant: ${bike.variant}`);
      console.log(`   Bike ID: ${bike.bike_id}`);
      console.log(`   Category: ${bike.category || 'N/A'}`);
      console.log(`   E-bike: ${bike.is_ebike ? 'Yes' : 'No'}`);
      console.log(`   MSRP: ${bike.msrp_cents ? '$' + (bike.msrp_cents / 100).toFixed(2) : 'N/A'}`);
      console.log('');
    });
    
    // Check data quality
    console.log('📊 Data Quality Check:\n');
    
    const qualityCheck = await client.query(`
      SELECT 
        COUNT(CASE WHEN makerid IS NOT NULL THEN 1 END) as has_makerid,
        COUNT(CASE WHEN familyid IS NOT NULL THEN 1 END) as has_familyid,
        COUNT(CASE WHEN category IS NOT NULL THEN 1 END) as has_category,
        COUNT(CASE WHEN components IS NOT NULL THEN 1 END) as has_components,
        COUNT(CASE WHEN geometry IS NOT NULL THEN 1 END) as has_geometry,
        COUNT(CASE WHEN images IS NOT NULL THEN 1 END) as has_images,
        COUNT(*) as total
      FROM bikes
    `);
    
    const q = qualityCheck.rows[0];
    console.log(`✓ Has MakerID: ${q.has_makerid}/${q.total} (${((q.has_makerid/q.total)*100).toFixed(1)}%)`);
    console.log(`✓ Has FamilyID: ${q.has_familyid}/${q.total} (${((q.has_familyid/q.total)*100).toFixed(1)}%)`);
    console.log(`✓ Has Category: ${q.has_category}/${q.total} (${((q.has_category/q.total)*100).toFixed(1)}%)`);
    console.log(`✓ Has Components: ${q.has_components}/${q.total} (${((q.has_components/q.total)*100).toFixed(1)}%)`);
    console.log(`✓ Has Geometry: ${q.has_geometry}/${q.total} (${((q.has_geometry/q.total)*100).toFixed(1)}%)`);
    console.log(`✓ Has Images: ${q.has_images}/${q.total} (${((q.has_images/q.total)*100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

verifyData();