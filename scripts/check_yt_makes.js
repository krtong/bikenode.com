import pkg from 'pg';

const { Pool } = pkg;
const pool = new Pool({
  connectionString: 'postgres://kevintong@localhost:5432/bikenode?sslmode=disable',
});

// Check what make values exist for YT variants
const result = await pool.query(`
  SELECT make, year, COUNT(*) as count
  FROM bikes_catalog 
  WHERE make ILIKE '%yt%' 
  GROUP BY make, year
  ORDER BY make, year
`);

console.log('YT makes in database:');
result.rows.forEach(row => {
  console.log(`  ${row.make} | ${row.year} | Count: ${row.count}`);
});

// Also check for specific variant IDs we know should exist
const variantCheck = await pool.query(`
  SELECT bc.make, bc.model, bc.year, bc.variant, bd.comprehensive_data->'pageInfo'->>'url' as url
  FROM bikes_catalog bc
  LEFT JOIN bikes_data bd ON bc.keyid = bd.keyid
  WHERE bd.comprehensive_data->'pageInfo'->>'url' LIKE '%tues-cf-pro-race%'
  LIMIT 5
`);

console.log('\nSpecific tues-cf-pro-race variants:');
variantCheck.rows.forEach(row => {
  console.log(`  ${row.make} | ${row.model} | ${row.year} | ${row.variant}`);
  console.log(`    URL: ${row.url}`);
});

await pool.end();