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

async function cleanMotorcycleYears() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Create backup first
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    console.log(`Creating backup with timestamp: ${timestamp}`);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS motorcycle_specs_backup_${timestamp} AS 
      SELECT * FROM motorcycle_specs
    `);
    
    console.log('✓ Backup created\n');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Add new columns for structured year data
    console.log('Adding new columns for year data...');
    
    await client.query(`
      ALTER TABLE motorcycle_specs 
      ADD COLUMN IF NOT EXISTS year_data JSONB,
      ADD COLUMN IF NOT EXISTS year_min INTEGER,
      ADD COLUMN IF NOT EXISTS year_max INTEGER,
      ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT FALSE
    `);
    
    // Process all specs with year data
    const specs = await client.query(`
      SELECT 
        id,
        manufacturer,
        model,
        year,
        specifications->>'Year' as year_string
      FROM motorcycle_specs
      WHERE specifications->>'Year' IS NOT NULL
    `);
    
    console.log(`Processing ${specs.rows.length} specs with year data...\n`);
    
    let processed = 0;
    let variantSpecs = 0;
    let simpleSpecs = 0;
    let failed = 0;
    
    for (const spec of specs.rows) {
      try {
        const parsed = parseComplexYearString(spec.year_string);
        
        if (parsed) {
          const hasVariants = Object.keys(parsed).length > 1 || !parsed._default;
          let minYear = Infinity;
          let maxYear = -Infinity;
          
          // Find min/max years across all variants
          for (const variant in parsed) {
            const years = parsed[variant];
            if (Array.isArray(years)) {
              minYear = Math.min(minYear, Math.min(...years));
              maxYear = Math.max(maxYear, Math.max(...years));
            }
          }
          
          // Update the spec with structured data
          await client.query(`
            UPDATE motorcycle_specs
            SET 
              year_data = $1,
              year_min = $2,
              year_max = $3,
              has_variants = $4,
              year = $5,
              updated_at = NOW()
            WHERE id = $6
          `, [
            JSON.stringify(parsed),
            minYear === Infinity ? null : minYear,
            maxYear === -Infinity ? null : maxYear,
            hasVariants,
            minYear === Infinity ? spec.year : minYear,
            spec.id
          ]);
          
          if (hasVariants) {
            variantSpecs++;
          } else {
            simpleSpecs++;
          }
          processed++;
          
          if (processed % 100 === 0) {
            console.log(`Progress: ${processed}/${specs.rows.length}`);
          }
        } else {
          failed++;
          console.log(`Failed to parse: ${spec.manufacturer} ${spec.model} - "${spec.year_string}"`);
        }
      } catch (error) {
        failed++;
        console.error(`Error processing ${spec.id}:`, error.message);
      }
    }
    
    // Create indexes for efficient querying
    console.log('\nCreating indexes...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_motorcycle_specs_year_min ON motorcycle_specs(year_min);
      CREATE INDEX IF NOT EXISTS idx_motorcycle_specs_year_max ON motorcycle_specs(year_max);
      CREATE INDEX IF NOT EXISTS idx_motorcycle_specs_has_variants ON motorcycle_specs(has_variants);
      CREATE INDEX IF NOT EXISTS idx_motorcycle_specs_year_data ON motorcycle_specs USING gin(year_data);
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n✅ Cleanup completed successfully!');
    console.log(`   Total processed: ${processed}`);
    console.log(`   Simple specs: ${simpleSpecs}`);
    console.log(`   Variant specs: ${variantSpecs}`);
    console.log(`   Failed to parse: ${failed}`);
    
    // Show some examples
    const examples = await client.query(`
      SELECT 
        manufacturer,
        model,
        specifications->>'Year' as original_year,
        year_data
      FROM motorcycle_specs
      WHERE has_variants = true
      LIMIT 5
    `);
    
    console.log('\nExample variant specs:');
    examples.rows.forEach(row => {
      console.log(`\n${row.manufacturer} ${row.model}:`);
      console.log(`Original: "${row.original_year}"`);
      console.log(`Parsed: ${JSON.stringify(row.year_data, null, 2)}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanMotorcycleYears();
}