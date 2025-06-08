import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function reviewMotorcycleMatches() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // First, let's see what we're working with
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM motorcycles) as total_motorcycles,
        (SELECT COUNT(*) FROM motorcycles WHERE cleaned_spec_id IS NOT NULL) as already_linked,
        (SELECT COUNT(*) FROM motorcycle_specs_cleaned) as total_specs
    `);
    
    console.log('Current status:');
    console.log(`  Total motorcycles: ${stats.rows[0].total_motorcycles}`);
    console.log(`  Already linked: ${stats.rows[0].already_linked}`);
    console.log(`  Total cleaned specs: ${stats.rows[0].total_specs}\n`);
    
    // Find motorcycles with multiple possible matches
    console.log('=== Motorcycles with Multiple Possible Spec Matches ===\n');
    
    const multipleMatches = await client.query(`
      WITH possible_matches AS (
        SELECT 
          m.id as motorcycle_id,
          m.year as motorcycle_year,
          m.make,
          m.model,
          m.package,
          m.category,
          m.engine,
          COUNT(DISTINCT msc.id) as match_count,
          ARRAY_AGG(
            json_build_object(
              'spec_id', msc.id,
              'variant', msc.variant,
              'year_invariant', msc.year_invariant,
              'original_year', msc.original_year_string
            ) ORDER BY msc.variant NULLS FIRST
          ) as possible_specs
        FROM motorcycles m
        JOIN motorcycle_specs_cleaned msc ON 
          LOWER(m.make) = LOWER(msc.manufacturer) AND
          LOWER(m.model) = LOWER(msc.model) AND
          m.year = msc.year
        WHERE m.cleaned_spec_id IS NULL
        GROUP BY m.id, m.year, m.make, m.model, m.package, m.category, m.engine
        HAVING COUNT(DISTINCT msc.id) > 1
      )
      SELECT * FROM possible_matches
      ORDER BY 
        match_count DESC,
        make,
        model,
        motorcycle_year
      LIMIT 20
    `);
    
    console.log(`Found ${multipleMatches.rowCount} motorcycles with multiple matches. Showing first 20:\n`);
    
    multipleMatches.rows.forEach((moto, index) => {
      console.log(`${index + 1}. ${moto.motorcycle_year} ${moto.make} ${moto.model}`);
      if (moto.package) console.log(`   Package: "${moto.package}"`);
      if (moto.category) console.log(`   Category: ${moto.category}`);
      if (moto.engine) console.log(`   Engine: ${moto.engine}`);
      console.log(`   Possible matches (${moto.match_count}):`);
      
      moto.possible_specs.forEach((spec, i) => {
        console.log(`     ${i + 1}) ${spec.variant || '[No variant]'} ${spec.year_invariant ? '(all years)' : ''}`);
        if (spec.original_year) console.log(`        Original year data: ${spec.original_year}`);
      });
      console.log('');
    });
    
    // Check for package-to-variant matching opportunities
    console.log('\n=== Motorcycles with Packages that Might Match Variants ===\n');
    
    const packageToVariant = await client.query(`
      SELECT 
        m.id,
        m.year,
        m.make,
        m.model,
        m.package,
        ARRAY_AGG(DISTINCT msc.variant ORDER BY msc.variant) as available_variants
      FROM motorcycles m
      JOIN motorcycle_specs_cleaned msc ON 
        LOWER(m.make) = LOWER(msc.manufacturer) AND
        LOWER(m.model) = LOWER(msc.model) AND
        m.year = msc.year AND
        msc.variant IS NOT NULL
      WHERE 
        m.cleaned_spec_id IS NULL AND
        m.package IS NOT NULL
      GROUP BY m.id, m.year, m.make, m.model, m.package
      ORDER BY m.make, m.model, m.year
      LIMIT 20
    `);
    
    console.log(`Found ${packageToVariant.rowCount} potential package-to-variant matches. Showing first 20:\n`);
    
    packageToVariant.rows.forEach((moto, index) => {
      console.log(`${index + 1}. ${moto.year} ${moto.make} ${moto.model}`);
      console.log(`   Package: "${moto.package}"`);
      console.log(`   Available variants: ${moto.available_variants.join(', ')}`);
      
      // Check for likely matches
      const packageLower = moto.package.toLowerCase();
      const likelyMatches = moto.available_variants.filter(v => 
        v.toLowerCase().includes(packageLower) || 
        packageLower.includes(v.toLowerCase().replace(' (all)', ''))
      );
      
      if (likelyMatches.length > 0) {
        console.log(`   ⭐ Likely matches: ${likelyMatches.join(', ')}`);
      }
      console.log('');
    });
    
    // Show some examples where package exactly matches variant
    console.log('\n=== Exact Package-to-Variant Matches (Auto-linkable) ===\n');
    
    const exactPackageMatches = await client.query(`
      SELECT 
        m.id,
        m.year,
        m.make,
        m.model,
        m.package,
        msc.id as spec_id,
        msc.variant
      FROM motorcycles m
      JOIN motorcycle_specs_cleaned msc ON 
        LOWER(m.make) = LOWER(msc.manufacturer) AND
        LOWER(m.model) = LOWER(msc.model) AND
        m.year = msc.year AND
        LOWER(m.package) = LOWER(REPLACE(msc.variant, ' (all)', ''))
      WHERE 
        m.cleaned_spec_id IS NULL AND
        m.package IS NOT NULL AND
        msc.variant IS NOT NULL
      LIMIT 10
    `);
    
    if (exactPackageMatches.rowCount > 0) {
      console.log(`Found ${exactPackageMatches.rowCount} exact matches:\n`);
      exactPackageMatches.rows.forEach(match => {
        console.log(`${match.year} ${match.make} ${match.model}`);
        console.log(`  Package: "${match.package}" → Variant: "${match.variant}"`);
      });
    }
    
    // Create SQL commands for manual review
    console.log('\n\n=== SQL Commands for Manual Linking ===\n');
    console.log('To link a motorcycle to a spec, use:');
    console.log('UPDATE motorcycles SET cleaned_spec_id = [SPEC_ID] WHERE id = \'[MOTORCYCLE_ID]\';');
    console.log('\nTo see more details about a specific spec:');
    console.log('SELECT * FROM motorcycle_specs_cleaned WHERE id = [SPEC_ID];');
    
    // Export problematic matches for review
    const exportQuery = await client.query(`
      WITH review_needed AS (
        SELECT 
          m.id as motorcycle_id,
          m.year,
          m.make,
          m.model,
          m.package,
          m.engine,
          json_agg(
            json_build_object(
              'spec_id', msc.id,
              'variant', msc.variant,
              'year_invariant', msc.year_invariant
            ) ORDER BY msc.variant NULLS FIRST
          ) as possible_specs
        FROM motorcycles m
        JOIN motorcycle_specs_cleaned msc ON 
          LOWER(m.make) = LOWER(msc.manufacturer) AND
          LOWER(m.model) = LOWER(msc.model) AND
          m.year = msc.year
        WHERE m.cleaned_spec_id IS NULL
        GROUP BY m.id, m.year, m.make, m.model, m.package, m.engine
        HAVING COUNT(DISTINCT msc.id) > 1
      )
      SELECT * FROM review_needed
      ORDER BY make, model, year
    `);
    
    // Save to file for manual review
    const fs = await import('fs/promises');
    await fs.writeFile(
      'motorcycle_matches_to_review.json',
      JSON.stringify(exportQuery.rows, null, 2)
    );
    
    console.log(`\n✓ Exported ${exportQuery.rowCount} motorcycles needing review to motorcycle_matches_to_review.json`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the review
reviewMotorcycleMatches();