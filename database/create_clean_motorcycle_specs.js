import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

/**
 * Parse a year string/range into an array of years
 */
function parseYearRange(yearStr) {
  yearStr = yearStr.trim();
  
  // Handle single year
  if (/^\d{4}$/.test(yearStr)) {
    return [parseInt(yearStr)];
  }
  
  // Handle open-ended range (e.g., "2011 -")
  const openMatch = yearStr.match(/^(\d{4})\s*-\s*$/);
  if (openMatch) {
    const startYear = parseInt(openMatch[1]);
    const currentYear = new Date().getFullYear();
    const years = [];
    // Limit to reasonable future (current year + 2)
    for (let y = startYear; y <= Math.min(currentYear + 2, startYear + 10); y++) {
      years.push(y);
    }
    return years;
  }
  
  // Handle year range (e.g., "1948 - 63" or "2002 - 2003")
  const rangeMatch = yearStr.match(/(\d{4})\s*[-–]\s*(\d{2,4})/);
  if (rangeMatch) {
    const startYear = parseInt(rangeMatch[1]);
    let endYear = parseInt(rangeMatch[2]);
    
    // If end year is 2 digits, infer century
    if (rangeMatch[2].length === 2) {
      const startCentury = Math.floor(startYear / 100) * 100;
      endYear = startCentury + endYear;
      
      // Handle century wrap (e.g., 1998 - 02 means 1998-2002)
      if (endYear < startYear) {
        endYear += 100;
      }
    }
    
    // Generate array of years
    const years = [];
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }
    return years;
  }
  
  // Handle years with production notes (e.g., "1987  (production 153)")
  const yearWithNoteMatch = yearStr.match(/^(\d{4})\s*\(/);
  if (yearWithNoteMatch) {
    return [parseInt(yearWithNoteMatch[1])];
  }
  
  // Try to extract any 4-digit year
  const anyYearMatch = yearStr.match(/(\d{4})/);
  if (anyYearMatch) {
    return [parseInt(anyYearMatch[1])];
  }
  
  return null;
}

/**
 * Parse complex year string that may contain variant information
 */
function parseComplexYearString(yearValue) {
  // Check if it contains variant information (colon pattern)
  if (!yearValue.includes(':')) {
    // Simple case - just parse the year(s)
    const years = parseYearRange(yearValue);
    return years ? { _default: years } : null;
  }
  
  // Complex case with variants
  const result = {};
  
  // First, fix line continuations (years split across lines)
  yearValue = yearValue.replace(/(\d+)\s*\n\s*-\s*(\d+)/g, '$1 - $2');
  yearValue = yearValue.replace(/:\s*\n\s*(\d)/g, ': $1');
  
  // Split by newlines and tabs
  const lines = yearValue.split(/[\n\r\t]+/).map(line => line.trim()).filter(line => line);
  
  for (const line of lines) {
    // Try to match variant pattern: "D1, BD1: 1948 - 63"
    const variantMatch = line.match(/^([^:]+):\s*(.+)$/);
    
    if (variantMatch) {
      const variantsPart = variantMatch[1].trim();
      const yearsPart = variantMatch[2].trim();
      
      // Parse the years
      const years = parseYearRange(yearsPart);
      
      if (years) {
        // Handle multiple variants separated by comma or &
        const variants = variantsPart.split(/[,&]/).map(v => v.trim());
        
        // Assign years to each variant
        for (let variant of variants) {
          if (variant) {
            // Keep the full variant name including (all) or other suffixes
            result[variant.trim()] = years;
          }
        }
      }
    } else {
      // Line doesn't match variant pattern, try to parse as simple year
      const years = parseYearRange(line);
      if (years && !result._default) {
        result._default = years;
      }
    }
  }
  
  return Object.keys(result).length > 0 ? result : null;
}

async function createCleanMotorcycleSpecs() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Create new table for cleaned specs
    console.log('Creating new table for cleaned motorcycle specs...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS motorcycle_specs_cleaned (
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
      CREATE INDEX IF NOT EXISTS idx_msc_manufacturer_model_variant_year 
      ON motorcycle_specs_cleaned(manufacturer, model, variant, year);
      
      CREATE INDEX IF NOT EXISTS idx_msc_original_spec_id 
      ON motorcycle_specs_cleaned(original_spec_id);
      
      CREATE INDEX IF NOT EXISTS idx_msc_year 
      ON motorcycle_specs_cleaned(year);
      
      CREATE INDEX IF NOT EXISTS idx_msc_year_invariant 
      ON motorcycle_specs_cleaned(year_invariant);
    `);
    
    console.log('✓ Table and indexes created\n');
    
    // Read all specs from original table
    const originalSpecs = await client.query(`
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
      FROM motorcycle_specs
      WHERE specifications IS NOT NULL
    `);
    
    console.log(`Processing ${originalSpecs.rows.length} specs from original table...\n`);
    
    let processed = 0;
    let created = 0;
    let failed = 0;
    const examples = [];
    
    for (const spec of originalSpecs.rows) {
      try {
        const yearString = spec.year_string;
        if (!yearString) {
          // If no year in JSONB, use the year column if available
          if (!spec.year) {
            console.log(`Skipping ${spec.manufacturer} ${spec.model} - no year data`);
            continue;
          }
          
          await client.query(`
            INSERT INTO motorcycle_specs_cleaned (
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
        
        if (parsed) {
          // Track if we've seen variant examples
          const hasVariants = Object.keys(parsed).length > 1 || !parsed._default;
          if (hasVariants && examples.length < 5) {
            examples.push({
              manufacturer: spec.manufacturer,
              model: spec.model,
              original: yearString,
              parsed: parsed
            });
          }
          
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
                INSERT INTO motorcycle_specs_cleaned (
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
        if (processed % 100 === 0) {
          console.log(`Progress: ${processed}/${originalSpecs.rows.length} (${created} entries created)`);
        }
        
      } catch (error) {
        failed++;
        console.error(`Error processing spec ${spec.id}:`, error.message);
      }
    }
    
    console.log('\n✅ Processing completed!');
    console.log(`   Original specs processed: ${processed}`);
    console.log(`   New entries created: ${created}`);
    console.log(`   Failed to parse: ${failed}`);
    
    // Show statistics
    const stats = await client.query(`
      SELECT 
        COUNT(DISTINCT original_spec_id) as unique_specs,
        COUNT(*) as total_entries,
        COUNT(DISTINCT manufacturer) as manufacturers,
        COUNT(CASE WHEN variant IS NOT NULL THEN 1 END) as variant_entries,
        COUNT(CASE WHEN year_invariant = true THEN 1 END) as year_invariant_entries,
        MIN(year) as min_year,
        MAX(year) as max_year
      FROM motorcycle_specs_cleaned
    `);
    
    console.log('\nNew table statistics:');
    const s = stats.rows[0];
    console.log(`   Unique original specs: ${s.unique_specs}`);
    console.log(`   Total entries: ${s.total_entries}`);
    console.log(`   Manufacturers: ${s.manufacturers}`);
    console.log(`   Entries with variants: ${s.variant_entries}`);
    console.log(`   Year-invariant entries: ${s.year_invariant_entries}`);
    console.log(`   Year range: ${s.min_year} - ${s.max_year}`);
    
    // Show examples
    if (examples.length > 0) {
      console.log('\nExample variant specs parsed:');
      examples.forEach(ex => {
        console.log(`\n${ex.manufacturer} ${ex.model}:`);
        console.log(`Original: "${ex.original}"`);
        console.log(`Parsed variants:`);
        Object.entries(ex.parsed).forEach(([variant, years]) => {
          console.log(`  ${variant}: ${years.length} years`);
        });
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createCleanMotorcycleSpecs();
}