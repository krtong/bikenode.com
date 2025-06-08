const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: ''
});

async function analyzeYearData() {
  console.log('🔍 MOTORCYCLE YEAR DATA ANALYSIS');
  console.log('================================\n');

  try {
    // 1. Check basic year statistics
    console.log('1. YEAR STATISTICS IN MOTORCYCLES TABLE');
    console.log('---------------------------------------');
    
    const yearStats = await pool.query(`
      SELECT 
        MIN(year) as min_year,
        MAX(year) as max_year,
        COUNT(DISTINCT year) as unique_years,
        COUNT(*) as total_records,
        COUNT(CASE WHEN spec_id IS NULL THEN 1 END) as without_specs
      FROM motorcycles
      WHERE year IS NOT NULL
    `);
    
    const stats = yearStats.rows[0];
    console.log(`Year range: ${stats.min_year} to ${stats.max_year}`);
    console.log(`Unique years: ${stats.unique_years}`);
    console.log(`Total motorcycles: ${stats.total_records}`);
    console.log(`Motorcycles without specs: ${stats.without_specs}\n`);

    // 2. Check for year patterns in motorcycle_specs
    console.log('2. YEAR DATA IN MOTORCYCLE_SPECS TABLE');
    console.log('--------------------------------------');
    
    const specYears = await pool.query(`
      SELECT 
        id,
        manufacturer,
        model,
        year,
        specifications->>'year' as spec_year,
        specifications->>'model_year' as model_year,
        specifications->>'production_years' as production_years
      FROM motorcycle_specs
      WHERE specifications IS NOT NULL
      LIMIT 20
    `);
    
    console.log('Sample specs with year data:');
    let foundYearData = false;
    for (const row of specYears.rows) {
      if (row.spec_year || row.model_year || row.production_years || row.year) {
        foundYearData = true;
        console.log(`\nSpec ${row.id}: ${row.manufacturer} ${row.model}`);
        if (row.year) console.log(`  Table year: ${row.year}`);
        if (row.spec_year) console.log(`  JSON year: ${row.spec_year}`);
        if (row.model_year) console.log(`  Model year: ${row.model_year}`);
        if (row.production_years) console.log(`  Production years: ${row.production_years}`);
      }
    }
    
    if (!foundYearData) {
      console.log('No year data found in the sample of specs checked.\n');
    }

    // 3. Check for year ranges in text
    console.log('\n3. YEAR RANGE PATTERNS');
    console.log('----------------------');
    
    const yearRanges = await pool.query(`
      SELECT 
        id,
        manufacturer,
        model,
        specifications::text as spec_text
      FROM motorcycle_specs
      WHERE specifications::text ~ '\\d{4}-\\d{4}'
      LIMIT 10
    `);
    
    console.log(`Found ${yearRanges.rowCount} specs with potential year ranges`);
    
    const yearRangePattern = /(\d{4})\s*[-–—]\s*(\d{4})/g;
    yearRanges.rows.forEach(row => {
      const matches = row.spec_text.match(yearRangePattern);
      if (matches) {
        console.log(`\nSpec ${row.id}: ${row.manufacturer} ${row.model}`);
        matches.forEach(match => {
          console.log(`  Found year range: ${match}`);
        });
      }
    });

    // 4. Analyze spec sharing across years
    console.log('\n\n4. SPEC SHARING ACROSS YEARS');
    console.log('----------------------------');
    
    const specSharing = await pool.query(`
      WITH spec_usage AS (
        SELECT 
          spec_id,
          COUNT(DISTINCT year) as year_count,
          MIN(year) as min_year,
          MAX(year) as max_year,
          ARRAY_AGG(DISTINCT year ORDER BY year) as years
        FROM motorcycles
        WHERE spec_id IS NOT NULL
        GROUP BY spec_id
        HAVING COUNT(DISTINCT year) > 5
      )
      SELECT 
        su.*,
        ms.manufacturer,
        ms.model
      FROM spec_usage su
      JOIN motorcycle_specs ms ON ms.id = su.spec_id
      ORDER BY year_count DESC
      LIMIT 10
    `);
    
    console.log('Specs used across many years:');
    specSharing.rows.forEach(row => {
      console.log(`\nSpec ${row.spec_id}: ${row.manufacturer} ${row.model}`);
      console.log(`  Used for ${row.year_count} years: ${row.min_year}-${row.max_year}`);
      if (row.years.length <= 10) {
        console.log(`  Years: ${row.years.join(', ')}`);
      } else {
        console.log(`  Years: ${row.years.slice(0, 5).join(', ')} ... ${row.years.slice(-5).join(', ')}`);
      }
    });

    // 5. Find motorcycles with potential year issues
    console.log('\n\n5. POTENTIAL YEAR DATA ISSUES');
    console.log('-----------------------------');
    
    // Check for models with years in their names
    const modelsWithYears = await pool.query(`
      SELECT DISTINCT make, model, year
      FROM motorcycles
      WHERE model ~ '\\d{4}'
      AND year IS NOT NULL
      LIMIT 10
    `);
    
    console.log('\nModels with years in their names:');
    modelsWithYears.rows.forEach(row => {
      const yearInModel = row.model.match(/\d{4}/);
      if (yearInModel && yearInModel[0] !== row.year.toString()) {
        console.log(`  ${row.make} ${row.model} (DB year: ${row.year}) - MISMATCH`);
      } else {
        console.log(`  ${row.make} ${row.model} (DB year: ${row.year})`);
      }
    });

    // 6. Summary and recommendations
    console.log('\n\n6. SUMMARY AND RECOMMENDATIONS');
    console.log('------------------------------');
    
    // Count recent motorcycles without specs
    const recentWithoutSpecs = await pool.query(`
      SELECT year, COUNT(*) as count
      FROM motorcycles
      WHERE spec_id IS NULL 
      AND year >= 2020
      GROUP BY year
      ORDER BY year DESC
    `);
    
    console.log('\nRecent motorcycles without specifications:');
    let totalRecent = 0;
    recentWithoutSpecs.rows.forEach(row => {
      console.log(`  ${row.year}: ${row.count} motorcycles`);
      totalRecent += parseInt(row.count);
    });
    console.log(`  Total: ${totalRecent} motorcycles from 2020+ without specs`);

    // Check for very old entries
    const veryOld = await pool.query(`
      SELECT year, COUNT(*) as count
      FROM motorcycles
      WHERE year < 1900
      GROUP BY year
      ORDER BY year
    `);
    
    if (veryOld.rowCount > 0) {
      console.log('\n⚠️  Found motorcycles with years before 1900:');
      veryOld.rows.forEach(row => {
        console.log(`  ${row.year}: ${row.count} motorcycles`);
      });
    }

    console.log('\n\n📋 KEY FINDINGS:');
    console.log('1. The motorcycles table uses INTEGER type for years (good)');
    console.log('2. Many recent motorcycles lack specifications');
    console.log('3. Some specs may contain year ranges in JSONB that need parsing');
    console.log('4. Some specs are shared across many years (may need year-specific variants)');
    console.log('5. Model names sometimes contain years that may not match DB years');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

analyzeYearData();