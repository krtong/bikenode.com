import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

// Verified manufacturer mappings
const MANUFACTURER_MAPPINGS = [
  { motorcycle: 'Moto', spec: 'Moto Guzzi' },
  { motorcycle: 'MV', spec: 'MV Agusta' },
  { motorcycle: 'GAS', spec: 'GASGAS' },
  { motorcycle: 'Enfield', spec: 'Royal Enfield' },
  { motorcycle: 'Big', spec: 'Big Bear' },
  { motorcycle: 'Ghezzi-Brian', spec: 'Ghezzi Brian' },
  { motorcycle: 'CF', spec: 'CF Moto' },
  { motorcycle: 'MuZ', spec: 'MZ / MuZ' },
  { motorcycle: 'MZ', spec: 'MZ / MuZ' },
  { motorcycle: 'Buell', spec: 'Buell / EBR' },
  { motorcycle: 'Boss', spec: 'Boss Hoss' },
  { motorcycle: 'Brixton', spec: 'Brixton Motorcycles' },
  { motorcycle: 'Confederate', spec: 'Confederate / Combat Motors' },
  { motorcycle: 'Brough', spec: 'Brough Superior Motorcycles' },
  { motorcycle: 'Royal', spec: 'Royal Enfield' },
  { motorcycle: 'Arlen', spec: 'Arlen Ness' },
  { motorcycle: 'Arctic', spec: 'Arctic Cat' },
  { motorcycle: 'Chang-Jiang', spec: 'Chang Jiang' },
  { motorcycle: 'Can-Am', spec: 'BRP Cam-Am' },
  { motorcycle: 'Bajaj', spec: 'Bajai' }
];

async function linkSpecsWithVerifiedMappings() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    console.log('=== Linking Specs with Verified Manufacturer Mappings ===\n');
    
    let totalLinked = 0;
    
    // Process each mapping
    for (const mapping of MANUFACTURER_MAPPINGS) {
      console.log(`\nProcessing: ${mapping.motorcycle} → ${mapping.spec}`);
      
      // First, let's see what models would match
      const preview = await client.query(`
        SELECT 
          m.make,
          m.model,
          m.year,
          msc.manufacturer,
          msc.model as spec_model,
          msc.variant,
          COUNT(*) as count
        FROM motorcycles m
        JOIN motorcycle_specs_cleaned msc ON 
          LOWER(m.make) = LOWER($1) AND
          LOWER(msc.manufacturer) = LOWER($2) AND
          LOWER(TRIM(m.model)) = LOWER(TRIM(msc.model)) AND
          m.year = msc.year
        WHERE m.cleaned_spec_id IS NULL
        GROUP BY m.make, m.model, m.year, msc.manufacturer, msc.model, msc.variant
        ORDER BY m.year DESC, m.model
        LIMIT 10
      `, [mapping.motorcycle, mapping.spec]);
      
      if (preview.rows.length > 0) {
        console.log('  Sample matches:');
        preview.rows.forEach(row => {
          console.log(`    ${row.year} ${row.make} ${row.model} ↔ ${row.manufacturer} ${row.spec_model} ${row.variant || ''}`);
        });
      }
      
      // Now perform the actual linking
      const result = await client.query(`
        WITH matches AS (
          SELECT DISTINCT ON (m.id)
            m.id as motorcycle_id,
            msc.id as spec_id
          FROM motorcycles m
          JOIN motorcycle_specs_cleaned msc ON 
            LOWER(m.make) = LOWER($1) AND
            LOWER(msc.manufacturer) = LOWER($2) AND
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
      `, [mapping.motorcycle, mapping.spec]);
      
      console.log(`  ✓ Linked ${result.rowCount} motorcycles`);
      totalLinked += result.rowCount;
    }
    
    console.log(`\n\nTotal linked with manufacturer mappings: ${totalLinked}\n`);
    
    // Now try standard case-insensitive matching for remaining
    console.log('=== Attempting Standard Case-Insensitive Matching ===\n');
    
    const standardMatch = await client.query(`
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
    
    console.log(`Linked ${standardMatch.rowCount} more with standard matching\n`);
    
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
    console.log(`Still unlinked: ${stats.unlinked}`);
    console.log(`\nImprovement: ${totalLinked + standardMatch.rowCount} motorcycles newly linked!\n`);
    
    // Show top remaining unlinked makes
    const remainingUnlinked = await client.query(`
      SELECT 
        make,
        COUNT(*) as count,
        COUNT(DISTINCT model) as models,
        MIN(year) || '-' || MAX(year) as year_range
      FROM motorcycles
      WHERE cleaned_spec_id IS NULL
      GROUP BY make
      ORDER BY count DESC
      LIMIT 15
    `);
    
    console.log('Top makes still unlinked:');
    console.log('Make | Count | Models | Years');
    console.log('-'.repeat(50));
    remainingUnlinked.rows.forEach(row => {
      console.log(`${row.make} | ${row.count} | ${row.models} | ${row.year_range}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the linking
linkSpecsWithVerifiedMappings();