import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

// Copy the parsing functions from the main script
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

async function testCleanMotorcycleSpecs() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Create a test table
    console.log('Creating test table...');
    
    await client.query(`
      DROP TABLE IF EXISTS motorcycle_specs_cleaned_test CASCADE;
      
      CREATE TABLE motorcycle_specs_cleaned_test (
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
    
    console.log('✓ Test table created\n');
    
    // Get a sample of different year patterns
    const testSamples = await client.query(`
      WITH samples AS (
        -- Simple years
        (SELECT * FROM motorcycle_specs 
         WHERE specifications->>'Year' ~ '^\\d{4}$' 
         LIMIT 2)
        UNION ALL
        -- Year ranges
        (SELECT * FROM motorcycle_specs 
         WHERE specifications->>'Year' ~ '\\d{4}\\s*-\\s*\\d{2,4}' 
         AND specifications->>'Year' NOT LIKE '%:%'
         LIMIT 2)
        UNION ALL
        -- Open-ended years
        (SELECT * FROM motorcycle_specs 
         WHERE specifications->>'Year' ~ '\\d{4}\\s*-\\s*$' 
         LIMIT 2)
        UNION ALL
        -- Complex variants (including BSA Bantam if available)
        (SELECT * FROM motorcycle_specs 
         WHERE specifications->>'Year' LIKE '%:%' 
         LIMIT 3)
        UNION ALL
        -- No year in JSONB
        (SELECT * FROM motorcycle_specs 
         WHERE specifications->>'Year' IS NULL 
         LIMIT 1)
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
      FROM samples
    `);
    
    console.log(`Testing with ${testSamples.rows.length} sample specs:\n`);
    
    let created = 0;
    
    for (const spec of testSamples.rows) {
      console.log(`\nProcessing: ${spec.manufacturer} ${spec.model}`);
      console.log(`Original year string: "${spec.year_string}"`);
      
      try {
        const yearString = spec.year_string;
        
        if (!yearString) {
          console.log('  No year in JSONB, using year column:', spec.year);
          
          await client.query(`
            INSERT INTO motorcycle_specs_cleaned_test (
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
        
        const parsed = parseComplexYearString(yearString);
        console.log('  Parsed:', JSON.stringify(parsed, null, 2));
        
        if (parsed) {
          for (const [variant, years] of Object.entries(parsed)) {
            const variantName = variant === '_default' ? null : variant;
            const isYearInvariant = variantName && variantName.includes('(all)');
            
            console.log(`  Creating entries for variant "${variantName || 'default'}": ${years.length} years`);
            
            for (const year of years) {
              const updatedSpecs = spec.specifications ? {
                ...spec.specifications,
                Year: year.toString(),
                Original_Year: yearString
              } : { Year: year.toString(), Original_Year: yearString };
              
              await client.query(`
                INSERT INTO motorcycle_specs_cleaned_test (
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
          console.log('  ❌ Failed to parse year string');
        }
      } catch (error) {
        console.error('  ❌ Error:', error.message);
      }
    }
    
    console.log(`\n✅ Test completed! Created ${created} entries\n`);
    
    // Show what was created
    const results = await client.query(`
      SELECT 
        manufacturer,
        model,
        variant,
        year,
        year_invariant,
        original_year_string
      FROM motorcycle_specs_cleaned_test
      ORDER BY manufacturer, model, variant, year
    `);
    
    console.log('Created entries:');
    console.log('Manufacturer | Model | Variant | Year | Year-Invariant | Original');
    console.log('-'.repeat(80));
    results.rows.forEach(row => {
      console.log(`${row.manufacturer} | ${row.model} | ${row.variant || 'N/A'} | ${row.year} | ${row.year_invariant} | ${row.original_year_string || 'N/A'}`);
    });
    
    // Cleanup
    console.log('\nCleaning up test table...');
    await client.query('DROP TABLE motorcycle_specs_cleaned_test CASCADE');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the test
testCleanMotorcycleSpecs();