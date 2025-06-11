import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function compareManufacturers() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Get top manufacturers from motorcycles table
    console.log('=== Top 30 Manufacturers in Motorcycles Table ===\n');
    const motorcycleMakes = await client.query(`
      SELECT 
        make,
        COUNT(*) as count,
        MIN(year) as min_year,
        MAX(year) as max_year
      FROM motorcycles
      GROUP BY make
      ORDER BY count DESC
      LIMIT 30
    `);
    
    console.log('Make | Count | Year Range');
    console.log('-'.repeat(40));
    motorcycleMakes.rows.forEach(row => {
      console.log(`${row.make} | ${row.count} | ${row.min_year}-${row.max_year}`);
    });
    
    // Get top manufacturers from specs table
    console.log('\n\n=== Top 30 Manufacturers in Specs Table ===\n');
    const specManufacturers = await client.query(`
      SELECT 
        manufacturer,
        COUNT(DISTINCT (manufacturer, model, year)) as unique_models,
        COUNT(*) as total_entries,
        MIN(year) as min_year,
        MAX(year) as max_year
      FROM motorcycle_specs_cleaned
      GROUP BY manufacturer
      ORDER BY unique_models DESC
      LIMIT 30
    `);
    
    console.log('Manufacturer | Unique Models | Total Entries | Year Range');
    console.log('-'.repeat(60));
    specManufacturers.rows.forEach(row => {
      console.log(`${row.manufacturer} | ${row.unique_models} | ${row.total_entries} | ${row.min_year}-${row.max_year}`);
    });
    
    // Check coverage
    console.log('\n\n=== Coverage Analysis ===\n');
    
    const topMakes = motorcycleMakes.rows.slice(0, 10).map(r => r.make);
    console.log('Checking if top 10 motorcycle makes have specs:\n');
    
    for (const make of topMakes) {
      const hasSpecs = await client.query(`
        SELECT COUNT(DISTINCT (manufacturer, model, year)) as spec_count
        FROM motorcycle_specs_cleaned
        WHERE LOWER(manufacturer) = LOWER($1)
      `, [make]);
      
      const motorcycleCount = motorcycleMakes.rows.find(r => r.make === make).count;
      const specCount = hasSpecs.rows[0].spec_count;
      
      console.log(`${make}: ${motorcycleCount} motorcycles, ${specCount} specs (${(specCount/motorcycleCount*100).toFixed(1)}% coverage)`);
    }
    
    // Check what's in the original specs table
    console.log('\n\n=== Original Specs Table Analysis ===\n');
    const originalSpecs = await client.query(`
      SELECT 
        manufacturer,
        COUNT(*) as count,
        COUNT(DISTINCT model) as models,
        MIN(year) as min_year,
        MAX(year) as max_year
      FROM motorcycle_specs
      GROUP BY manufacturer
      ORDER BY count DESC
      LIMIT 20
    `);
    
    console.log('Manufacturer | Count | Models | Year Range');
    console.log('-'.repeat(50));
    originalSpecs.rows.forEach(row => {
      console.log(`${row.manufacturer} | ${row.count} | ${row.models} | ${row.min_year || 'N/A'}-${row.max_year || 'N/A'}`);
    });
    
    // Sample some unmatched motorcycles to see the pattern
    console.log('\n\n=== Sample Motorcycles Without Specs ===\n');
    const unmatched = await client.query(`
      SELECT 
        m.year,
        m.make,
        m.model,
        m.package
      FROM motorcycles m
      WHERE 
        m.cleaned_spec_id IS NULL AND
        m.make IN ('Yamaha', 'Honda', 'Suzuki', 'Kawasaki')
      ORDER BY m.make, m.model, m.year
      LIMIT 20
    `);
    
    console.log('Year | Make | Model | Package');
    console.log('-'.repeat(60));
    unmatched.rows.forEach(row => {
      console.log(`${row.year} | ${row.make} | ${row.model} | ${row.package || '-'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the comparison
compareManufacturers();