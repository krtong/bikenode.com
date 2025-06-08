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

async function backupTables(client) {
  console.log('Creating backup of motorcycle tables...');
  
  try {
    // Create backup tables with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    await client.query(`
      CREATE TABLE motorcycles_backup_${timestamp} AS 
      SELECT * FROM motorcycles
    `);
    
    await client.query(`
      CREATE TABLE motorcycle_specs_backup_${timestamp} AS 
      SELECT * FROM motorcycle_specs
    `);
    
    console.log(`✓ Backup tables created with timestamp: ${timestamp}`);
    return timestamp;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

async function parseYearRanges(client) {
  console.log('\nParsing year ranges in JSONB data...');
  
  try {
    // Find all specs with year ranges in JSONB
    const rangeQuery = await client.query(`
      SELECT 
        id,
        manufacturer,
        model,
        year,
        specifications,
        (specifications->>'Year')::text as jsonb_year,
        (specifications->>'Production')::text as production,
        (specifications->>'Production period')::text as production_period
      FROM motorcycle_specs
      WHERE 
        specifications->>'Year' ~ '[0-9]{4}.*-.*[0-9]{4}' OR
        specifications->>'Production' ~ '[0-9]{4}.*-.*[0-9]{4}' OR
        specifications->>'Production period' ~ '[0-9]{4}.*-.*[0-9]{4}'
    `);
    
    console.log(`Found ${rangeQuery.rows.length} specs with year ranges`);
    
    for (const spec of rangeQuery.rows) {
      const yearRange = spec.jsonb_year || spec.production || spec.production_period;
      if (!yearRange) continue;
      
      // Parse year range (handles formats like "1998-2001" or "1998 - 2001")
      const match = yearRange.match(/(\d{4})\s*[-–]\s*(\d{4})/);
      if (match) {
        const startYear = parseInt(match[1]);
        const endYear = parseInt(match[2]);
        
        console.log(`  Processing ${spec.manufacturer} ${spec.model}: ${startYear}-${endYear}`);
        
        // Update the spec to use the start year as the primary year
        await client.query(`
          UPDATE motorcycle_specs 
          SET 
            year = $1,
            specifications = jsonb_set(
              specifications,
              '{Year}',
              to_jsonb($1::text)
            ),
            specifications = jsonb_set(
              specifications,
              '{Year_Range}',
              to_jsonb($2)
            ),
            updated_at = NOW()
          WHERE id = $3
        `, [startYear, yearRange, spec.id]);
        
        // Create additional spec entries for other years in the range
        for (let year = startYear + 1; year <= endYear; year++) {
          await client.query(`
            INSERT INTO motorcycle_specs (
              manufacturer, model, year, category, package, title, 
              source, scraped_at, specifications, images, content, url
            )
            SELECT 
              manufacturer, model, $1::integer, category, package, title,
              source, scraped_at, 
              jsonb_set(specifications, '{Year}', to_jsonb($1::text)),
              images, content, url
            FROM motorcycle_specs
            WHERE id = $2
          `, [year, spec.id]);
        }
      }
    }
    
    console.log('✓ Year ranges parsed and normalized');
  } catch (error) {
    console.error('Error parsing year ranges:', error);
    throw error;
  }
}

async function splitOversharedSpecs(client) {
  console.log('\nSplitting over-shared specifications...');
  
  try {
    // Find specs shared across too many years
    const oversharedQuery = await client.query(`
      WITH spec_usage AS (
        SELECT 
          ms.id as spec_id,
          ms.manufacturer,
          ms.model,
          ms.year as spec_year,
          COUNT(DISTINCT m.year) as year_count,
          MIN(m.year) as min_year,
          MAX(m.year) as max_year,
          ARRAY_AGG(DISTINCT m.year ORDER BY m.year) as years
        FROM motorcycle_specs ms
        JOIN motorcycles m ON m.spec_id = ms.id
        GROUP BY ms.id, ms.manufacturer, ms.model, ms.year
        HAVING COUNT(DISTINCT m.year) > 10
      )
      SELECT * FROM spec_usage
      ORDER BY year_count DESC
    `);
    
    console.log(`Found ${oversharedQuery.rows.length} over-shared specs`);
    
    for (const shared of oversharedQuery.rows) {
      console.log(`  Processing ${shared.manufacturer} ${shared.model}: ${shared.year_count} years (${shared.min_year}-${shared.max_year})`);
      
      // For each year, create a year-specific spec if needed
      for (const year of shared.years) {
        // Check if we already have a year-specific spec
        const existingSpec = await client.query(`
          SELECT id FROM motorcycle_specs
          WHERE manufacturer = $1 AND model = $2 AND year = $3
          AND id != $4
        `, [shared.manufacturer, shared.model, year, shared.spec_id]);
        
        if (existingSpec.rows.length === 0) {
          // Create a new year-specific spec
          const newSpec = await client.query(`
            INSERT INTO motorcycle_specs (
              manufacturer, model, year, category, package, title,
              source, scraped_at, specifications, images, content, url
            )
            SELECT 
              manufacturer, model, $1::integer, category, package, title,
              source, scraped_at,
              jsonb_set(specifications, '{Year}', to_jsonb($1::text)),
              images, content, url
            FROM motorcycle_specs
            WHERE id = $2
            RETURNING id
          `, [year, shared.spec_id]);
          
          // Update motorcycles to use the new spec
          await client.query(`
            UPDATE motorcycles
            SET spec_id = $1, updated_at = NOW()
            WHERE spec_id = $2 AND year = $3
          `, [newSpec.rows[0].id, shared.spec_id, year]);
        }
      }
    }
    
    console.log('✓ Over-shared specs split into year-specific variants');
  } catch (error) {
    console.error('Error splitting specs:', error);
    throw error;
  }
}

async function fixYearMismatches(client) {
  console.log('\nFixing year mismatches between tables...');
  
  try {
    // Find mismatches
    const mismatchQuery = await client.query(`
      SELECT 
        m.id as motorcycle_id,
        m.year as motorcycle_year,
        m.make,
        m.model as motorcycle_model,
        ms.id as spec_id,
        ms.year as spec_year,
        ms.manufacturer,
        ms.model as spec_model
      FROM motorcycles m
      JOIN motorcycle_specs ms ON m.spec_id = ms.id
      WHERE m.year != ms.year
    `);
    
    console.log(`Found ${mismatchQuery.rows.length} year mismatches`);
    
    for (const mismatch of mismatchQuery.rows) {
      // Try to find a spec with the correct year
      const correctSpec = await client.query(`
        SELECT id FROM motorcycle_specs
        WHERE manufacturer = $1 AND model = $2 AND year = $3
      `, [mismatch.manufacturer, mismatch.spec_model, mismatch.motorcycle_year]);
      
      if (correctSpec.rows.length > 0) {
        // Update to use the correct spec
        await client.query(`
          UPDATE motorcycles
          SET spec_id = $1, updated_at = NOW()
          WHERE id = $2
        `, [correctSpec.rows[0].id, mismatch.motorcycle_id]);
        
        console.log(`  ✓ Fixed ${mismatch.make} ${mismatch.motorcycle_model} ${mismatch.motorcycle_year}`);
      } else {
        console.log(`  ! No matching spec for ${mismatch.make} ${mismatch.motorcycle_model} ${mismatch.motorcycle_year}`);
      }
    }
    
    console.log('✓ Year mismatches processed');
  } catch (error) {
    console.error('Error fixing mismatches:', error);
    throw error;
  }
}

async function addValidationConstraints(client) {
  console.log('\nAdding validation constraints...');
  
  try {
    // Add check constraint for reasonable year range
    await client.query(`
      ALTER TABLE motorcycles 
      ADD CONSTRAINT motorcycles_year_range_check 
      CHECK (year >= 1885 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 2)
    `);
    
    await client.query(`
      ALTER TABLE motorcycle_specs 
      ADD CONSTRAINT motorcycle_specs_year_range_check 
      CHECK (year >= 1885 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 2)
    `);
    
    console.log('✓ Validation constraints added');
  } catch (error) {
    if (error.code === '42710') {
      console.log('✓ Constraints already exist');
    } else {
      console.error('Error adding constraints:', error);
      throw error;
    }
  }
}

async function generateReport(client, backupTimestamp) {
  console.log('\nGenerating cleanup report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    backupTimestamp: backupTimestamp,
    statistics: {}
  };
  
  // Get statistics
  const stats = await client.query(`
    WITH stats AS (
      SELECT 
        (SELECT COUNT(*) FROM motorcycles) as total_motorcycles,
        (SELECT COUNT(*) FROM motorcycle_specs) as total_specs,
        (SELECT COUNT(*) FROM motorcycles WHERE spec_id IS NOT NULL) as linked_motorcycles,
        (SELECT COUNT(DISTINCT spec_id) FROM motorcycles WHERE spec_id IS NOT NULL) as used_specs
    )
    SELECT * FROM stats
  `);
  
  report.statistics = stats.rows[0];
  
  // Year coverage
  const yearCoverage = await client.query(`
    SELECT 
      year,
      COUNT(*) as total,
      COUNT(spec_id) as with_specs,
      ROUND(COUNT(spec_id)::numeric / COUNT(*)::numeric * 100, 2) as coverage_pct
    FROM motorcycles
    WHERE year >= 2020
    GROUP BY year
    ORDER BY year DESC
  `);
  
  report.yearCoverage = yearCoverage.rows;
  
  // Save report
  await fs.writeFile(
    path.join(__dirname, `motorcycle_cleanup_report_${backupTimestamp}.json`),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n=== Cleanup Report ===');
  console.log(`Total motorcycles: ${report.statistics.total_motorcycles}`);
  console.log(`Total specs: ${report.statistics.total_specs}`);
  console.log(`Linked motorcycles: ${report.statistics.linked_motorcycles}`);
  console.log(`Used specs: ${report.statistics.used_specs}`);
  console.log('\nRecent year coverage:');
  report.yearCoverage.forEach(year => {
    console.log(`  ${year.year}: ${year.with_specs}/${year.total} (${year.coverage_pct}%)`);
  });
}

async function main() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Step 1: Create backup
    const backupTimestamp = await backupTables(client);
    
    // Step 2: Parse year ranges
    await parseYearRanges(client);
    
    // Step 3: Split over-shared specs
    await splitOversharedSpecs(client);
    
    // Step 4: Fix year mismatches
    await fixYearMismatches(client);
    
    // Step 5: Add validation constraints
    await addValidationConstraints(client);
    
    // Generate report
    await generateReport(client, backupTimestamp);
    
    console.log('\n✓ Motorcycle years cleanup completed successfully!');
    console.log(`  Backup tables created with timestamp: ${backupTimestamp}`);
    
  } catch (error) {
    console.error('\nError during cleanup:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the cleanup
if (require.main === module) {
  main();
}

module.exports = { main };