const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bikenode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function verifyData() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying Electrified Database...\n');
    
    // Total counts
    const totalResult = await client.query(`
      SELECT 
        COUNT(DISTINCT brand) as total_brands,
        COUNT(DISTINCT model) as total_models,
        COUNT(*) as total_entries
      FROM electrified_data
    `);
    
    const totals = totalResult.rows[0];
    console.log('📊 Overall Statistics:');
    console.log(`   Total Brands: ${totals.total_brands}`);
    console.log(`   Total Models: ${totals.total_models}`);
    console.log(`   Total Entries: ${totals.total_entries}`);
    
    // Brand breakdown
    const brandStats = await client.query(`
      SELECT 
        brand,
        COUNT(DISTINCT model) as models,
        COUNT(DISTINCT year) as years,
        COUNT(*) as total_variants,
        STRING_AGG(DISTINCT category, ', ') as categories
      FROM electrified_data
      GROUP BY brand
      ORDER BY models DESC, brand
    `);
    
    console.log('\n📊 Brand Breakdown:');
    console.log('Brand                    Models  Years  Variants  Categories');
    console.log('──────────────────────────────────────────────────────────────');
    
    brandStats.rows.forEach(row => {
      console.log(
        `${row.brand.padEnd(25)} ${row.models.toString().padEnd(7)} ${row.years.toString().padEnd(6)} ${row.total_variants.toString().padEnd(9)} ${row.categories}`
      );
    });
    
    // Category distribution
    const categoryStats = await client.query(`
      SELECT 
        category,
        COUNT(DISTINCT brand) as brands,
        COUNT(DISTINCT model) as models,
        COUNT(*) as total_entries
      FROM electrified_data
      GROUP BY category
      ORDER BY total_entries DESC
    `);
    
    console.log('\n📊 Category Distribution:');
    console.log('Category         Brands  Models  Entries');
    console.log('────────────────────────────────────────');
    
    categoryStats.rows.forEach(row => {
      console.log(
        `${row.category.padEnd(17)} ${row.brands.toString().padEnd(7)} ${row.models.toString().padEnd(7)} ${row.total_entries}`
      );
    });
    
    // Sample data
    const samples = await client.query(`
      SELECT brand, model, year, category, motor_power, top_speed, range, msrp
      FROM electrified_data
      ORDER BY RANDOM()
      LIMIT 10
    `);
    
    console.log('\n📋 Sample Entries:');
    console.log('─'.repeat(100));
    
    samples.rows.forEach(row => {
      const price = row.msrp ? `$${(row.msrp/100).toLocaleString()}` : 'N/A';
      console.log(`${row.year} ${row.brand} ${row.model}`);
      console.log(`  Category: ${row.category} | Power: ${row.motor_power} | Speed: ${row.top_speed} | Range: ${row.range} | Price: ${price}`);
    });
    
    // Year distribution
    const yearStats = await client.query(`
      SELECT 
        year,
        COUNT(DISTINCT brand) as brands,
        COUNT(*) as models
      FROM electrified_data
      GROUP BY year
      ORDER BY year DESC
    `);
    
    console.log('\n📅 Year Distribution:');
    console.log('Year   Brands  Models');
    console.log('────────────────────');
    
    yearStats.rows.forEach(row => {
      console.log(`${row.year}   ${row.brands.toString().padEnd(7)} ${row.models}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyData().catch(console.error);