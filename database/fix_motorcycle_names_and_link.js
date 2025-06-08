import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function fixMotorcycleNamesAndLink() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // First, let's identify the common name issues
    console.log('=== Identifying Name Mapping Issues ===\n');
    
    // Manual mappings based on what we found
    const nameMappings = [
      { from: 'GAS', to: 'GASGAS', pattern: 'GAS %' },
      { from: 'Moto', to: 'Moto Guzzi', pattern: 'Guzzi %' },
      { from: 'MV', to: 'MV Agusta', pattern: 'Agusta %' },
      { from: 'Big', to: 'Big Bear Choppers', pattern: 'Bear Choppers' },
      { from: 'Chang-Jiang', to: 'Chang Jiang', pattern: null },
      { from: 'Arctic', to: 'Arctic Cat', pattern: 'Cat %' },
      { from: 'Harley-Davidson', to: 'Harley Davidson', pattern: null },
      { from: 'can-am', to: 'Can-Am', pattern: null },
      { from: 'SYM', to: 'Sym', pattern: null },
      { from: 'KYMCO', to: 'Kymco', pattern: null }
    ];
    
    // Try linking with name corrections
    console.log('Attempting to link with name corrections...\n');
    
    let totalLinked = 0;
    
    for (const mapping of nameMappings) {
      console.log(`Processing ${mapping.from} → ${mapping.to}`);
      
      let query;
      if (mapping.pattern) {
        // For split names like "GAS GAS" -> "GASGAS"
        query = `
          WITH matches AS (
            SELECT DISTINCT ON (m.id)
              m.id as motorcycle_id,
              msc.id as spec_id
            FROM motorcycles m
            JOIN motorcycle_specs_cleaned msc ON 
              m.make = $1 AND
              m.model LIKE $2 AND
              LOWER(msc.manufacturer) = LOWER($3) AND
              LOWER(CONCAT(m.make, ' ', m.model)) = LOWER(CONCAT(msc.manufacturer, ' ', msc.model)) AND
              m.year = msc.year
            WHERE m.cleaned_spec_id IS NULL
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
        `;
        
        const result = await client.query(query, [mapping.from, mapping.pattern, mapping.to]);
        console.log(`  Linked ${result.rowCount} motorcycles`);
        totalLinked += result.rowCount;
      } else {
        // For simple name mappings
        query = `
          WITH matches AS (
            SELECT DISTINCT ON (m.id)
              m.id as motorcycle_id,
              msc.id as spec_id
            FROM motorcycles m
            JOIN motorcycle_specs_cleaned msc ON 
              LOWER(m.make) = LOWER($1) AND
              LOWER(msc.manufacturer) = LOWER($2) AND
              LOWER(m.model) = LOWER(msc.model) AND
              m.year = msc.year
            WHERE m.cleaned_spec_id IS NULL
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
        `;
        
        const result = await client.query(query, [mapping.from, mapping.to]);
        console.log(`  Linked ${result.rowCount} motorcycles`);
        totalLinked += result.rowCount;
      }
    }
    
    console.log(`\n✓ Total linked with name corrections: ${totalLinked}\n`);
    
    // Now try fuzzy matching for remaining
    console.log('=== Attempting Fuzzy Matching ===\n');
    
    // Case-insensitive exact match first
    const caseInsensitive = await client.query(`
      WITH matches AS (
        SELECT DISTINCT ON (m.id)
          m.id as motorcycle_id,
          msc.id as spec_id
        FROM motorcycles m
        JOIN motorcycle_specs_cleaned msc ON 
          LOWER(TRIM(m.make)) = LOWER(TRIM(msc.manufacturer)) AND
          LOWER(TRIM(m.model)) = LOWER(TRIM(msc.model)) AND
          m.year = msc.year
        WHERE m.cleaned_spec_id IS NULL
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
    
    console.log(`Linked ${caseInsensitive.rowCount} more with case-insensitive matching\n`);
    
    // Handle hyphen variations
    const hyphenVariations = await client.query(`
      WITH matches AS (
        SELECT DISTINCT ON (m.id)
          m.id as motorcycle_id,
          msc.id as spec_id
        FROM motorcycles m
        JOIN motorcycle_specs_cleaned msc ON 
          LOWER(REPLACE(m.make, '-', ' ')) = LOWER(REPLACE(msc.manufacturer, '-', ' ')) AND
          LOWER(REPLACE(m.model, '-', ' ')) = LOWER(REPLACE(msc.model, '-', ' ')) AND
          m.year = msc.year
        WHERE m.cleaned_spec_id IS NULL
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
    
    console.log(`Linked ${hyphenVariations.rowCount} more with hyphen normalization\n`);
    
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
    console.log('=== Final Statistics ===');
    console.log(`Total motorcycles: ${stats.total}`);
    console.log(`Linked to specs: ${stats.linked} (${stats.percentage}%)`);
    console.log(`Still unlinked: ${stats.unlinked}\n`);
    
    // Show remaining problem areas
    const remainingIssues = await client.query(`
      SELECT 
        make,
        COUNT(*) as count,
        COUNT(DISTINCT model) as models
      FROM motorcycles
      WHERE cleaned_spec_id IS NULL
      GROUP BY make
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('Top makes still unlinked:');
    remainingIssues.rows.forEach(row => {
      console.log(`  ${row.make}: ${row.count} motorcycles (${row.models} models)`);
    });
    
    // Show some specific examples that might need manual attention
    console.log('\n\nExamples needing manual review:');
    
    const needsReview = await client.query(`
      WITH potential_matches AS (
        SELECT 
          m.id,
          m.year,
          m.make,
          m.model,
          m.package,
          msc.id as spec_id,
          msc.manufacturer,
          msc.model as spec_model,
          msc.variant,
          CASE 
            WHEN LOWER(m.model) LIKE '%' || LOWER(msc.model) || '%' THEN 'model contains spec'
            WHEN LOWER(msc.model) LIKE '%' || LOWER(m.model) || '%' THEN 'spec contains model'
            ELSE 'partial match'
          END as match_type
        FROM motorcycles m
        JOIN motorcycle_specs_cleaned msc ON 
          SOUNDEX(m.make) = SOUNDEX(msc.manufacturer) AND
          m.year = msc.year
        WHERE 
          m.cleaned_spec_id IS NULL AND
          LENGTH(m.model) > 3 AND
          LENGTH(msc.model) > 3
        LIMIT 20
      )
      SELECT * FROM potential_matches
      WHERE LOWER(model) != LOWER(spec_model)
      ORDER BY make, model
    `);
    
    if (needsReview.rows.length > 0) {
      console.log('\nMotorcycle | Potential Spec Match | Match Type');
      console.log('-'.repeat(80));
      needsReview.rows.forEach(row => {
        console.log(`${row.year} ${row.make} ${row.model} | ${row.manufacturer} ${row.spec_model} ${row.variant || ''} | ${row.match_type}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the fix and link
fixMotorcycleNamesAndLink();