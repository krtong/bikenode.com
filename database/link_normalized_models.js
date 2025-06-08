import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function linkNormalizedModels() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    console.log('=== Linking Specs with Normalized Model Names ===\n');
    
    // First, preview what will be linked
    const preview = await client.query(`
      WITH potential_matches AS (
        SELECT 
          m.id as motorcycle_id,
          m.make,
          m.model as motorcycle_model,
          m.year,
          msc.id as spec_id,
          msc.manufacturer,
          msc.model as spec_model,
          msc.variant
        FROM motorcycles m
        JOIN motorcycle_specs_cleaned msc ON
          LOWER(m.make) = LOWER(msc.manufacturer) AND
          m.year = msc.year AND
          LOWER(REGEXP_REPLACE(m.model, '[^a-z0-9]', '', 'g')) = 
          LOWER(REGEXP_REPLACE(msc.model, '[^a-z0-9]', '', 'g'))
        WHERE 
          m.cleaned_spec_id IS NULL AND
          LOWER(m.model) != LOWER(msc.model)
      )
      SELECT 
        make,
        COUNT(*) as count,
        MIN(motorcycle_model) as sample_moto_model,
        MIN(spec_model) as sample_spec_model
      FROM potential_matches
      GROUP BY make
      ORDER BY count DESC
    `);
    
    console.log('Preview of matches by manufacturer:');
    console.log('Make | Count | Sample Motorcycle Model | Sample Spec Model');
    console.log('-'.repeat(80));
    
    let totalPotential = 0;
    preview.rows.forEach(row => {
      console.log(`${row.make} | ${row.count} | ${row.sample_moto_model} | ${row.sample_spec_model}`);
      totalPotential += parseInt(row.count);
    });
    console.log(`\nTotal potential matches: ${totalPotential}\n`);
    
    // Now perform the actual linking
    console.log('Performing normalization-based linking...\n');
    
    const result = await client.query(`
      WITH matches AS (
        SELECT DISTINCT ON (m.id)
          m.id as motorcycle_id,
          msc.id as spec_id,
          m.make,
          m.model as motorcycle_model,
          msc.model as spec_model
        FROM motorcycles m
        JOIN motorcycle_specs_cleaned msc ON
          LOWER(m.make) = LOWER(msc.manufacturer) AND
          m.year = msc.year AND
          LOWER(REGEXP_REPLACE(m.model, '[^a-z0-9]', '', 'g')) = 
          LOWER(REGEXP_REPLACE(msc.model, '[^a-z0-9]', '', 'g'))
        WHERE 
          m.cleaned_spec_id IS NULL AND
          LOWER(m.model) != LOWER(msc.model)
        ORDER BY m.id, 
          CASE WHEN msc.variant IS NULL THEN 0 ELSE 1 END,
          msc.id
      )
      UPDATE motorcycles m
      SET 
        cleaned_spec_id = matches.spec_id,
        updated_at = NOW()
      FROM matches
      WHERE m.id = matches.motorcycle_id
      RETURNING matches.make, matches.motorcycle_model, matches.spec_model
    `);
    
    console.log(`✓ Successfully linked ${result.rowCount} motorcycles!\n`);
    
    // Show some examples of what was linked
    if (result.rows.length > 0) {
      console.log('Examples of linked models:');
      console.log('Make | Motorcycle Model | → | Spec Model');
      console.log('-'.repeat(60));
      result.rows.slice(0, 20).forEach(row => {
        console.log(`${row.make} | ${row.motorcycle_model} | → | ${row.spec_model}`);
      });
    }
    
    // Check for remaining common patterns
    console.log('\n\n=== Checking Remaining Patterns ===\n');
    
    // Check for ADV150 -> ADV 150 type patterns
    const numberSpacePattern = await client.query(`
      SELECT 
        m.make,
        m.model as motorcycle_model,
        msc.model as spec_model,
        m.year,
        COUNT(*) OVER (PARTITION BY m.make) as make_count
      FROM motorcycles m
      JOIN motorcycle_specs_cleaned msc ON
        LOWER(m.make) = LOWER(msc.manufacturer) AND
        m.year = msc.year AND
        -- Check if adding spaces before numbers would match
        LOWER(REGEXP_REPLACE(m.model, '([a-z])([0-9])', '\\1 \\2', 'g')) = LOWER(msc.model)
      WHERE 
        m.cleaned_spec_id IS NULL AND
        m.model ~ '[a-zA-Z][0-9]'  -- Has letter followed by number
      ORDER BY make_count DESC, m.make, m.model
      LIMIT 30
    `);
    
    if (numberSpacePattern.rows.length > 0) {
      console.log('Models that need spaces before numbers:');
      console.log('Make | Motorcycle Model | → | Spec Model | Year');
      console.log('-'.repeat(70));
      numberSpacePattern.rows.forEach(row => {
        console.log(`${row.make} | ${row.motorcycle_model} | → | ${row.spec_model} | ${row.year}`);
      });
      
      // Link these as well
      console.log('\nLinking models with number-space pattern...');
      
      const numberSpaceResult = await client.query(`
        WITH matches AS (
          SELECT DISTINCT ON (m.id)
            m.id as motorcycle_id,
            msc.id as spec_id
          FROM motorcycles m
          JOIN motorcycle_specs_cleaned msc ON
            LOWER(m.make) = LOWER(msc.manufacturer) AND
            m.year = msc.year AND
            LOWER(REGEXP_REPLACE(m.model, '([a-z])([0-9])', '\\1 \\2', 'g')) = LOWER(msc.model)
          WHERE 
            m.cleaned_spec_id IS NULL AND
            m.model ~ '[a-zA-Z][0-9]'
          ORDER BY m.id, 
            CASE WHEN msc.variant IS NULL THEN 0 ELSE 1 END,
            msc.id
        )
        UPDATE motorcycles m
        SET 
          cleaned_spec_id = matches.spec_id,
          updated_at = NOW()
        FROM matches
        WHERE m.id = matches.motorcycle_id
      `);
      
      console.log(`✓ Linked ${numberSpaceResult.rowCount} more motorcycles with number-space pattern\n`);
    }
    
    // Final statistics
    const finalStats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(cleaned_spec_id) as linked,
        COUNT(*) - COUNT(cleaned_spec_id) as unlinked,
        ROUND(COUNT(cleaned_spec_id)::numeric / COUNT(*)::numeric * 100, 2) as percentage
      FROM motorcycles
    `);
    
    const stats = finalStats.rows[0];
    console.log('\n=== Final Statistics ===');
    console.log(`Total motorcycles: ${stats.total}`);
    console.log(`Linked to specs: ${stats.linked} (${stats.percentage}%)`);
    console.log(`Still unlinked: ${stats.unlinked}\n`);
    
    // Show improvement by manufacturer
    const improvementByMake = await client.query(`
      SELECT 
        make,
        COUNT(*) as total,
        COUNT(cleaned_spec_id) as linked,
        ROUND(COUNT(cleaned_spec_id)::numeric / COUNT(*)::numeric * 100, 2) as percentage
      FROM motorcycles
      WHERE make IN ('Yamaha', 'Honda', 'Suzuki', 'Kawasaki', 'BMW', 'Ducati', 'KTM')
      GROUP BY make
      ORDER BY make
    `);
    
    console.log('Coverage by major manufacturer:');
    console.log('Make | Total | Linked | Coverage %');
    console.log('-'.repeat(40));
    improvementByMake.rows.forEach(row => {
      console.log(`${row.make} | ${row.total} | ${row.linked} | ${row.percentage}%`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the linking
linkNormalizedModels();