import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function analyzeSpecYearCoverage() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // First, let's look at models that have SOME years linked but not others
    console.log('=== Models with Partial Year Coverage ===\n');
    
    const partialCoverage = await client.query(`
      WITH spec_model_years AS (
        SELECT 
          manufacturer,
          model,
          year,
          COUNT(*) as spec_count,
          COUNT(DISTINCT variant) as variant_count,
          BOOL_OR(id IN (SELECT cleaned_spec_id FROM motorcycles WHERE cleaned_spec_id IS NOT NULL)) as is_linked
        FROM motorcycle_specs_cleaned
        GROUP BY manufacturer, model, year
      ),
      model_coverage AS (
        SELECT 
          manufacturer,
          model,
          COUNT(DISTINCT year) as total_years,
          COUNT(DISTINCT year) FILTER (WHERE is_linked) as linked_years,
          MIN(year) as min_year,
          MAX(year) as max_year,
          ARRAY_AGG(year ORDER BY year) FILTER (WHERE is_linked) as linked_years_list,
          ARRAY_AGG(year ORDER BY year) FILTER (WHERE NOT is_linked) as unlinked_years_list
        FROM spec_model_years
        GROUP BY manufacturer, model
        HAVING COUNT(DISTINCT year) FILTER (WHERE is_linked) > 0 
          AND COUNT(DISTINCT year) FILTER (WHERE NOT is_linked) > 0
      )
      SELECT * FROM model_coverage
      ORDER BY manufacturer, model
      LIMIT 30
    `);
    
    console.log('Manufacturer | Model | Total Years | Linked | Years Range | Linked Years | Missing Years');
    console.log('-'.repeat(120));
    
    partialCoverage.rows.forEach(row => {
      const linkedYears = row.linked_years_list ? row.linked_years_list.join(', ') : 'None';
      const missingYears = row.unlinked_years_list ? row.unlinked_years_list.slice(0, 10).join(', ') : 'None';
      const moreMissing = row.unlinked_years_list && row.unlinked_years_list.length > 10 ? '...' : '';
      
      console.log(`${row.manufacturer} | ${row.model} | ${row.total_years} | ${row.linked_years} | ${row.min_year}-${row.max_year} | ${linkedYears} | ${missingYears}${moreMissing}`);
    });
    
    // Check specific examples with the motorcycles they should match
    console.log('\n\n=== Checking Specific Missing Years ===\n');
    
    // Let's check a specific model's coverage
    const hondaExample = await client.query(`
      WITH honda_specs AS (
        SELECT 
          manufacturer,
          model,
          variant,
          year,
          id as spec_id,
          EXISTS (
            SELECT 1 FROM motorcycles m 
            WHERE m.cleaned_spec_id = msc.id
          ) as is_linked
        FROM motorcycle_specs_cleaned msc
        WHERE manufacturer = 'Honda' 
        AND model LIKE '%CB%'
        ORDER BY model, year
        LIMIT 20
      ),
      honda_motorcycles AS (
        SELECT 
          make,
          model,
          year,
          cleaned_spec_id
        FROM motorcycles
        WHERE make = 'Honda'
        AND model LIKE '%CB%'
        ORDER BY model, year
        LIMIT 20
      )
      SELECT 
        'Spec' as source,
        hs.manufacturer as make,
        hs.model,
        hs.variant,
        hs.year,
        hs.spec_id::text as id,
        hs.is_linked
      FROM honda_specs hs
      UNION ALL
      SELECT 
        'Motorcycle' as source,
        hm.make,
        hm.model,
        NULL as variant,
        hm.year,
        hm.cleaned_spec_id::text as id,
        hm.cleaned_spec_id IS NOT NULL as is_linked
      FROM honda_motorcycles hm
      ORDER BY model, year, source DESC
    `);
    
    console.log('Example: Honda CB models\n');
    console.log('Source | Make | Model | Variant | Year | ID/Spec_ID | Linked?');
    console.log('-'.repeat(80));
    
    hondaExample.rows.forEach(row => {
      console.log(`${row.source} | ${row.make} | ${row.model} | ${row.variant || '-'} | ${row.year} | ${row.id ? row.id.substring(0, 8) : '-'} | ${row.is_linked ? 'Yes' : 'No'}`);
    });
    
    // Find cases where we have motorcycles but missing spec years
    console.log('\n\n=== Motorcycles Missing Spec Years ===\n');
    
    const missingSpecYears = await client.query(`
      WITH motorcycle_years AS (
        SELECT 
          make,
          model,
          MIN(year) as min_year,
          MAX(year) as max_year,
          COUNT(DISTINCT year) as year_count,
          ARRAY_AGG(DISTINCT year ORDER BY year) as years
        FROM motorcycles
        WHERE cleaned_spec_id IS NULL
        GROUP BY make, model
      ),
      spec_years AS (
        SELECT 
          manufacturer,
          model,
          ARRAY_AGG(DISTINCT year ORDER BY year) as spec_years
        FROM motorcycle_specs_cleaned
        GROUP BY manufacturer, model
      )
      SELECT 
        my.make,
        my.model,
        my.year_count as motorcycle_years,
        my.min_year || '-' || my.max_year as year_range,
        COALESCE(array_length(sy.spec_years, 1), 0) as spec_years_count,
        my.years[1:5] as sample_motorcycle_years,
        sy.spec_years[1:5] as sample_spec_years
      FROM motorcycle_years my
      LEFT JOIN spec_years sy ON 
        LOWER(my.make) = LOWER(sy.manufacturer) AND
        LOWER(my.model) = LOWER(sy.model)
      WHERE sy.spec_years IS NOT NULL
      ORDER BY my.year_count DESC
      LIMIT 20
    `);
    
    console.log('Make | Model | Motorcycle Years | Range | Spec Years | Sample Moto Years | Sample Spec Years');
    console.log('-'.repeat(100));
    
    missingSpecYears.rows.forEach(row => {
      const motoYears = row.sample_motorcycle_years ? row.sample_motorcycle_years.join(', ') : 'None';
      const specYears = row.sample_spec_years ? row.sample_spec_years.join(', ') : 'None';
      
      console.log(`${row.make} | ${row.model} | ${row.motorcycle_years} | ${row.year_range} | ${row.spec_years_count} | ${motoYears}... | ${specYears}...`);
    });
    
    // Summary statistics
    console.log('\n\n=== Coverage Summary ===\n');
    
    const summary = await client.query(`
      WITH coverage AS (
        SELECT 
          msc.manufacturer,
          msc.model,
          msc.year,
          msc.variant,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM motorcycles m 
              WHERE m.cleaned_spec_id = msc.id
            ) THEN 'linked'
            WHEN EXISTS (
              SELECT 1 FROM motorcycles m 
              WHERE LOWER(m.make) = LOWER(msc.manufacturer)
                AND LOWER(m.model) = LOWER(msc.model)
                AND m.year = msc.year
            ) THEN 'potential_match'
            ELSE 'no_match'
          END as status
        FROM motorcycle_specs_cleaned msc
      )
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(DISTINCT (manufacturer, model, year)) as unique_model_years
      FROM coverage
      GROUP BY status
    `);
    
    console.log('Status | Count | Unique Model/Years');
    console.log('-'.repeat(50));
    summary.rows.forEach(row => {
      console.log(`${row.status} | ${row.count} | ${row.unique_model_years}`);
    });
    
    // Check variant coverage
    console.log('\n\n=== Variant Coverage Analysis ===\n');
    
    const variantCoverage = await client.query(`
      SELECT 
        manufacturer,
        model,
        COUNT(DISTINCT variant) as variant_count,
        COUNT(DISTINCT variant) FILTER (WHERE id IN (SELECT cleaned_spec_id FROM motorcycles WHERE cleaned_spec_id IS NOT NULL)) as linked_variants,
        ARRAY_AGG(DISTINCT variant ORDER BY variant) as all_variants,
        ARRAY_AGG(DISTINCT variant ORDER BY variant) FILTER (WHERE id IN (SELECT cleaned_spec_id FROM motorcycles WHERE cleaned_spec_id IS NOT NULL)) as linked_variants_list
      FROM motorcycle_specs_cleaned
      WHERE variant IS NOT NULL
      GROUP BY manufacturer, model
      HAVING COUNT(DISTINCT variant) > 1
      ORDER BY variant_count DESC
      LIMIT 20
    `);
    
    console.log('Manufacturer | Model | Total Variants | Linked | All Variants');
    console.log('-'.repeat(80));
    
    variantCoverage.rows.forEach(row => {
      const allVariants = row.all_variants.slice(0, 5).join(', ');
      const moreVariants = row.all_variants.length > 5 ? '...' : '';
      const linkedVariants = row.linked_variants_list ? `(Linked: ${row.linked_variants_list.join(', ')})` : '(None linked)';
      
      console.log(`${row.manufacturer} | ${row.model} | ${row.variant_count} | ${row.linked_variants} | ${allVariants}${moreVariants} ${linkedVariants}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the analysis
analyzeSpecYearCoverage();