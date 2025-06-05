import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
});

async function createTable() {
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Create bikes_data_2 table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bikes_data_2 (
        keyid INTEGER PRIMARY KEY REFERENCES bikes_catalog(keyid),
        url TEXT,
        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        has_embedded_data BOOLEAN,
        extracted_data JSONB,
        raw_data JSONB
      )
    `);
    
    console.log('✅ Created bikes_data_2 table');
    
    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bikes_data_2_scraped_at ON bikes_data_2(scraped_at);
      CREATE INDEX IF NOT EXISTS idx_bikes_data_2_has_embedded ON bikes_data_2(has_embedded_data);
    `);
    
    console.log('✅ Created indexes on bikes_data_2');
    
    // Check if scraped_bike_data exists and has data
    const checkOldTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'scraped_bike_data'
      );
    `);
    
    if (checkOldTable.rows[0].exists) {
      console.log('\n📦 Found existing scraped_bike_data table');
      
      // Check if it has data
      const countResult = await client.query('SELECT COUNT(*) FROM scraped_bike_data');
      const rowCount = parseInt(countResult.rows[0].count);
      
      if (rowCount > 0) {
        console.log(`📊 Found ${rowCount} records in scraped_bike_data`);
        
        // Migrate data
        console.log('🔄 Migrating data to bikes_data_2...');
        
        await client.query(`
          INSERT INTO bikes_data_2 (keyid, url, scraped_at, has_embedded_data, extracted_data, raw_data)
          SELECT keyid, url, scraped_at, has_embedded_data, extracted_data, raw_data
          FROM scraped_bike_data
          ON CONFLICT (keyid) DO NOTHING
        `);
        
        console.log('✅ Data migrated successfully');
        
        // Drop old table
        await client.query('DROP TABLE scraped_bike_data');
        console.log('✅ Dropped old scraped_bike_data table');
      } else {
        console.log('📭 scraped_bike_data is empty, dropping it');
        await client.query('DROP TABLE scraped_bike_data');
      }
    }
    
    // Show final status
    const finalCount = await client.query('SELECT COUNT(*) FROM bikes_data_2');
    console.log(`\n📊 bikes_data_2 table now has ${finalCount.rows[0].count} records`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createTable();