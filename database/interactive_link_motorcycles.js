import pkg from 'pg';
import readline from 'readline';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function interactiveLinkMotorcycles() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Add columns if needed
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
    
    // Create review table
    await client.query(`
      CREATE TABLE IF NOT EXISTS motorcycle_spec_review (
        id SERIAL PRIMARY KEY,
        motorcycle_id UUID NOT NULL REFERENCES motorcycles(id),
        spec_id INTEGER REFERENCES motorcycle_specs_cleaned(id),
        review_status VARCHAR(50) NOT NULL,
        reviewer_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(motorcycle_id)
      )
    `);
    
    // Phase 1: Auto-link exact matches
    console.log('Phase 1: Auto-linking exact matches...\n');
    
    const exactMatches = await client.query(`
      WITH matches AS (
        SELECT DISTINCT ON (m.id)
          m.id as motorcycle_id,
          msc.id as spec_id
        FROM motorcycles m
        JOIN motorcycle_specs_cleaned msc ON 
          LOWER(m.make) = LOWER(msc.manufacturer) AND
          LOWER(m.model) = LOWER(msc.model) AND
          m.year = msc.year AND
          msc.variant IS NULL
        WHERE m.cleaned_spec_id IS NULL
        ORDER BY m.id, msc.id
      )
      UPDATE motorcycles m
      SET 
        cleaned_spec_id = matches.spec_id,
        updated_at = NOW()
      FROM matches
      WHERE m.id = matches.motorcycle_id
    `);
    
    console.log(`✓ Auto-linked ${exactMatches.rowCount} exact matches\n`);
    
    // Phase 2: Interactive review for uncertain matches
    console.log('Phase 2: Interactive review for uncertain matches\n');
    console.log('I will show you motorcycles with multiple possible spec matches.');
    console.log('You can choose the best match or skip.\n');
    
    const startReview = await askQuestion('Ready to start reviewing? (y/n): ');
    if (startReview.toLowerCase() !== 'y') {
      console.log('Skipping interactive review.');
      return;
    }
    
    // Get motorcycles with multiple possible matches
    const uncertainMatches = await client.query(`
      WITH possible_matches AS (
        SELECT 
          m.id as motorcycle_id,
          m.year as motorcycle_year,
          m.make,
          m.model,
          m.package,
          m.engine,
          COUNT(DISTINCT msc.id) as match_count,
          ARRAY_AGG(DISTINCT msc.id ORDER BY msc.variant NULLS FIRST) as spec_ids
        FROM motorcycles m
        JOIN motorcycle_specs_cleaned msc ON 
          LOWER(m.make) = LOWER(msc.manufacturer) AND
          LOWER(m.model) = LOWER(msc.model) AND
          m.year = msc.year
        WHERE m.cleaned_spec_id IS NULL
        GROUP BY m.id, m.year, m.make, m.model, m.package, m.engine
        HAVING COUNT(DISTINCT msc.id) > 1
      )
      SELECT * FROM possible_matches
      ORDER BY match_count DESC, make, model, motorcycle_year
      LIMIT 50
    `);
    
    console.log(`\nFound ${uncertainMatches.rows.length} motorcycles with multiple possible matches.\n`);
    
    let reviewed = 0;
    let linked = 0;
    let skipped = 0;
    
    for (const motorcycle of uncertainMatches.rows) {
      console.log('\n' + '='.repeat(80));
      console.log(`\nMotorcycle ${reviewed + 1}/${uncertainMatches.rows.length}:`);
      console.log(`${motorcycle.motorcycle_year} ${motorcycle.make} ${motorcycle.model}`);
      if (motorcycle.package) console.log(`Package: ${motorcycle.package}`);
      if (motorcycle.engine) console.log(`Engine: ${motorcycle.engine}`);
      console.log(`\nFound ${motorcycle.match_count} possible spec matches:`);
      
      // Get details of possible matches
      const specs = await client.query(`
        SELECT 
          id,
          variant,
          year_invariant,
          original_year_string,
          specifications->>'Engine' as engine,
          specifications->>'Power' as power,
          specifications->>'Torque' as torque,
          specifications->>'Weight' as weight
        FROM motorcycle_specs_cleaned
        WHERE id = ANY($1)
        ORDER BY variant NULLS FIRST
      `, [motorcycle.spec_ids]);
      
      // Display options
      specs.rows.forEach((spec, index) => {
        console.log(`\n${index + 1}. ${spec.variant || '[No variant]'} ${spec.year_invariant ? '(all years)' : ''}`);
        console.log(`   Original year data: ${spec.original_year_string || 'N/A'}`);
        if (spec.engine) console.log(`   Engine: ${spec.engine}`);
        if (spec.power) console.log(`   Power: ${spec.power}`);
        if (spec.torque) console.log(`   Torque: ${spec.torque}`);
        if (spec.weight) console.log(`   Weight: ${spec.weight}`);
      });
      
      // Ask for user choice
      const choice = await askQuestion('\nEnter number (1-' + specs.rows.length + '), "s" to skip, "q" to quit: ');
      
      if (choice.toLowerCase() === 'q') {
        console.log('\nQuitting review process...');
        break;
      } else if (choice.toLowerCase() === 's') {
        await client.query(`
          INSERT INTO motorcycle_spec_review (motorcycle_id, review_status)
          VALUES ($1, 'skipped')
          ON CONFLICT (motorcycle_id) DO UPDATE SET review_status = 'skipped'
        `, [motorcycle.motorcycle_id]);
        skipped++;
        console.log('✓ Skipped');
      } else {
        const choiceNum = parseInt(choice);
        if (choiceNum >= 1 && choiceNum <= specs.rows.length) {
          const selectedSpec = specs.rows[choiceNum - 1];
          
          // Ask for confirmation
          const notes = await askQuestion('Any notes about this match? (press Enter to skip): ');
          
          // Update the motorcycle
          await client.query(`
            UPDATE motorcycles
            SET cleaned_spec_id = $1, updated_at = NOW()
            WHERE id = $2
          `, [selectedSpec.id, motorcycle.motorcycle_id]);
          
          // Record the review
          await client.query(`
            INSERT INTO motorcycle_spec_review (motorcycle_id, spec_id, review_status, reviewer_notes)
            VALUES ($1, $2, 'approved', $3)
            ON CONFLICT (motorcycle_id) DO UPDATE 
            SET spec_id = $2, review_status = 'approved', reviewer_notes = $3
          `, [motorcycle.motorcycle_id, selectedSpec.id, notes || null]);
          
          linked++;
          console.log('✓ Linked to spec #' + choiceNum);
        } else {
          console.log('Invalid choice, skipping...');
          skipped++;
        }
      }
      
      reviewed++;
      
      // Show progress
      if (reviewed % 10 === 0) {
        console.log(`\nProgress: ${reviewed} reviewed, ${linked} linked, ${skipped} skipped`);
        const continueReview = await askQuestion('Continue? (y/n): ');
        if (continueReview.toLowerCase() !== 'y') break;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\nReview complete!');
    console.log(`Reviewed: ${reviewed}`);
    console.log(`Linked: ${linked}`);
    console.log(`Skipped: ${skipped}`);
    
    // Phase 3: Handle special cases
    console.log('\n\nPhase 3: Special cases\n');
    
    // Check for motorcycles with packages that might match variants
    const packageMatches = await client.query(`
      SELECT 
        m.id,
        m.year,
        m.make,
        m.model,
        m.package,
        COUNT(DISTINCT msc.id) as variant_count,
        ARRAY_AGG(DISTINCT msc.variant ORDER BY msc.variant) as variants
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
      LIMIT 20
    `);
    
    if (packageMatches.rows.length > 0) {
      console.log(`Found ${packageMatches.rows.length} motorcycles with packages that might match variants.\n`);
      
      const reviewPackages = await askQuestion('Review package-to-variant matches? (y/n): ');
      if (reviewPackages.toLowerCase() === 'y') {
        for (const moto of packageMatches.rows) {
          console.log(`\n${moto.year} ${moto.make} ${moto.model}`);
          console.log(`Package: "${moto.package}"`);
          console.log(`Available variants: ${moto.variants.join(', ')}`);
          
          const matchPackage = await askQuestion('Does the package match any variant? (y/n/q): ');
          if (matchPackage.toLowerCase() === 'q') break;
          
          if (matchPackage.toLowerCase() === 'y') {
            // Show variants with numbers
            console.log('\nSelect variant:');
            moto.variants.forEach((v, i) => {
              console.log(`${i + 1}. ${v}`);
            });
            
            const variantChoice = await askQuestion('Enter number: ');
            const choiceNum = parseInt(variantChoice);
            
            if (choiceNum >= 1 && choiceNum <= moto.variants.length) {
              const selectedVariant = moto.variants[choiceNum - 1];
              
              // Find and link the spec
              const spec = await client.query(`
                SELECT id FROM motorcycle_specs_cleaned
                WHERE 
                  LOWER(manufacturer) = LOWER($1) AND
                  LOWER(model) = LOWER($2) AND
                  year = $3 AND
                  variant = $4
                LIMIT 1
              `, [moto.make, moto.model, moto.year, selectedVariant]);
              
              if (spec.rows.length > 0) {
                await client.query(`
                  UPDATE motorcycles
                  SET cleaned_spec_id = $1, updated_at = NOW()
                  WHERE id = $2
                `, [spec.rows[0].id, moto.id]);
                
                console.log('✓ Linked to variant: ' + selectedVariant);
              }
            }
          }
        }
      }
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
    console.log('\n\n=== Final Statistics ===');
    console.log(`Total motorcycles: ${stats.total}`);
    console.log(`Linked to specs: ${stats.linked} (${stats.percentage}%)`);
    console.log(`Still unlinked: ${stats.unlinked}`);
    
  } catch (error) {
    console.error('Error:', error);
    rl.close();
    await client.end();
    throw error;
  } finally {
    // Don't close here, let the process handler do it
  }
}

// Run the interactive linking
interactiveLinkMotorcycles().catch(console.error).finally(() => {
  process.exit(0);
});