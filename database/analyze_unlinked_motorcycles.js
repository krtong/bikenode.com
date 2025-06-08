import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function analyzeUnlinkedMotorcycles() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Overall statistics
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(cleaned_spec_id) as linked,
        COUNT(*) - COUNT(cleaned_spec_id) as unlinked,
        ROUND(COUNT(cleaned_spec_id)::numeric / COUNT(*)::numeric * 100, 2) as link_percentage
      FROM motorcycles
    `);
    
    const s = stats.rows[0];
    console.log('=== Overall Statistics ===');
    console.log(`Total motorcycles: ${s.total}`);
    console.log(`Linked to specs: ${s.linked} (${s.link_percentage}%)`);
    console.log(`Unlinked: ${s.unlinked}\n`);
    
    // Top unlinked by make
    console.log('=== Top 20 Makes with Unlinked Motorcycles ===\n');
    const unlinkedByMake = await client.query(`
      SELECT 
        make,
        COUNT(*) as unlinked_count,
        MIN(year) as min_year,
        MAX(year) as max_year,
        COUNT(DISTINCT model) as unique_models
      FROM motorcycles
      WHERE cleaned_spec_id IS NULL
      GROUP BY make
      ORDER BY unlinked_count DESC
      LIMIT 20
    `);
    
    console.log('Make | Count | Models | Year Range');
    console.log('-'.repeat(50));
    unlinkedByMake.rows.forEach(row => {
      console.log(`${row.make} | ${row.unlinked_count} | ${row.unique_models} | ${row.min_year}-${row.max_year}`);
    });
    
    // Check why they're not linking - missing specs?
    console.log('\n\n=== Checking for Missing Specs ===\n');
    
    const missingSpecs = await client.query(`
      SELECT 
        m.make,
        m.model,
        m.year,
        COUNT(*) as count,
        EXISTS (
          SELECT 1 FROM motorcycle_specs_cleaned msc
          WHERE LOWER(msc.manufacturer) = LOWER(m.make)
          AND LOWER(msc.model) = LOWER(m.model)
        ) as has_any_spec,
        EXISTS (
          SELECT 1 FROM motorcycle_specs_cleaned msc
          WHERE LOWER(msc.manufacturer) = LOWER(m.make)
          AND LOWER(msc.model) = LOWER(m.model)
          AND msc.year = m.year
        ) as has_year_spec
      FROM motorcycles m
      WHERE m.cleaned_spec_id IS NULL
      GROUP BY m.make, m.model, m.year
      ORDER BY count DESC
      LIMIT 20
    `);
    
    console.log('Make | Model | Year | Count | Has Any Spec? | Has Year Spec?');
    console.log('-'.repeat(80));
    missingSpecs.rows.forEach(row => {
      console.log(`${row.make} | ${row.model} | ${row.year} | ${row.count} | ${row.has_any_spec} | ${row.has_year_spec}`);
    });
    
    // Check for name mismatches
    console.log('\n\n=== Checking for Potential Name Mismatches ===\n');
    
    // Get unique makes from motorcycles not in specs
    const motorcycleMakes = await client.query(`
      SELECT DISTINCT make 
      FROM motorcycles 
      WHERE cleaned_spec_id IS NULL
      ORDER BY make
    `);
    
    const specManufacturers = await client.query(`
      SELECT DISTINCT manufacturer
      FROM motorcycle_specs_cleaned
      ORDER BY manufacturer
    `);
    
    console.log('Motorcycle makes not found in specs (first 20):');
    const makeSet = new Set(specManufacturers.rows.map(r => r.manufacturer.toLowerCase()));
    let notFoundCount = 0;
    
    for (const row of motorcycleMakes.rows) {
      if (!makeSet.has(row.make.toLowerCase())) {
        console.log(`  - ${row.make}`);
        notFoundCount++;
        if (notFoundCount >= 20) break;
      }
    }
    
    // Check for similar names (potential typos or variations)
    console.log('\n\n=== Potential Make Name Variations ===\n');
    
    const nameVariations = await client.query(`
      WITH unlinked_makes AS (
        SELECT DISTINCT make
        FROM motorcycles
        WHERE cleaned_spec_id IS NULL
      ),
      spec_manufacturers AS (
        SELECT DISTINCT manufacturer
        FROM motorcycle_specs_cleaned
      )
      SELECT 
        um.make as motorcycle_make,
        sm.manufacturer as spec_manufacturer,
        similarity(um.make, sm.manufacturer) as similarity_score
      FROM unlinked_makes um
      CROSS JOIN spec_manufacturers sm
      WHERE similarity(um.make, sm.manufacturer) > 0.5
      AND LOWER(um.make) != LOWER(sm.manufacturer)
      ORDER BY similarity_score DESC
      LIMIT 20
    `);
    
    if (nameVariations.rowCount > 0) {
      console.log('Motorcycle Make | Spec Manufacturer | Similarity');
      console.log('-'.repeat(50));
      nameVariations.rows.forEach(row => {
        console.log(`${row.motorcycle_make} | ${row.spec_manufacturer} | ${row.similarity_score.toFixed(3)}`);
      });
    }
    
    // Sample of actual unlinked motorcycles
    console.log('\n\n=== Sample Unlinked Motorcycles ===\n');
    
    const samples = await client.query(`
      SELECT 
        id,
        year,
        make,
        model,
        package,
        category,
        engine
      FROM motorcycles
      WHERE cleaned_spec_id IS NULL
      ORDER BY make, model, year
      LIMIT 30
    `);
    
    console.log('ID | Year | Make | Model | Package | Category | Engine');
    console.log('-'.repeat(100));
    samples.rows.forEach(row => {
      console.log(`${row.id.substring(0, 8)}... | ${row.year} | ${row.make} | ${row.model} | ${row.package || '-'} | ${row.category || '-'} | ${row.engine || '-'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the analysis
analyzeUnlinkedMotorcycles();