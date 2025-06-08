const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function verifyCleanup(client) {
  const results = {
    timestamp: new Date().toISOString(),
    checks: {}
  };
  
  console.log('=== Motorcycle Years Cleanup Verification ===\n');
  
  // 1. Check for remaining year ranges
  console.log('1. Checking for year ranges in JSONB:');
  const yearRanges = await client.query(`
    SELECT COUNT(*) as count
    FROM motorcycle_specs
    WHERE 
      specifications->>'Year' ~ '[0-9]{4}.*-.*[0-9]{4}' OR
      specifications->>'Production' ~ '[0-9]{4}.*-.*[0-9]{4}' OR
      specifications->>'Production period' ~ '[0-9]{4}.*-.*[0-9]{4}'
  `);
  
  results.checks.yearRanges = yearRanges.rows[0].count;
  console.log(`   Remaining year ranges: ${yearRanges.rows[0].count}`);
  
  if (yearRanges.rows[0].count > 0) {
    const examples = await client.query(`
      SELECT 
        manufacturer,
        model,
        (specifications->>'Year')::text as jsonb_year
      FROM motorcycle_specs
      WHERE specifications->>'Year' ~ '[0-9]{4}.*-.*[0-9]{4}'
      LIMIT 3
    `);
    
    console.log('   Examples:');
    examples.rows.forEach(row => {
      console.log(`   - ${row.manufacturer} ${row.model}: ${row.jsonb_year}`);
    });
  }
  
  // 2. Check for over-shared specs
  console.log('\n2. Checking for over-shared specifications:');
  const overshared = await client.query(`
    WITH spec_usage AS (
      SELECT 
        ms.id,
        ms.manufacturer,
        ms.model,
        COUNT(DISTINCT m.year) as year_count,
        MIN(m.year) as min_year,
        MAX(m.year) as max_year
      FROM motorcycle_specs ms
      JOIN motorcycles m ON m.spec_id = ms.id
      GROUP BY ms.id, ms.manufacturer, ms.model
    )
    SELECT 
      COUNT(*) as total_overshared,
      COUNT(CASE WHEN year_count > 10 THEN 1 END) as very_overshared,
      COUNT(CASE WHEN year_count > 5 THEN 1 END) as moderately_overshared,
      MAX(year_count) as max_years_shared
    FROM spec_usage
  `);
  
  results.checks.overshared = overshared.rows[0];
  console.log(`   Specs shared across >10 years: ${overshared.rows[0].very_overshared}`);
  console.log(`   Specs shared across >5 years: ${overshared.rows[0].moderately_overshared}`);
  console.log(`   Maximum years shared: ${overshared.rows[0].max_years_shared}`);
  
  // 3. Check year mismatches
  console.log('\n3. Checking year mismatches:');
  const mismatches = await client.query(`
    SELECT COUNT(*) as count
    FROM motorcycles m
    JOIN motorcycle_specs ms ON m.spec_id = ms.id
    WHERE m.year != ms.year
  `);
  
  results.checks.yearMismatches = mismatches.rows[0].count;
  console.log(`   Remaining mismatches: ${mismatches.rows[0].count}`);
  
  // 4. Check year consistency in JSONB
  console.log('\n4. Checking year consistency in specs:');
  const consistency = await client.query(`
    SELECT 
      COUNT(*) as total_specs,
      COUNT(CASE WHEN year::text = specifications->>'Year' THEN 1 END) as consistent,
      COUNT(CASE WHEN year::text != specifications->>'Year' THEN 1 END) as inconsistent,
      COUNT(CASE WHEN specifications->>'Year' IS NULL THEN 1 END) as missing_jsonb_year
    FROM motorcycle_specs
    WHERE specifications IS NOT NULL
  `);
  
  results.checks.consistency = consistency.rows[0];
  const consistencyPct = (consistency.rows[0].consistent / consistency.rows[0].total_specs * 100).toFixed(2);
  console.log(`   Total specs: ${consistency.rows[0].total_specs}`);
  console.log(`   Consistent year data: ${consistency.rows[0].consistent} (${consistencyPct}%)`);
  console.log(`   Inconsistent: ${consistency.rows[0].inconsistent}`);
  console.log(`   Missing JSONB year: ${consistency.rows[0].missing_jsonb_year}`);
  
  // 5. Check coverage improvement
  console.log('\n5. Specification coverage by year:');
  const coverage = await client.query(`
    SELECT 
      year,
      COUNT(*) as total,
      COUNT(spec_id) as with_specs,
      ROUND(COUNT(spec_id)::numeric / COUNT(*)::numeric * 100, 2) as coverage_pct
    FROM motorcycles
    WHERE year BETWEEN 2020 AND 2025
    GROUP BY year
    ORDER BY year DESC
  `);
  
  results.checks.coverage = coverage.rows;
  coverage.rows.forEach(row => {
    console.log(`   ${row.year}: ${row.with_specs}/${row.total} (${row.coverage_pct}%)`);
  });
  
  // 6. Check for invalid years
  console.log('\n6. Checking for invalid years:');
  const invalidYears = await client.query(`
    SELECT 
      'motorcycles' as table_name,
      COUNT(*) as count
    FROM motorcycles
    WHERE year < 1885 OR year > EXTRACT(YEAR FROM CURRENT_DATE) + 2
    UNION ALL
    SELECT 
      'motorcycle_specs' as table_name,
      COUNT(*) as count
    FROM motorcycle_specs
    WHERE year < 1885 OR year > EXTRACT(YEAR FROM CURRENT_DATE) + 2
  `);
  
  results.checks.invalidYears = invalidYears.rows;
  invalidYears.rows.forEach(row => {
    console.log(`   ${row.table_name}: ${row.count} invalid years`);
  });
  
  // 7. Summary statistics
  console.log('\n7. Summary statistics:');
  const stats = await client.query(`
    SELECT 
      (SELECT COUNT(*) FROM motorcycles) as total_motorcycles,
      (SELECT COUNT(*) FROM motorcycle_specs) as total_specs,
      (SELECT COUNT(DISTINCT spec_id) FROM motorcycles WHERE spec_id IS NOT NULL) as used_specs,
      (SELECT COUNT(*) FROM motorcycles WHERE spec_id IS NOT NULL) as linked_motorcycles
  `);
  
  results.checks.summary = stats.rows[0];
  console.log(`   Total motorcycles: ${stats.rows[0].total_motorcycles}`);
  console.log(`   Total specs: ${stats.rows[0].total_specs}`);
  console.log(`   Used specs: ${stats.rows[0].used_specs}`);
  console.log(`   Linked motorcycles: ${stats.rows[0].linked_motorcycles}`);
  
  // Save results
  const reportPath = path.join(__dirname, `motorcycle_cleanup_verification_${new Date().toISOString().substring(0, 19).replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  
  console.log(`\n✓ Verification complete. Report saved to: ${reportPath}`);
  
  // Return pass/fail status
  const issues = [];
  if (results.checks.yearRanges > 0) issues.push('Year ranges still present');
  if (results.checks.overshared.very_overshared > 0) issues.push('Over-shared specs remain');
  if (results.checks.yearMismatches > 0) issues.push('Year mismatches remain');
  if (results.checks.consistency.inconsistent > 0) issues.push('Year inconsistencies in JSONB');
  
  if (issues.length > 0) {
    console.log('\n⚠️  Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log('\n✅ All checks passed!');
  }
  
  return issues.length === 0;
}

async function main() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    const success = await verifyCleanup(client);
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { verifyCleanup };