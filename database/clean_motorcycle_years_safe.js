const { Client } = require('pg');
const readline = require('readline');
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function previewChanges(client) {
  console.log('\n=== Preview of Changes ===\n');
  
  // 1. Year ranges to be parsed
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
  `);
  
  console.log(`1. Year ranges to be normalized: ${yearRanges.rowCount} specs`);
  console.log('   Examples:');
  yearRanges.rows.slice(0, 5).forEach(row => {
    const yearData = row.jsonb_year || row.production || row.production_period;
    console.log(`   - ${row.manufacturer} ${row.model}: ${yearData}`);
  });
  
  // 2. Over-shared specs
  const overshared = await client.query(`
    WITH spec_usage AS (
      SELECT 
        ms.id as spec_id,
        ms.manufacturer,
        ms.model,
        COUNT(DISTINCT m.year) as year_count,
        MIN(m.year) as min_year,
        MAX(m.year) as max_year
      FROM motorcycle_specs ms
      JOIN motorcycles m ON m.spec_id = ms.id
      GROUP BY ms.id, ms.manufacturer, ms.model
      HAVING COUNT(DISTINCT m.year) > 10
    )
    SELECT * FROM spec_usage
    ORDER BY year_count DESC
  `);
  
  console.log(`\n2. Over-shared specs to be split: ${overshared.rowCount} specs`);
  console.log('   Top 5:');
  overshared.rows.slice(0, 5).forEach(row => {
    console.log(`   - ${row.manufacturer} ${row.model}: ${row.year_count} years (${row.min_year}-${row.max_year})`);
  });
  
  // 3. Year mismatches
  const mismatches = await client.query(`
    SELECT COUNT(*) as count
    FROM motorcycles m
    JOIN motorcycle_specs ms ON m.spec_id = ms.id
    WHERE m.year != ms.year
  `);
  
  console.log(`\n3. Year mismatches to fix: ${mismatches.rows[0].count}`);
  
  return {
    yearRanges: yearRanges.rowCount,
    overshared: overshared.rowCount,
    mismatches: mismatches.rows[0].count
  };
}

async function createBackup(client) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  
  console.log(`\nCreating backup tables with timestamp: ${timestamp}`);
  
  await client.query(`
    CREATE TABLE motorcycles_backup_${timestamp} AS 
    SELECT * FROM motorcycles
  `);
  
  await client.query(`
    CREATE TABLE motorcycle_specs_backup_${timestamp} AS 
    SELECT * FROM motorcycle_specs
  `);
  
  console.log('✓ Backup tables created');
  return timestamp;
}

async function parseYearRangesStep(client, dryRun = false) {
  console.log('\n=== Parsing Year Ranges ===');
  
  const yearRanges = await client.query(`
    SELECT 
      id,
      manufacturer,
      model,
      year,
      (specifications->>'Year')::text as jsonb_year,
      (specifications->>'Production')::text as production,
      (specifications->>'Production period')::text as production_period,
      specifications
    FROM motorcycle_specs
    WHERE 
      specifications->>'Year' ~ '[0-9]{4}.*-.*[0-9]{4}' OR
      specifications->>'Production' ~ '[0-9]{4}.*-.*[0-9]{4}' OR
      specifications->>'Production period' ~ '[0-9]{4}.*-.*[0-9]{4}'
    ORDER BY manufacturer, model
  `);
  
  let processed = 0;
  const changes = [];
  
  for (const spec of yearRanges.rows) {
    const yearRange = spec.jsonb_year || spec.production || spec.production_period;
    if (!yearRange) continue;
    
    const match = yearRange.match(/(\d{4})\s*[-–]\s*(\d{4})/);
    if (match) {
      const startYear = parseInt(match[1]);
      const endYear = parseInt(match[2]);
      
      changes.push({
        spec: `${spec.manufacturer} ${spec.model}`,
        range: yearRange,
        startYear,
        endYear,
        newEntries: endYear - startYear
      });
      
      if (!dryRun) {
        // Update the original spec to use start year
        await client.query(`
          UPDATE motorcycle_specs 
          SET 
            year = $1,
            specifications = jsonb_set(
              jsonb_set(specifications, '{Year}', to_jsonb($1::text)),
              '{Year_Range}',
              to_jsonb($2)
            ),
            updated_at = NOW()
          WHERE id = $3
        `, [startYear, yearRange, spec.id]);
        
        // Create entries for other years
        for (let year = startYear + 1; year <= endYear; year++) {
          await client.query(`
            INSERT INTO motorcycle_specs (
              manufacturer, model, year, category, package, title, 
              source, scraped_at, specifications, images, content, url
            )
            SELECT 
              manufacturer, model, $1::integer, category, package, title,
              source, scraped_at, 
              jsonb_set(
                jsonb_set(specifications, '{Year}', to_jsonb($1::text)),
                '{Year_Range}',
                to_jsonb($2)
              ),
              images, content, url
            FROM motorcycle_specs
            WHERE id = $3
          `, [year, yearRange, spec.id]);
        }
        
        processed++;
      }
    }
  }
  
  if (dryRun) {
    console.log('\nDRY RUN - Changes that would be made:');
    changes.slice(0, 10).forEach(change => {
      console.log(`  - ${change.spec}: ${change.range} → ${change.newEntries} new entries`);
    });
    if (changes.length > 10) {
      console.log(`  ... and ${changes.length - 10} more`);
    }
  } else {
    console.log(`✓ Processed ${processed} year ranges`);
  }
  
  return processed;
}

async function splitOversharedSpecsStep(client, dryRun = false) {
  console.log('\n=== Splitting Over-shared Specs ===');
  
  const overshared = await client.query(`
    WITH spec_usage AS (
      SELECT 
        ms.id as spec_id,
        ms.manufacturer,
        ms.model,
        COUNT(DISTINCT m.year) as year_count,
        ARRAY_AGG(DISTINCT m.year ORDER BY m.year) as years
      FROM motorcycle_specs ms
      JOIN motorcycles m ON m.spec_id = ms.id
      GROUP BY ms.id, ms.manufacturer, ms.model
      HAVING COUNT(DISTINCT m.year) > 10
    )
    SELECT * FROM spec_usage
    ORDER BY year_count DESC
  `);
  
  let processed = 0;
  let newSpecs = 0;
  
  for (const shared of overshared.rows) {
    if (dryRun) {
      console.log(`  Would split: ${shared.manufacturer} ${shared.model} (${shared.year_count} years)`);
      continue;
    }
    
    for (const year of shared.years) {
      // Check if year-specific spec exists
      const existing = await client.query(`
        SELECT id FROM motorcycle_specs
        WHERE manufacturer = $1 AND model = $2 AND year = $3
        AND id != $4
      `, [shared.manufacturer, shared.model, year, shared.spec_id]);
      
      if (existing.rows.length === 0) {
        // Create year-specific spec
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
        
        // Update motorcycles to use new spec
        await client.query(`
          UPDATE motorcycles
          SET spec_id = $1, updated_at = NOW()
          WHERE spec_id = $2 AND year = $3
        `, [newSpec.rows[0].id, shared.spec_id, year]);
        
        newSpecs++;
      }
    }
    
    processed++;
    if (processed % 5 === 0) {
      console.log(`  Progress: ${processed}/${overshared.rowCount} specs processed`);
    }
  }
  
  if (!dryRun) {
    console.log(`✓ Processed ${processed} over-shared specs, created ${newSpecs} new year-specific specs`);
  }
  
  return { processed, newSpecs };
}

async function fixYearMismatchesStep(client, dryRun = false) {
  console.log('\n=== Fixing Year Mismatches ===');
  
  const mismatches = await client.query(`
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
  
  let fixed = 0;
  let notFound = 0;
  
  for (const mismatch of mismatches.rows) {
    // Find correct spec
    const correctSpec = await client.query(`
      SELECT id FROM motorcycle_specs
      WHERE manufacturer = $1 AND model = $2 AND year = $3
    `, [mismatch.manufacturer, mismatch.spec_model, mismatch.motorcycle_year]);
    
    if (correctSpec.rows.length > 0) {
      if (!dryRun) {
        await client.query(`
          UPDATE motorcycles
          SET spec_id = $1, updated_at = NOW()
          WHERE id = $2
        `, [correctSpec.rows[0].id, mismatch.motorcycle_id]);
      }
      fixed++;
    } else {
      notFound++;
      if (dryRun && notFound <= 5) {
        console.log(`  No spec found for: ${mismatch.make} ${mismatch.motorcycle_model} ${mismatch.motorcycle_year}`);
      }
    }
  }
  
  console.log(`  Fixed: ${fixed}`);
  console.log(`  No matching spec found: ${notFound}`);
  
  return { fixed, notFound };
}

async function main() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Show preview
    const stats = await previewChanges(client);
    
    console.log('\n' + '='.repeat(50));
    console.log('This will make the following changes:');
    console.log(`- Parse ${stats.yearRanges} year ranges`);
    console.log(`- Split ${stats.overshared} over-shared specs`);
    console.log(`- Fix ${stats.mismatches} year mismatches`);
    console.log('='.repeat(50));
    
    const proceed = await askQuestion('\nDo you want to proceed? (y/n): ');
    
    if (proceed.toLowerCase() !== 'y') {
      console.log('Operation cancelled');
      return;
    }
    
    // Create backup
    const backupTimestamp = await createBackup(client);
    
    // Run in transaction
    await client.query('BEGIN');
    
    try {
      // Parse year ranges
      await parseYearRangesStep(client, false);
      
      // Split over-shared specs
      await splitOversharedSpecsStep(client, false);
      
      // Fix year mismatches
      await fixYearMismatchesStep(client, false);
      
      // Add constraints
      console.log('\nAdding validation constraints...');
      await client.query(`
        ALTER TABLE motorcycles 
        DROP CONSTRAINT IF EXISTS motorcycles_year_range_check
      `);
      await client.query(`
        ALTER TABLE motorcycles 
        ADD CONSTRAINT motorcycles_year_range_check 
        CHECK (year >= 1885 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 2)
      `);
      
      await client.query(`
        ALTER TABLE motorcycle_specs 
        DROP CONSTRAINT IF EXISTS motorcycle_specs_year_range_check
      `);
      await client.query(`
        ALTER TABLE motorcycle_specs 
        ADD CONSTRAINT motorcycle_specs_year_range_check 
        CHECK (year >= 1885 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 2)
      `);
      
      console.log('✓ Constraints added');
      
      await client.query('COMMIT');
      console.log('\n✓ All changes committed successfully!');
      console.log(`  Backup tables: motorcycles_backup_${backupTimestamp}, motorcycle_specs_backup_${backupTimestamp}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('\n✗ Error occurred, rolling back changes:', error.message);
      throw error;
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
    await client.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };