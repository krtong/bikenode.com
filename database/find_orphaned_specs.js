import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function findOrphanedSpecs() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Overall statistics
    console.log('=== Spec Usage Statistics ===\n');
    
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM motorcycle_specs_cleaned) as total_specs,
        (SELECT COUNT(DISTINCT cleaned_spec_id) FROM motorcycles WHERE cleaned_spec_id IS NOT NULL) as used_specs,
        (SELECT COUNT(*) FROM motorcycle_specs_cleaned WHERE id NOT IN (
          SELECT DISTINCT cleaned_spec_id FROM motorcycles WHERE cleaned_spec_id IS NOT NULL
        )) as orphaned_specs
    `);
    
    const s = stats.rows[0];
    console.log(`Total cleaned specs: ${s.total_specs}`);
    console.log(`Used specs: ${s.used_specs}`);
    console.log(`Orphaned specs: ${s.orphaned_specs} (${(s.orphaned_specs/s.total_specs*100).toFixed(1)}%)\n`);
    
    // Find orphaned specs by manufacturer
    console.log('=== Orphaned Specs by Manufacturer ===\n');
    
    const orphanedByMfg = await client.query(`
      SELECT 
        msc.manufacturer,
        COUNT(*) as orphaned_count,
        COUNT(DISTINCT (msc.model, msc.year)) as unique_models,
        MIN(msc.year) as min_year,
        MAX(msc.year) as max_year,
        ARRAY_AGG(DISTINCT msc.variant ORDER BY msc.variant) FILTER (WHERE msc.variant IS NOT NULL) as variants
      FROM motorcycle_specs_cleaned msc
      WHERE msc.id NOT IN (
        SELECT DISTINCT cleaned_spec_id FROM motorcycles WHERE cleaned_spec_id IS NOT NULL
      )
      GROUP BY msc.manufacturer
      ORDER BY orphaned_count DESC
      LIMIT 20
    `);
    
    console.log('Manufacturer | Orphaned | Models | Years | Sample Variants');
    console.log('-'.repeat(80));
    orphanedByMfg.rows.forEach(row => {
      const variantSample = row.variants ? row.variants.slice(0, 3).join(', ') : 'N/A';
      console.log(`${row.manufacturer} | ${row.orphaned_count} | ${row.unique_models} | ${row.min_year}-${row.max_year} | ${variantSample}`);
    });
    
    // Sample some orphaned specs
    console.log('\n\n=== Sample Orphaned Specs ===\n');
    
    const orphanedSamples = await client.query(`
      SELECT 
        msc.manufacturer,
        msc.model,
        msc.variant,
        msc.year,
        msc.year_invariant,
        msc.original_year_string
      FROM motorcycle_specs_cleaned msc
      WHERE msc.id NOT IN (
        SELECT DISTINCT cleaned_spec_id FROM motorcycles WHERE cleaned_spec_id IS NOT NULL
      )
      ORDER BY msc.manufacturer, msc.model, msc.year
      LIMIT 30
    `);
    
    console.log('Manufacturer | Model | Variant | Year | Year-Inv | Original Year');
    console.log('-'.repeat(90));
    orphanedSamples.rows.forEach(row => {
      console.log(`${row.manufacturer} | ${row.model} | ${row.variant || '-'} | ${row.year} | ${row.year_invariant ? 'Y' : 'N'} | ${row.original_year_string || '-'}`);
    });
    
    // Check for potential matches
    console.log('\n\n=== Checking Why Some Specs Are Orphaned ===\n');
    
    // Look for close matches
    const closeMatches = await client.query(`
      WITH orphaned AS (
        SELECT DISTINCT
          msc.manufacturer,
          msc.model,
          msc.year
        FROM motorcycle_specs_cleaned msc
        WHERE msc.id NOT IN (
          SELECT DISTINCT cleaned_spec_id FROM motorcycles WHERE cleaned_spec_id IS NOT NULL
        )
        LIMIT 10
      )
      SELECT 
        o.manufacturer as spec_manufacturer,
        o.model as spec_model,
        o.year as spec_year,
        m.make as motorcycle_make,
        m.model as motorcycle_model,
        m.year as motorcycle_year,
        COUNT(*) as count
      FROM orphaned o
      LEFT JOIN motorcycles m ON 
        LOWER(m.make) LIKE '%' || LOWER(SUBSTRING(o.manufacturer, 1, 4)) || '%' AND
        m.year = o.year
      GROUP BY o.manufacturer, o.model, o.year, m.make, m.model, m.year
      ORDER BY o.manufacturer, o.model, o.year
    `);
    
    console.log('Checking first 10 orphaned specs for potential matches...\n');
    
    let currentSpec = '';
    closeMatches.rows.forEach(row => {
      const specKey = `${row.spec_year} ${row.spec_manufacturer} ${row.spec_model}`;
      if (specKey !== currentSpec) {
        console.log(`\n${specKey}:`);
        currentSpec = specKey;
      }
      if (row.motorcycle_make) {
        console.log(`  Potential match: ${row.motorcycle_year} ${row.motorcycle_make} ${row.motorcycle_model} (${row.count} motorcycles)`);
      } else {
        console.log(`  No potential matches found`);
      }
    });
    
    // Check specific cases
    console.log('\n\n=== Specific Examples ===\n');
    
    // Check BSA Bantam
    const bsaBantam = await client.query(`
      SELECT 
        id, manufacturer, model, variant, year, year_invariant
      FROM motorcycle_specs_cleaned
      WHERE manufacturer = 'BSA' AND model = 'Bantam'
      ORDER BY year, variant
    `);
    
    console.log('BSA Bantam specs in cleaned table:');
    bsaBantam.rows.forEach(row => {
      console.log(`  ${row.year} ${row.variant || '[no variant]'} (ID: ${row.id}) ${row.year_invariant ? '(all years)' : ''}`);
    });
    
    // Check if there are BSA motorcycles
    const bsaMotorcycles = await client.query(`
      SELECT 
        year, make, model, COUNT(*) as count
      FROM motorcycles
      WHERE make = 'BSA'
      GROUP BY year, make, model
      ORDER BY model, year
      LIMIT 10
    `);
    
    console.log('\nBSA motorcycles in catalog:');
    if (bsaMotorcycles.rows.length === 0) {
      console.log('  No BSA motorcycles found!');
    } else {
      bsaMotorcycles.rows.forEach(row => {
        console.log(`  ${row.year} ${row.make} ${row.model} (${row.count} motorcycles)`);
      });
    }
    
    // Summary of issues
    console.log('\n\n=== Summary of Issues ===\n');
    
    const issues = await client.query(`
      WITH spec_manufacturers AS (
        SELECT DISTINCT manufacturer FROM motorcycle_specs_cleaned
      ),
      motorcycle_makes AS (
        SELECT DISTINCT make FROM motorcycles
      )
      SELECT 
        sm.manufacturer,
        EXISTS (SELECT 1 FROM motorcycle_makes WHERE LOWER(make) = LOWER(sm.manufacturer)) as exact_match,
        (SELECT make FROM motorcycle_makes WHERE LOWER(make) LIKE '%' || LOWER(sm.manufacturer) || '%' LIMIT 1) as partial_match
      FROM spec_manufacturers sm
      WHERE NOT EXISTS (
        SELECT 1 FROM motorcycle_makes WHERE LOWER(make) = LOWER(sm.manufacturer)
      )
      ORDER BY sm.manufacturer
      LIMIT 20
    `);
    
    console.log('Spec manufacturers not found in motorcycle catalog:');
    issues.rows.forEach(row => {
      console.log(`  ${row.manufacturer} ${row.partial_match ? `(partial match: ${row.partial_match})` : '(no match)'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the analysis
findOrphanedSpecs();