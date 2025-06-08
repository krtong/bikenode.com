import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function simpleLinkMotorcycles() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Add spec_id column if needed
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'motorcycles' 
      AND column_name = 'cleaned_spec_id'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('Adding cleaned_spec_id column to motorcycles table...');
      await client.query(`
        ALTER TABLE motorcycles 
        ADD COLUMN cleaned_spec_id INTEGER REFERENCES motorcycle_specs_cleaned(id)
      `);
      await client.query(`
        CREATE INDEX idx_motorcycles_cleaned_spec_id ON motorcycles(cleaned_spec_id)
      `);
      console.log('✓ Column added\n');
    }
    
    // Simple direct linking: match by make, model, year
    console.log('Linking motorcycles to cleaned specs...');
    
    const result = await client.query(`
      WITH matches AS (
        SELECT DISTINCT ON (m.id)
          m.id as motorcycle_id,
          msc.id as spec_id
        FROM motorcycles m
        JOIN motorcycle_specs_cleaned msc ON 
          LOWER(m.make) = LOWER(msc.manufacturer) AND
          LOWER(m.model) = LOWER(msc.model) AND
          m.year = msc.year
        WHERE m.cleaned_spec_id IS NULL
        ORDER BY m.id, 
          -- Prefer non-variant specs first, then variant specs
          CASE WHEN msc.variant IS NULL THEN 0 ELSE 1 END,
          -- For variants, prefer (all) variants
          CASE WHEN msc.variant LIKE '%(all)%' THEN 0 ELSE 1 END,
          msc.id
      )
      UPDATE motorcycles m
      SET 
        cleaned_spec_id = matches.spec_id,
        updated_at = NOW()
      FROM matches
      WHERE m.id = matches.motorcycle_id
    `);
    
    console.log(`✓ Linked ${result.rowCount} motorcycles\n`);
    
    // Get statistics
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_motorcycles,
        COUNT(cleaned_spec_id) as linked_motorcycles,
        COUNT(*) - COUNT(cleaned_spec_id) as unlinked_motorcycles,
        ROUND(COUNT(cleaned_spec_id)::numeric / COUNT(*)::numeric * 100, 2) as link_percentage
      FROM motorcycles
    `);
    
    const s = stats.rows[0];
    console.log('=== Linking Results ===');
    console.log(`Total motorcycles: ${s.total_motorcycles}`);
    console.log(`Linked motorcycles: ${s.linked_motorcycles}`);
    console.log(`Unlinked motorcycles: ${s.unlinked_motorcycles}`);
    console.log(`Link percentage: ${s.link_percentage}%`);
    
    // Show top unlinked makes
    const unlinked = await client.query(`
      SELECT 
        make,
        COUNT(*) as count,
        MIN(year) as min_year,
        MAX(year) as max_year
      FROM motorcycles
      WHERE cleaned_spec_id IS NULL
      GROUP BY make
      ORDER BY count DESC
      LIMIT 15
    `);
    
    console.log('\nTop makes without linked specs:');
    console.log('Make | Count | Year Range');
    console.log('-'.repeat(40));
    unlinked.rows.forEach(row => {
      console.log(`${row.make} | ${row.count} | ${row.min_year}-${row.max_year}`);
    });
    
    // Show example linked motorcycles with variants
    const examples = await client.query(`
      SELECT 
        m.year,
        m.make,
        m.model,
        m.package,
        msc.variant,
        msc.year_invariant
      FROM motorcycles m
      JOIN motorcycle_specs_cleaned msc ON m.cleaned_spec_id = msc.id
      WHERE msc.variant IS NOT NULL
      LIMIT 20
    `);
    
    console.log('\nExample motorcycles linked to variant specs:');
    console.log('Year | Make | Model | Package | Variant | Year-Invariant');
    console.log('-'.repeat(80));
    examples.rows.forEach(row => {
      console.log(`${row.year} | ${row.make} | ${row.model} | ${row.package || '-'} | ${row.variant} | ${row.year_invariant}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the simple linking
simpleLinkMotorcycles();