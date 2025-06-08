import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function analyzeModelDifferences() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Focus on major manufacturers with poor linkage
    const manufacturers = ['Yamaha', 'Honda', 'Suzuki', 'Kawasaki', 'BMW', 'Ducati'];
    
    for (const mfg of manufacturers) {
      console.log(`\n=== ${mfg} Model Analysis ===\n`);
      
      // Get unlinked motorcycles
      const unlinkedModels = await client.query(`
        SELECT 
          model,
          year,
          COUNT(*) as count,
          MIN(year) || '-' || MAX(year) as year_range
        FROM motorcycles
        WHERE make = $1 AND cleaned_spec_id IS NULL
        GROUP BY model, year
        ORDER BY model, year
        LIMIT 20
      `, [mfg]);
      
      // Get available specs
      const availableSpecs = await client.query(`
        SELECT DISTINCT
          model,
          year,
          variant
        FROM motorcycle_specs_cleaned
        WHERE manufacturer = $1
        ORDER BY model, year
        LIMIT 20
      `, [mfg]);
      
      console.log('Unlinked Motorcycles:');
      console.log('Model | Year | Count');
      console.log('-'.repeat(40));
      unlinkedModels.rows.forEach(row => {
        console.log(`${row.model} | ${row.year} | ${row.count}`);
      });
      
      console.log('\nAvailable Specs:');
      console.log('Model | Year | Variant');
      console.log('-'.repeat(40));
      availableSpecs.rows.forEach(row => {
        console.log(`${row.model} | ${row.year} | ${row.variant || '-'}`);
      });
      
      // Look for potential matches with similar names
      console.log('\nPotential Model Matches:');
      const similarMatches = await client.query(`
        WITH unlinked AS (
          SELECT DISTINCT model, year
          FROM motorcycles
          WHERE make = $1 AND cleaned_spec_id IS NULL
          LIMIT 10
        ),
        specs AS (
          SELECT DISTINCT model, year
          FROM motorcycle_specs_cleaned
          WHERE manufacturer = $1
        )
        SELECT 
          u.model as motorcycle_model,
          u.year,
          s.model as spec_model
        FROM unlinked u
        JOIN specs s ON u.year = s.year
        WHERE 
          LOWER(u.model) != LOWER(s.model) AND
          (
            -- Check if one contains the other
            LOWER(u.model) LIKE '%' || LOWER(s.model) || '%' OR
            LOWER(s.model) LIKE '%' || LOWER(u.model) || '%' OR
            -- Check if they start the same
            SUBSTRING(LOWER(u.model), 1, 3) = SUBSTRING(LOWER(s.model), 1, 3)
          )
        ORDER BY u.model, s.model
        LIMIT 10
      `, [mfg]);
      
      if (similarMatches.rows.length > 0) {
        console.log('Motorcycle Model | Year | Spec Model');
        console.log('-'.repeat(60));
        similarMatches.rows.forEach(row => {
          console.log(`${row.motorcycle_model} | ${row.year} | ${row.spec_model}`);
        });
      } else {
        console.log('No similar matches found');
      }
    }
    
    // Check for common patterns in model naming
    console.log('\n\n=== Common Model Name Patterns ===\n');
    
    const patterns = await client.query(`
      WITH model_patterns AS (
        SELECT 
          m.make,
          m.model as motorcycle_model,
          msc.model as spec_model,
          m.year,
          CASE
            WHEN m.model LIKE '%-%' AND msc.model NOT LIKE '%-%' THEN 'motorcycle has dash'
            WHEN m.model NOT LIKE '%-%' AND msc.model LIKE '%-%' THEN 'spec has dash'
            WHEN m.model ~ '[0-9]+ -' THEN 'motorcycle has space after number'
            WHEN msc.model ~ '[0-9] [A-Z]' THEN 'spec has space in model'
            WHEN LENGTH(m.model) < LENGTH(msc.model) THEN 'spec model longer'
            WHEN LENGTH(m.model) > LENGTH(msc.model) THEN 'motorcycle model longer'
            ELSE 'other'
          END as pattern_type
        FROM motorcycles m
        JOIN motorcycle_specs_cleaned msc ON
          LOWER(m.make) = LOWER(msc.manufacturer) AND
          m.year = msc.year
        WHERE 
          m.cleaned_spec_id IS NULL AND
          LOWER(REPLACE(m.model, ' ', '')) = LOWER(REPLACE(msc.model, ' ', ''))
        LIMIT 50
      )
      SELECT 
        pattern_type,
        COUNT(*) as count,
        make,
        motorcycle_model,
        spec_model,
        year
      FROM model_patterns
      GROUP BY pattern_type, make, motorcycle_model, spec_model, year
      ORDER BY count DESC, pattern_type
    `);
    
    console.log('Pattern | Make | Motorcycle Model | Spec Model | Year');
    console.log('-'.repeat(80));
    patterns.rows.forEach(row => {
      console.log(`${row.pattern_type} | ${row.make} | ${row.motorcycle_model} | ${row.spec_model} | ${row.year}`);
    });
    
    // Check specific examples where spaces/punctuation might be the issue
    console.log('\n\n=== Testing Space/Punctuation Normalization ===\n');
    
    const normalizationTest = await client.query(`
      SELECT 
        m.make,
        m.model as motorcycle_model,
        m.year,
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
      ORDER BY m.make, m.year DESC
      LIMIT 30
    `);
    
    if (normalizationTest.rows.length > 0) {
      console.log('Potential matches with normalized model names:');
      console.log('Make | Year | Motorcycle Model | → | Spec Model');
      console.log('-'.repeat(80));
      normalizationTest.rows.forEach(row => {
        console.log(`${row.make} | ${row.year} | ${row.motorcycle_model} | → | ${row.spec_model}`);
      });
      
      console.log(`\nFound ${normalizationTest.rows.length} potential matches with space/punctuation normalization`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the analysis
analyzeModelDifferences();