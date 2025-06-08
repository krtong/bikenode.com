const { Client } = require('pg');

// Database configuration
const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function analyzeYearData(client) {
  console.log('=== Motorcycle Years Data Analysis ===\n');
  
  // 1. Check for year ranges in JSONB
  console.log('1. Year ranges in JSONB data:');
  const yearRanges = await client.query(`
    SELECT 
      id,
      manufacturer,
      model,
      year,
      (specifications->>'Year')::text as jsonb_year,
      (specifications->>'Production')::text as production,
      (specifications->>'Production period')::text as production_period
    FROM motorcycle_specs
    WHERE 
      specifications->>'Year' ~ '[0-9]{4}.*-.*[0-9]{4}' OR
      specifications->>'Production' ~ '[0-9]{4}.*-.*[0-9]{4}' OR
      specifications->>'Production period' ~ '[0-9]{4}.*-.*[0-9]{4}'
    ORDER BY manufacturer, model
    LIMIT 10
  `);
  
  console.log(`Found ${yearRanges.rowCount} specs with year ranges. First 10:`);
  yearRanges.rows.forEach(row => {
    const yearData = row.jsonb_year || row.production || row.production_period;
    console.log(`  - ${row.manufacturer} ${row.model}: ${yearData}`);
  });
  
  // 2. Check over-shared specs
  console.log('\n2. Over-shared specifications:');
  const overshared = await client.query(`
    WITH spec_usage AS (
      SELECT 
        ms.id as spec_id,
        ms.manufacturer,
        ms.model,
        COUNT(DISTINCT m.year) as year_count,
        MIN(m.year) as min_year,
        MAX(m.year) as max_year,
        MAX(m.year) - MIN(m.year) + 1 as year_span
      FROM motorcycle_specs ms
      JOIN motorcycles m ON m.spec_id = ms.id
      GROUP BY ms.id, ms.manufacturer, ms.model
      HAVING COUNT(DISTINCT m.year) > 10
    )
    SELECT * FROM spec_usage
    ORDER BY year_count DESC
    LIMIT 10
  `);
  
  console.log(`Found ${overshared.rowCount} over-shared specs. Top 10:`);
  overshared.rows.forEach(row => {
    console.log(`  - ${row.manufacturer} ${row.model}: ${row.year_count} years (${row.min_year}-${row.max_year})`);
  });
  
  // 3. Check year mismatches
  console.log('\n3. Year mismatches between tables:');
  const mismatches = await client.query(`
    SELECT 
      COUNT(*) as total_mismatches,
      COUNT(DISTINCT m.make) as affected_makes,
      COUNT(DISTINCT m.model) as affected_models
    FROM motorcycles m
    JOIN motorcycle_specs ms ON m.spec_id = ms.id
    WHERE m.year != ms.year
  `);
  
  console.log(`  - Total mismatches: ${mismatches.rows[0].total_mismatches}`);
  console.log(`  - Affected makes: ${mismatches.rows[0].affected_makes}`);
  console.log(`  - Affected models: ${mismatches.rows[0].affected_models}`);
  
  // 4. Check coverage by year
  console.log('\n4. Specification coverage by year (2020-2025):');
  const coverage = await client.query(`
    SELECT 
      year,
      COUNT(*) as total_motorcycles,
      COUNT(spec_id) as with_specs,
      COUNT(*) - COUNT(spec_id) as without_specs,
      ROUND(COUNT(spec_id)::numeric / COUNT(*)::numeric * 100, 2) as coverage_pct
    FROM motorcycles
    WHERE year BETWEEN 2020 AND 2025
    GROUP BY year
    ORDER BY year DESC
  `);
  
  coverage.rows.forEach(row => {
    console.log(`  - ${row.year}: ${row.with_specs}/${row.total_motorcycles} (${row.coverage_pct}%) - ${row.without_specs} missing`);
  });
  
  // 5. Check for suspicious years
  console.log('\n5. Suspicious year entries:');
  const suspicious = await client.query(`
    SELECT 
      year,
      COUNT(*) as count,
      ARRAY_AGG(DISTINCT make ORDER BY make) as makes
    FROM motorcycles
    WHERE year < 1900 OR year > 2025
    GROUP BY year
    ORDER BY year
  `);
  
  console.log(`Found ${suspicious.rowCount} suspicious years:`);
  suspicious.rows.forEach(row => {
    console.log(`  - Year ${row.year}: ${row.count} entries (${row.makes.slice(0, 3).join(', ')}${row.makes.length > 3 ? '...' : ''})`);
  });
  
  // 6. Check year data in JSONB vs column
  console.log('\n6. Year inconsistencies in specs table:');
  const inconsistent = await client.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN year::text != specifications->>'Year' THEN 1 END) as mismatched,
      COUNT(CASE WHEN specifications->>'Year' IS NULL THEN 1 END) as missing_jsonb_year
    FROM motorcycle_specs
    WHERE specifications IS NOT NULL
  `);
  
  console.log(`  - Total specs: ${inconsistent.rows[0].total}`);
  console.log(`  - Year column vs JSONB mismatch: ${inconsistent.rows[0].mismatched}`);
  console.log(`  - Missing year in JSONB: ${inconsistent.rows[0].missing_jsonb_year}`);
}

async function main() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    await analyzeYearData(client);
    
    console.log('\n=== Analysis Complete ===');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };