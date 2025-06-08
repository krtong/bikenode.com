import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

function parseYearRange(yearStr) {
  // Handle single year
  if (/^\d{4}$/.test(yearStr.trim())) {
    return [parseInt(yearStr.trim())];
  }
  
  // Handle open-ended range (e.g., "2011 -")
  const openMatch = yearStr.match(/^(\d{4})\s*-\s*$/);
  if (openMatch) {
    const startYear = parseInt(openMatch[1]);
    // For open-ended, we could return up to current year or flag it
    return { start: startYear, end: null, openEnded: true };
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
  
  // Handle single year at end of string (e.g., "D5: 1958")
  const singleYearMatch = yearStr.match(/(\d{4})\s*$/);
  if (singleYearMatch) {
    return [parseInt(singleYearMatch[1])];
  }
  
  return null;
}

function parseComplexYearString(yearValue) {
  // Check if it contains variant information (colon pattern)
  if (!yearValue.includes(':')) {
    // Simple case - just parse the year(s)
    return { _default: parseYearRange(yearValue) };
  }
  
  // Complex case with variants
  const result = {};
  
  // Split by newlines first
  const lines = yearValue.split(/[\n\r]+/).map(line => line.trim()).filter(line => line);
  
  for (const line of lines) {
    // Try to match variant pattern: "D1, BD1: 1948 - 63"
    const variantMatch = line.match(/^([^:]+):\s*(.+)$/);
    
    if (variantMatch) {
      const variantsPart = variantMatch[1].trim();
      const yearsPart = variantMatch[2].trim();
      
      // Parse the years
      const years = parseYearRange(yearsPart);
      
      // Split variants by comma
      const variants = variantsPart.split(',').map(v => v.trim());
      
      // Assign years to each variant
      for (const variant of variants) {
        result[variant] = years;
      }
    }
  }
  
  return result;
}

async function analyzeComplexYears() {
  const client = new Client(config);
  
  try {
    await client.connect();
    
    // Get examples of complex year patterns
    const complexPatterns = await client.query(`
      SELECT 
        manufacturer, 
        model, 
        specifications->>'Year' as year_value
      FROM motorcycle_specs
      WHERE specifications->>'Year' IS NOT NULL
      AND (
        specifications->>'Year' ~ ':' OR
        specifications->>'Year' ~ '\n' OR
        LENGTH(specifications->>'Year') > 20
      )
      LIMIT 20
    `);
    
    console.log('Complex Year Patterns Found:\n');
    
    for (const row of complexPatterns.rows) {
      console.log(`\n${row.manufacturer} ${row.model}:`);
      console.log(`Raw: "${row.year_value}"`);
      
      const parsed = parseComplexYearString(row.year_value);
      console.log('Parsed:', JSON.stringify(parsed, null, 2));
    }
    
    // Count different pattern types
    const patternStats = await client.query(`
      WITH patterns AS (
        SELECT 
          CASE
            WHEN specifications->>'Year' ~ ':' THEN 'variant_years'
            WHEN specifications->>'Year' ~ '^\d{4}$' THEN 'single_year'
            WHEN specifications->>'Year' ~ '\d{4}\s*-\s*\d{2,4}' THEN 'year_range'
            WHEN specifications->>'Year' ~ '\d{4}\s*-\s*$' THEN 'open_ended'
            WHEN specifications->>'Year' ~ '\n' THEN 'multi_line'
            ELSE 'other'
          END as pattern_type,
          COUNT(*) as count
        FROM motorcycle_specs
        WHERE specifications->>'Year' IS NOT NULL
        GROUP BY pattern_type
      )
      SELECT * FROM patterns ORDER BY count DESC
    `);
    
    console.log('\n\nPattern Statistics:');
    console.log('Type | Count');
    console.log('-'.repeat(30));
    patternStats.rows.forEach(row => {
      console.log(`${row.pattern_type} | ${row.count}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

analyzeComplexYears();