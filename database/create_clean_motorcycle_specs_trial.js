import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

// Copy the parsing functions
function parseYearRange(yearStr) {
  yearStr = yearStr.trim();
  
  if (/^\d{4}$/.test(yearStr)) {
    return [parseInt(yearStr)];
  }
  
  const openMatch = yearStr.match(/^(\d{4})\s*-\s*$/);
  if (openMatch) {
    const startYear = parseInt(openMatch[1]);
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = startYear; y <= Math.min(currentYear + 2, startYear + 10); y++) {
      years.push(y);
    }
    return years;
  }
  
  const rangeMatch = yearStr.match(/(\d{4})\s*[-–]\s*(\d{2,4})/);
  if (rangeMatch) {
    const startYear = parseInt(rangeMatch[1]);
    let endYear = parseInt(rangeMatch[2]);
    
    if (rangeMatch[2].length === 2) {
      const startCentury = Math.floor(startYear / 100) * 100;
      endYear = startCentury + endYear;
      if (endYear < startYear) {
        endYear += 100;
      }
    }
    
    const years = [];
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }
    return years;
  }
  
  const yearWithNoteMatch = yearStr.match(/^(\d{4})\s*\(/);
  if (yearWithNoteMatch) {
    return [parseInt(yearWithNoteMatch[1])];
  }
  
  const anyYearMatch = yearStr.match(/(\d{4})/);
  if (anyYearMatch) {
    return [parseInt(anyYearMatch[1])];
  }
  
  return null;
}

function parseComplexYearString(yearValue) {
  if (!yearValue.includes(':')) {
    const years = parseYearRange(yearValue);
    return years ? { _default: years } : null;
  }
  
  const result = {};
  
  yearValue = yearValue.replace(/(\d+)\s*\n\s*-\s*(\d+)/g, '$1 - $2');
  yearValue = yearValue.replace(/:\s*\n\s*(\d)/g, ': $1');
  
  const lines = yearValue.split(/[\n\r\t]+/).map(line => line.trim()).filter(line => line);
  
  for (const line of lines) {
    const variantMatch = line.match(/^([^:]+):\s*(.+)$/);
    
    if (variantMatch) {
      const variantsPart = variantMatch[1].trim();
      const yearsPart = variantMatch[2].trim();
      
      const years = parseYearRange(yearsPart);
      
      if (years) {
        const variants = variantsPart.split(/[,&]/).map(v => v.trim());
        
        for (let variant of variants) {
          if (variant) {
            result[variant.trim()] = years;
          }
        }
      }
    } else {
      const years = parseYearRange(line);
      if (years && !result._default) {
        result._default = years;
      }
    }
  }
  
  return Object.keys(result).length > 0 ? result : null;
}

async function trialRun() {
  const client = new Client(config);
  const TRIAL_LIMIT = 100; // Process only 100 records
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Create trial table
    console.log('Creating trial table for cleaned motorcycle specs...');
    
    await client.query(`
      DROP TABLE IF EXISTS motorcycle_specs_cleaned_trial CASCADE;
      
      CREATE TABLE motorcycle_specs_cleaned_trial (
        id SERIAL PRIMARY KEY,
        original_spec_id INTEGER NOT NULL,
        manufacturer VARCHAR(100) NOT NULL,
        model VARCHAR(500) NOT NULL,
        variant TEXT,
        year INTEGER NOT NULL,
        title TEXT,
        description TEXT,
        content TEXT,
        url VARCHAR(1000),
        scraped_at TIMESTAMP WITH TIME ZONE,
        specifications JSONB NOT NULL DEFAULT '{}',
        year_invariant BOOLEAN DEFAULT FALSE,
        original_year_string TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX idx_msc_trial_manufacturer_model_variant_year 
      ON motorcycle_specs_cleaned_trial(manufacturer, model, variant, year);
      
      CREATE INDEX idx_msc_trial_original_spec_id 
      ON motorcycle_specs_cleaned_trial(original_spec_id);
      
      CREATE INDEX idx_msc_trial_year 
      ON motorcycle_specs_cleaned_trial(year);
      
      CREATE INDEX idx_msc_trial_year_invariant 
      ON motorcycle_specs_cleaned_trial(year_invariant);
    `);
    
    console.log('✓ Trial table and indexes created\n');
    
    // Get a diverse sample of specs
    const originalSpecs = await client.query(`
      WITH diverse_sample AS (
        -- Get some of each pattern type
        (SELECT * FROM motorcycle_specs 
         WHERE specifications->>'Year' ~ '^\\d{4}$' 
         AND specifications IS NOT NULL
         LIMIT 20)
        UNION ALL
        (SELECT * FROM motorcycle_specs 
         WHERE specifications->>'Year' ~ '\\d{4}\\s*-\\s*\\d{2,4}' 
         AND specifications->>'Year' NOT LIKE '%:%'
         AND specifications IS NOT NULL
         LIMIT 30)
        UNION ALL
        (SELECT * FROM motorcycle_specs 
         WHERE specifications->>'Year' ~ '\\d{4}\\s*-\\s*$' 
         AND specifications IS NOT NULL
         LIMIT 20)
        UNION ALL
        (SELECT * FROM motorcycle_specs 
         WHERE specifications->>'Year' LIKE '%:%' 
         AND specifications IS NOT NULL
         LIMIT 30)
      )
      SELECT 
        id,
        manufacturer,
        model,
        year,
        title,
        description,
        content,
        url,
        scraped_at,
        specifications,
        specifications->>'Year' as year_string
      FROM diverse_sample
      LIMIT ${TRIAL_LIMIT}
    `);
    
    console.log(`Processing ${originalSpecs.rows.length} specs for trial run...\n`);
    
    let processed = 0;
    let created = 0;
    let failed = 0;
    let skipped = 0;
    const patternStats = {
      simple: 0,
      range: 0,
      openEnded: 0,
      variant: 0,
      noYear: 0
    };
    
    for (const spec of originalSpecs.rows) {
      try {
        const yearString = spec.year_string;
        
        if (!yearString) {
          patternStats.noYear++;
          if (!spec.year) {
            console.log(`Skipping ${spec.manufacturer} ${spec.model} - no year data`);
            skipped++;
            continue;
          }
          
          await client.query(`
            INSERT INTO motorcycle_specs_cleaned_trial (
              original_spec_id, manufacturer, model, variant, year,
              title, description, content, url, scraped_at,
              specifications, year_invariant, original_year_string
            ) VALUES (
              $1, $2, $3, NULL, $4,
              $5, $6, $7, $8, $9,
              $10, FALSE, NULL
            )
          `, [
            spec.id, spec.manufacturer, spec.model, spec.year,
            spec.title, spec.description, spec.content, spec.url, spec.scraped_at,
            spec.specifications
          ]);
          created++;
          continue;
        }
        
        // Categorize pattern
        if (yearString.includes(':')) {
          patternStats.variant++;
        } else if (yearString.match(/^\d{4}$/)) {
          patternStats.simple++;
        } else if (yearString.match(/\d{4}\s*-\s*$/)) {
          patternStats.openEnded++;
        } else if (yearString.match(/\d{4}\s*-\s*\d{2,4}/)) {
          patternStats.range++;
        }
        
        const parsed = parseComplexYearString(yearString);
        
        if (parsed) {
          // Track if we've seen variant examples
          const hasVariants = Object.keys(parsed).length > 1 || !parsed._default;
          
          // Create entries for each variant/year combination
          for (const [variant, years] of Object.entries(parsed)) {
            const variantName = variant === '_default' ? null : variant;
            const isYearInvariant = variantName && variantName.includes('(all)');
            
            for (const year of years) {
              // Update specifications JSONB to have the correct year
              const updatedSpecs = spec.specifications ? {
                ...spec.specifications,
                Year: year.toString(),
                Original_Year: yearString
              } : { Year: year.toString(), Original_Year: yearString };
              
              await client.query(`
                INSERT INTO motorcycle_specs_cleaned_trial (
                  original_spec_id, manufacturer, model, variant, year,
                  title, description, content, url, scraped_at,
                  specifications, year_invariant, original_year_string
                ) VALUES (
                  $1, $2, $3, $4, $5,
                  $6, $7, $8, $9, $10,
                  $11, $12, $13
                )
              `, [
                spec.id, spec.manufacturer, spec.model, variantName, year,
                spec.title, spec.description, spec.content, spec.url, spec.scraped_at,
                updatedSpecs, isYearInvariant, yearString
              ]);
              created++;
            }
          }
        } else {
          failed++;
          console.log(`Failed to parse: ${spec.manufacturer} ${spec.model} - "${yearString}"`);
        }
        
        processed++;
        
      } catch (error) {
        failed++;
        console.error(`Error processing spec ${spec.id}:`, error.message);
      }
    }
    
    console.log('\n✅ Trial run completed!');
    console.log(`   Original specs processed: ${processed}`);
    console.log(`   New entries created: ${created}`);
    console.log(`   Skipped (no year): ${skipped}`);
    console.log(`   Failed to parse: ${failed}`);
    
    console.log('\nPattern distribution:');
    console.log(`   Simple years: ${patternStats.simple}`);
    console.log(`   Year ranges: ${patternStats.range}`);
    console.log(`   Open-ended: ${patternStats.openEnded}`);
    console.log(`   With variants: ${patternStats.variant}`);
    console.log(`   No year in JSONB: ${patternStats.noYear}`);
    
    // Show statistics
    const stats = await client.query(`
      SELECT 
        COUNT(DISTINCT original_spec_id) as unique_specs,
        COUNT(*) as total_entries,
        COUNT(DISTINCT manufacturer) as manufacturers,
        COUNT(CASE WHEN variant IS NOT NULL THEN 1 END) as variant_entries,
        COUNT(CASE WHEN year_invariant = true THEN 1 END) as year_invariant_entries,
        MIN(year) as min_year,
        MAX(year) as max_year,
        ROUND(COUNT(*)::numeric / COUNT(DISTINCT original_spec_id)::numeric, 2) as avg_entries_per_spec
      FROM motorcycle_specs_cleaned_trial
    `);
    
    console.log('\nTrial table statistics:');
    const s = stats.rows[0];
    console.log(`   Unique original specs: ${s.unique_specs}`);
    console.log(`   Total entries: ${s.total_entries}`);
    console.log(`   Average entries per spec: ${s.avg_entries_per_spec}`);
    console.log(`   Manufacturers: ${s.manufacturers}`);
    console.log(`   Entries with variants: ${s.variant_entries}`);
    console.log(`   Year-invariant entries: ${s.year_invariant_entries}`);
    console.log(`   Year range: ${s.min_year} - ${s.max_year}`);
    
    // Show some complex examples
    const complexExamples = await client.query(`
      SELECT 
        manufacturer,
        model,
        variant,
        COUNT(*) as year_count,
        MIN(year) as min_year,
        MAX(year) as max_year,
        STRING_AGG(DISTINCT variant, ', ') as variants,
        MAX(original_year_string) as original_year_string
      FROM motorcycle_specs_cleaned_trial
      WHERE original_spec_id IN (
        SELECT original_spec_id 
        FROM motorcycle_specs_cleaned_trial 
        GROUP BY original_spec_id 
        HAVING COUNT(*) > 5
      )
      GROUP BY manufacturer, model, variant
      ORDER BY year_count DESC
      LIMIT 10
    `);
    
    console.log('\nComplex specs with multiple years/variants:');
    console.log('Manufacturer | Model | Variant | Years | Range');
    console.log('-'.repeat(80));
    complexExamples.rows.forEach(row => {
      console.log(`${row.manufacturer} | ${row.model} | ${row.variant || 'N/A'} | ${row.year_count} | ${row.min_year}-${row.max_year}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the trial
trialRun();