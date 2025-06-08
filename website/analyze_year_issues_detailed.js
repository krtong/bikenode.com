const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: ''
});

async function analyzeDetailedYearIssues() {
  console.log('🔍 DETAILED YEAR DATA ISSUES ANALYSIS');
  console.log('=====================================\n');

  try {
    // 1. Check for year data stored as strings in JSONB
    console.log('1. CHECKING FOR STRING YEAR DATA IN JSONB');
    console.log('-----------------------------------------');
    
    const jsonYearFields = await pool.query(`
      SELECT DISTINCT jsonb_object_keys(specifications) as key
      FROM motorcycle_specs
      WHERE specifications IS NOT NULL
    `);
    
    const yearRelatedKeys = jsonYearFields.rows
      .filter(row => row.key.toLowerCase().includes('year'))
      .map(row => row.key);
    
    console.log('Year-related keys found in JSONB:', yearRelatedKeys);
    
    // Check each year-related key for patterns
    for (const key of yearRelatedKeys) {
      const samples = await pool.query(`
        SELECT 
          id,
          manufacturer,
          model,
          specifications->>$1 as year_value
        FROM motorcycle_specs
        WHERE specifications->>$1 IS NOT NULL
        LIMIT 5
      `, [key]);
      
      if (samples.rowCount > 0) {
        console.log(`\nSamples for "${key}":`);
        samples.rows.forEach(row => {
          console.log(`  Spec ${row.id}: ${row.manufacturer} ${row.model}`);
          console.log(`    Value: "${row.year_value}"`);
          
          // Check if it's a year range
          if (row.year_value.includes('-') && /\d{4}/.test(row.year_value)) {
            console.log(`    ⚠️  Contains year range!`);
          }
        });
      }
    }

    // 2. Look for year ranges in any JSONB field
    console.log('\n\n2. YEAR RANGES IN JSONB FIELDS');
    console.log('-------------------------------');
    
    const yearRangeSpecs = await pool.query(`
      SELECT 
        id,
        manufacturer,
        model,
        specifications
      FROM motorcycle_specs
      WHERE specifications::text ~ '\\d{4}\\s*[-–—]\\s*\\d{4}'
      LIMIT 10
    `);
    
    console.log(`Found ${yearRangeSpecs.rowCount} specs with year ranges in JSONB\n`);
    
    const yearRangePattern = /(\d{4})\s*[-–—]\s*(\d{4})/g;
    yearRangeSpecs.rows.forEach(row => {
      const specText = JSON.stringify(row.specifications);
      const matches = [...specText.matchAll(yearRangePattern)];
      
      if (matches.length > 0) {
        console.log(`Spec ${row.id}: ${row.manufacturer} ${row.model}`);
        matches.forEach(match => {
          const [fullMatch, startYear, endYear] = match;
          console.log(`  Year range found: ${startYear}-${endYear}`);
          
          // Find which field contains this range
          for (const [key, value] of Object.entries(row.specifications)) {
            if (value && value.toString().includes(fullMatch)) {
              console.log(`    In field: "${key}" = "${value}"`);
            }
          }
        });
        console.log();
      }
    });

    // 3. Check for mismatches between table year and spec year
    console.log('\n3. YEAR MISMATCHES BETWEEN TABLES');
    console.log('---------------------------------');
    
    const mismatches = await pool.query(`
      SELECT 
        m.id as motorcycle_id,
        m.year as motorcycle_year,
        m.make,
        m.model,
        ms.id as spec_id,
        ms.year as spec_year,
        ms.specifications->>'year' as json_year,
        ms.specifications->>'model_year' as model_year
      FROM motorcycles m
      JOIN motorcycle_specs ms ON m.spec_id = ms.id
      WHERE m.year IS NOT NULL
      AND (
        (ms.year IS NOT NULL AND ms.year != m.year) OR
        (ms.specifications->>'year' IS NOT NULL AND ms.specifications->>'year' != m.year::text) OR
        (ms.specifications->>'model_year' IS NOT NULL AND ms.specifications->>'model_year' != m.year::text)
      )
      LIMIT 10
    `);
    
    if (mismatches.rowCount > 0) {
      console.log('Found year mismatches:');
      mismatches.rows.forEach(row => {
        console.log(`\n${row.make} ${row.model}`);
        console.log(`  Motorcycle table year: ${row.motorcycle_year}`);
        console.log(`  Spec table year: ${row.spec_year || 'NULL'}`);
        console.log(`  JSONB year: ${row.json_year || 'NULL'}`);
        console.log(`  JSONB model_year: ${row.model_year || 'NULL'}`);
      });
    } else {
      console.log('No year mismatches found in the sample.');
    }

    // 4. Analyze the "year" column in motorcycle_specs table
    console.log('\n\n4. MOTORCYCLE_SPECS YEAR COLUMN ANALYSIS');
    console.log('----------------------------------------');
    
    const specYearStats = await pool.query(`
      SELECT 
        COUNT(*) as total_specs,
        COUNT(year) as specs_with_year,
        MIN(year) as min_year,
        MAX(year) as max_year
      FROM motorcycle_specs
    `);
    
    const stats = specYearStats.rows[0];
    console.log(`Total specs: ${stats.total_specs}`);
    console.log(`Specs with year column filled: ${stats.specs_with_year}`);
    console.log(`Year range in specs table: ${stats.min_year || 'N/A'} to ${stats.max_year || 'N/A'}`);

    // 5. Find specs that are incorrectly shared across too many years
    console.log('\n\n5. OVER-SHARED SPECIFICATIONS');
    console.log('-----------------------------');
    
    const overShared = await pool.query(`
      WITH spec_usage AS (
        SELECT 
          ms.id,
          ms.manufacturer,
          ms.model,
          COUNT(DISTINCT m.year) as year_count,
          MIN(m.year) as min_year,
          MAX(m.year) as max_year,
          MAX(m.year) - MIN(m.year) as year_span
        FROM motorcycle_specs ms
        JOIN motorcycles m ON m.spec_id = ms.id
        WHERE m.year IS NOT NULL
        GROUP BY ms.id, ms.manufacturer, ms.model
      )
      SELECT * FROM spec_usage
      WHERE year_span > 20
      ORDER BY year_span DESC
      LIMIT 10
    `);
    
    console.log('Specs spanning more than 20 years:');
    overShared.rows.forEach(row => {
      console.log(`\nSpec ${row.id}: ${row.manufacturer} ${row.model}`);
      console.log(`  Spans ${row.year_span} years: ${row.min_year}-${row.max_year}`);
      console.log(`  Used for ${row.year_count} distinct years`);
      console.log(`  ⚠️  This likely needs year-specific variants`);
    });

    // 6. Summary of issues
    console.log('\n\n📊 SUMMARY OF YEAR DATA ISSUES:');
    console.log('==============================');
    
    const issueCount = await pool.query(`
      SELECT 
        'Motorcycles without specs' as issue,
        COUNT(*) as count
      FROM motorcycles
      WHERE spec_id IS NULL
      UNION ALL
      SELECT 
        'Specs with year ranges in JSONB' as issue,
        COUNT(*) as count
      FROM motorcycle_specs
      WHERE specifications::text ~ '\\d{4}\\s*[-–—]\\s*\\d{4}'
      UNION ALL
      SELECT 
        'Specs shared across 10+ years' as issue,
        COUNT(DISTINCT spec_id) as count
      FROM (
        SELECT spec_id, COUNT(DISTINCT year) as year_count
        FROM motorcycles
        WHERE spec_id IS NOT NULL
        GROUP BY spec_id
        HAVING COUNT(DISTINCT year) > 10
      ) t
    `);
    
    issueCount.rows.forEach(row => {
      console.log(`\n${row.issue}: ${row.count}`);
    });

    console.log('\n\n🔧 RECOMMENDED FIXES:');
    console.log('====================');
    console.log('1. Parse year ranges in JSONB and create separate entries for each year');
    console.log('2. Review specs shared across many years and create year-specific variants');
    console.log('3. Standardize year storage - use the integer year column consistently');
    console.log('4. Add validation to prevent single specs from being linked to too many years');
    console.log('5. Extract year data from model names where appropriate');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

analyzeDetailedYearIssues();