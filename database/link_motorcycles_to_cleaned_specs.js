import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function linkMotorcyclesToCleanedSpecs() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // First, check if motorcycles table has spec_id column
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'motorcycles' 
      AND column_name = 'spec_id'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('Adding spec_id column to motorcycles table...');
      await client.query(`
        ALTER TABLE motorcycles 
        ADD COLUMN spec_id INTEGER REFERENCES motorcycle_specs_cleaned(id)
      `);
      await client.query(`
        CREATE INDEX idx_motorcycles_spec_id ON motorcycles(spec_id)
      `);
      console.log('✓ Column added\n');
    }
    
    // Create a mapping table for complex relationships
    console.log('Creating mapping table for complex relationships...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS motorcycle_cleaned_specs_mapping (
        id SERIAL PRIMARY KEY,
        motorcycle_id UUID NOT NULL REFERENCES motorcycles(id),
        spec_id INTEGER NOT NULL REFERENCES motorcycle_specs_cleaned(id),
        variant_match BOOLEAN DEFAULT FALSE,
        confidence DECIMAL(3,2) DEFAULT 1.0,
        match_type VARCHAR(50) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(motorcycle_id, spec_id)
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mcsm_motorcycle_id ON motorcycle_cleaned_specs_mapping(motorcycle_id);
      CREATE INDEX IF NOT EXISTS idx_mcsm_spec_id ON motorcycle_cleaned_specs_mapping(spec_id);
      CREATE INDEX IF NOT EXISTS idx_mcsm_confidence ON motorcycle_cleaned_specs_mapping(confidence DESC);
    `);
    
    console.log('✓ Mapping table ready\n');
    
    // Get statistics
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM motorcycles) as total_motorcycles,
        (SELECT COUNT(*) FROM motorcycles WHERE spec_id IS NOT NULL) as already_linked,
        (SELECT COUNT(*) FROM motorcycle_specs_cleaned) as total_specs
    `);
    
    console.log('Current statistics:');
    console.log(`  Total motorcycles: ${stats.rows[0].total_motorcycles}`);
    console.log(`  Already linked: ${stats.rows[0].already_linked}`);
    console.log(`  Total cleaned specs: ${stats.rows[0].total_specs}\n`);
    
    // Phase 1: Direct matches (manufacturer, model, variant, year)
    console.log('Phase 1: Linking exact matches with variants...');
    
    const phase1 = await client.query(`
      WITH matches AS (
        SELECT DISTINCT ON (m.id)
          m.id as motorcycle_id,
          msc.id as spec_id,
          msc.variant,
          'exact_with_variant' as match_type
        FROM motorcycles m
        JOIN motorcycle_specs_cleaned msc ON 
          LOWER(m.make) = LOWER(msc.manufacturer) AND
          LOWER(m.model) = LOWER(msc.model) AND
          m.year = msc.year AND
          msc.variant IS NOT NULL
        WHERE m.spec_id IS NULL
        ORDER BY m.id, 
          CASE WHEN msc.variant LIKE '%(all)%' THEN 1 ELSE 0 END DESC,
          LENGTH(msc.variant) DESC
      )
      INSERT INTO motorcycle_cleaned_specs_mapping 
        (motorcycle_id, spec_id, variant_match, confidence, match_type)
      SELECT 
        motorcycle_id, 
        spec_id, 
        TRUE,
        1.0,
        match_type
      FROM matches
      ON CONFLICT (motorcycle_id, spec_id) DO NOTHING
      RETURNING motorcycle_id
    `);
    
    console.log(`  Linked ${phase1.rowCount} motorcycles with variant matches\n`);
    
    // Phase 2: Direct matches without variants (manufacturer, model, year)
    console.log('Phase 2: Linking exact matches without variants...');
    
    const phase2 = await client.query(`
      WITH matches AS (
        SELECT DISTINCT ON (m.id)
          m.id as motorcycle_id,
          msc.id as spec_id,
          'exact_no_variant' as match_type
        FROM motorcycles m
        JOIN motorcycle_specs_cleaned msc ON 
          LOWER(m.make) = LOWER(msc.manufacturer) AND
          LOWER(m.model) = LOWER(msc.model) AND
          m.year = msc.year AND
          msc.variant IS NULL
        WHERE 
          m.spec_id IS NULL AND
          NOT EXISTS (
            SELECT 1 FROM motorcycle_cleaned_specs_mapping mcsm 
            WHERE mcsm.motorcycle_id = m.id
          )
        ORDER BY m.id, msc.id
      )
      INSERT INTO motorcycle_cleaned_specs_mapping 
        (motorcycle_id, spec_id, variant_match, confidence, match_type)
      SELECT 
        motorcycle_id, 
        spec_id, 
        FALSE,
        0.95,
        match_type
      FROM matches
      ON CONFLICT (motorcycle_id, spec_id) DO NOTHING
      RETURNING motorcycle_id
    `);
    
    console.log(`  Linked ${phase2.rowCount} motorcycles without variant info\n`);
    
    // Phase 3: Handle package/variant matching
    console.log('Phase 3: Matching motorcycles with package to variants...');
    
    const phase3 = await client.query(`
      WITH matches AS (
        SELECT DISTINCT ON (m.id)
          m.id as motorcycle_id,
          msc.id as spec_id,
          m.package,
          msc.variant,
          'package_to_variant' as match_type,
          CASE 
            WHEN m.package = msc.variant THEN 1.0
            WHEN LOWER(m.package) = LOWER(msc.variant) THEN 0.95
            WHEN msc.variant LIKE '%' || m.package || '%' THEN 0.85
            ELSE 0.75
          END as confidence
        FROM motorcycles m
        JOIN motorcycle_specs_cleaned msc ON 
          LOWER(m.make) = LOWER(msc.manufacturer) AND
          LOWER(m.model) = LOWER(msc.model) AND
          m.year = msc.year
        WHERE 
          m.spec_id IS NULL AND
          m.package IS NOT NULL AND
          msc.variant IS NOT NULL AND
          NOT EXISTS (
            SELECT 1 FROM motorcycle_cleaned_specs_mapping mcsm 
            WHERE mcsm.motorcycle_id = m.id
          )
        ORDER BY m.id, 
          CASE 
            WHEN m.package = msc.variant THEN 1
            WHEN LOWER(m.package) = LOWER(msc.variant) THEN 2
            WHEN msc.variant LIKE '%' || m.package || '%' THEN 3
            ELSE 4
          END,
          msc.id
      )
      INSERT INTO motorcycle_cleaned_specs_mapping 
        (motorcycle_id, spec_id, variant_match, confidence, match_type, notes)
      SELECT 
        motorcycle_id, 
        spec_id, 
        TRUE,
        confidence,
        match_type,
        'Package: ' || package || ' → Variant: ' || variant
      FROM matches
      ON CONFLICT (motorcycle_id, spec_id) DO NOTHING
      RETURNING motorcycle_id
    `);
    
    console.log(`  Linked ${phase3.rowCount} motorcycles via package/variant matching\n`);
    
    // Update the main motorcycles table with best matches
    console.log('Updating motorcycles table with best matches...');
    
    const updateResult = await client.query(`
      WITH best_matches AS (
        SELECT DISTINCT ON (motorcycle_id)
          motorcycle_id,
          spec_id,
          confidence
        FROM motorcycle_cleaned_specs_mapping
        ORDER BY motorcycle_id, confidence DESC, spec_id
      )
      UPDATE motorcycles m
      SET 
        spec_id = bm.spec_id,
        updated_at = NOW()
      FROM best_matches bm
      WHERE m.id = bm.motorcycle_id
      AND m.spec_id IS NULL
    `);
    
    console.log(`✓ Updated ${updateResult.rowCount} motorcycles with spec links\n`);
    
    // Final statistics
    const finalStats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM motorcycles) as total_motorcycles,
        (SELECT COUNT(*) FROM motorcycles WHERE spec_id IS NOT NULL) as linked,
        (SELECT COUNT(DISTINCT motorcycle_id) FROM motorcycle_cleaned_specs_mapping) as mapped,
        (SELECT COUNT(*) FROM motorcycle_cleaned_specs_mapping WHERE variant_match = TRUE) as variant_matches,
        (SELECT AVG(confidence) FROM motorcycle_cleaned_specs_mapping) as avg_confidence
    `);
    
    const f = finalStats.rows[0];
    console.log('=== Final Statistics ===');
    console.log(`Total motorcycles: ${f.total_motorcycles}`);
    console.log(`Directly linked: ${f.linked} (${(f.linked/f.total_motorcycles*100).toFixed(1)}%)`);
    console.log(`Total mapped: ${f.mapped}`);
    console.log(`Variant matches: ${f.variant_matches}`);
    console.log(`Average confidence: ${parseFloat(f.avg_confidence).toFixed(3)}`);
    
    // Show some examples
    const examples = await client.query(`
      SELECT 
        m.year,
        m.make,
        m.model,
        m.package,
        msc.variant,
        mcsm.confidence,
        mcsm.match_type
      FROM motorcycles m
      JOIN motorcycle_cleaned_specs_mapping mcsm ON m.id = mcsm.motorcycle_id
      JOIN motorcycle_specs_cleaned msc ON mcsm.spec_id = msc.id
      WHERE msc.variant IS NOT NULL
      ORDER BY mcsm.confidence DESC
      LIMIT 10
    `);
    
    console.log('\nExample variant matches:');
    console.log('Year | Make | Model | Package | Variant | Confidence | Type');
    console.log('-'.repeat(80));
    examples.rows.forEach(row => {
      console.log(`${row.year} | ${row.make} | ${row.model} | ${row.package || 'N/A'} | ${row.variant} | ${row.confidence} | ${row.match_type}`);
    });
    
    // Check unmatched motorcycles
    const unmatched = await client.query(`
      SELECT 
        make,
        COUNT(*) as count
      FROM motorcycles
      WHERE spec_id IS NULL
      GROUP BY make
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\nTop makes with unmatched motorcycles:');
    unmatched.rows.forEach(row => {
      console.log(`  ${row.make}: ${row.count} unmatched`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the linking process
linkMotorcyclesToCleanedSpecs();