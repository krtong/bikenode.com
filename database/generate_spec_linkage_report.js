import pkg from 'pg';
const { Client } = pkg;
import { writeFileSync } from 'fs';

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function generateSpecLinkageReport() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    let report = '# Motorcycle Specs Linkage Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Overall statistics
    const overallStats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM motorcycles) as total_motorcycles,
        (SELECT COUNT(*) FROM motorcycles WHERE cleaned_spec_id IS NOT NULL) as linked_motorcycles,
        (SELECT COUNT(*) FROM motorcycle_specs_cleaned) as total_specs,
        (SELECT COUNT(DISTINCT cleaned_spec_id) FROM motorcycles WHERE cleaned_spec_id IS NOT NULL) as used_specs
    `);
    
    const stats = overallStats.rows[0];
    const linkageRate = (stats.linked_motorcycles / stats.total_motorcycles * 100).toFixed(2);
    const specUsageRate = (stats.used_specs / stats.total_specs * 100).toFixed(2);
    
    report += '## Overall Statistics\n\n';
    report += `- Total motorcycles: ${stats.total_motorcycles.toLocaleString()}\n`;
    report += `- Linked motorcycles: ${stats.linked_motorcycles.toLocaleString()} (${linkageRate}%)\n`;
    report += `- Total specs: ${stats.total_specs.toLocaleString()}\n`;
    report += `- Used specs: ${stats.used_specs.toLocaleString()} (${specUsageRate}%)\n`;
    report += `- Orphaned specs: ${(stats.total_specs - stats.used_specs).toLocaleString()}\n\n`;
    
    // Coverage by manufacturer
    const manufacturerCoverage = await client.query(`
      SELECT 
        make,
        COUNT(*) as total,
        COUNT(cleaned_spec_id) as linked,
        COUNT(*) - COUNT(cleaned_spec_id) as unlinked,
        ROUND(COUNT(cleaned_spec_id)::numeric / COUNT(*)::numeric * 100, 2) as percentage,
        MIN(year) as min_year,
        MAX(year) as max_year
      FROM motorcycles
      GROUP BY make
      ORDER BY total DESC
      LIMIT 30
    `);
    
    report += '## Coverage by Manufacturer (Top 30)\n\n';
    report += '| Manufacturer | Total | Linked | Unlinked | Coverage % | Year Range |\n';
    report += '|--------------|-------|--------|----------|------------|------------|\n';
    
    manufacturerCoverage.rows.forEach(row => {
      report += `| ${row.make} | ${row.total} | ${row.linked} | ${row.unlinked} | ${row.percentage}% | ${row.min_year}-${row.max_year} |\n`;
    });
    
    // Year distribution analysis
    const yearDistribution = await client.query(`
      WITH year_stats AS (
        SELECT 
          year,
          COUNT(*) as total_motorcycles,
          COUNT(cleaned_spec_id) as linked_motorcycles,
          ROUND(COUNT(cleaned_spec_id)::numeric / COUNT(*)::numeric * 100, 2) as linkage_rate
        FROM motorcycles
        WHERE year IS NOT NULL
        GROUP BY year
      )
      SELECT 
        CASE 
          WHEN year < 1950 THEN 'Pre-1950'
          WHEN year < 1960 THEN '1950-1959'
          WHEN year < 1970 THEN '1960-1969'
          WHEN year < 1980 THEN '1970-1979'
          WHEN year < 1990 THEN '1980-1989'
          WHEN year < 2000 THEN '1990-1999'
          WHEN year < 2010 THEN '2000-2009'
          WHEN year < 2020 THEN '2010-2019'
          ELSE '2020+'
        END as decade,
        SUM(total_motorcycles) as total,
        SUM(linked_motorcycles) as linked,
        ROUND(SUM(linked_motorcycles)::numeric / SUM(total_motorcycles)::numeric * 100, 2) as linkage_rate
      FROM year_stats
      GROUP BY decade
      ORDER BY decade
    `);
    
    report += '\n## Coverage by Decade\n\n';
    report += '| Decade | Total Motorcycles | Linked | Coverage % |\n';
    report += '|--------|-------------------|--------|------------|\n';
    
    yearDistribution.rows.forEach(row => {
      report += `| ${row.decade} | ${row.total} | ${row.linked} | ${row.linkage_rate}% |\n`;
    });
    
    // Identify main issues
    report += '\n## Key Issues Identified\n\n';
    
    // 1. Missing manufacturers
    const missingManufacturers = await client.query(`
      SELECT 
        m.make,
        COUNT(*) as count,
        COUNT(DISTINCT model) as models
      FROM motorcycles m
      WHERE 
        m.cleaned_spec_id IS NULL AND
        NOT EXISTS (
          SELECT 1 FROM motorcycle_specs_cleaned msc
          WHERE LOWER(msc.manufacturer) = LOWER(m.make)
        )
      GROUP BY m.make
      ORDER BY count DESC
      LIMIT 20
    `);
    
    report += '### 1. Manufacturers with No Specs Available\n\n';
    report += 'These manufacturers have motorcycles but no specifications at all:\n\n';
    report += '| Manufacturer | Motorcycles | Models |\n';
    report += '|--------------|-------------|--------|\n';
    
    missingManufacturers.rows.forEach(row => {
      report += `| ${row.make} | ${row.count} | ${row.models} |\n`;
    });
    
    // 2. Model mismatches
    const modelMismatches = await client.query(`
      WITH unmatched AS (
        SELECT 
          m.make,
          m.model,
          m.year,
          COUNT(*) as count
        FROM motorcycles m
        WHERE 
          m.cleaned_spec_id IS NULL AND
          EXISTS (
            SELECT 1 FROM motorcycle_specs_cleaned msc
            WHERE LOWER(msc.manufacturer) = LOWER(m.make)
          )
        GROUP BY m.make, m.model, m.year
      )
      SELECT 
        make,
        COUNT(DISTINCT model) as unmatched_models,
        SUM(count) as total_motorcycles,
        MIN(year) || '-' || MAX(year) as year_range
      FROM unmatched
      GROUP BY make
      ORDER BY total_motorcycles DESC
      LIMIT 15
    `);
    
    report += '\n### 2. Manufacturers with Specs but Model Mismatches\n\n';
    report += 'These manufacturers have specs available but models don\'t match:\n\n';
    report += '| Manufacturer | Unmatched Models | Motorcycles | Year Range |\n';
    report += '|--------------|------------------|-------------|------------|\n';
    
    modelMismatches.rows.forEach(row => {
      report += `| ${row.make} | ${row.unmatched_models} | ${row.total_motorcycles} | ${row.year_range} |\n`;
    });
    
    // 3. Year coverage gaps
    const yearGaps = await client.query(`
      WITH manufacturer_years AS (
        SELECT 
          make,
          MIN(year) as min_year,
          MAX(year) as max_year,
          COUNT(DISTINCT year) as years_with_data
        FROM motorcycles
        WHERE cleaned_spec_id IS NULL
        GROUP BY make
      ),
      spec_years AS (
        SELECT 
          manufacturer,
          MIN(year) as spec_min_year,
          MAX(year) as spec_max_year,
          COUNT(DISTINCT year) as spec_years
        FROM motorcycle_specs_cleaned
        GROUP BY manufacturer
      )
      SELECT 
        my.make,
        my.years_with_data as motorcycle_years,
        my.min_year || '-' || my.max_year as motorcycle_range,
        sy.spec_years,
        sy.spec_min_year || '-' || sy.spec_max_year as spec_range
      FROM manufacturer_years my
      JOIN spec_years sy ON LOWER(my.make) = LOWER(sy.manufacturer)
      WHERE 
        (my.max_year < sy.spec_min_year OR my.min_year > sy.spec_max_year) OR
        (my.max_year - my.min_year > 10 AND sy.spec_years < 5)
      ORDER BY my.years_with_data DESC
      LIMIT 15
    `);
    
    report += '\n### 3. Year Coverage Gaps\n\n';
    report += 'Manufacturers where motorcycle years don\'t overlap well with spec years:\n\n';
    report += '| Manufacturer | Motorcycle Years | Motorcycle Range | Spec Years | Spec Range |\n';
    report += '|--------------|------------------|------------------|------------|------------|\n';
    
    yearGaps.rows.forEach(row => {
      report += `| ${row.make} | ${row.motorcycle_years} | ${row.motorcycle_range} | ${row.spec_years || 0} | ${row.spec_range || 'N/A'} |\n`;
    });
    
    // Sample unmatched models
    const unmatchedSamples = await client.query(`
      SELECT 
        m.make,
        m.model,
        m.year,
        m.category,
        EXISTS (
          SELECT 1 FROM motorcycle_specs_cleaned msc
          WHERE 
            LOWER(msc.manufacturer) = LOWER(m.make) AND
            msc.year = m.year
        ) as has_specs_for_year
      FROM motorcycles m
      WHERE m.cleaned_spec_id IS NULL
      ORDER BY m.make, m.year DESC, m.model
      LIMIT 50
    `);
    
    report += '\n### 4. Sample Unmatched Motorcycles\n\n';
    report += '| Make | Model | Year | Category | Has Specs for Year? |\n';
    report += '|------|-------|------|----------|--------------------|\n';
    
    unmatchedSamples.rows.forEach(row => {
      report += `| ${row.make} | ${row.model} | ${row.year} | ${row.category || '-'} | ${row.has_specs_for_year ? 'Yes' : 'No'} |\n`;
    });
    
    // Recommendations
    report += '\n## Recommendations\n\n';
    report += '1. **Data Source Mismatch**: The motorcycle catalog and specs database appear to be from different sources with minimal overlap.\n\n';
    report += '2. **Missing Modern Specs**: Many modern motorcycles (2015+) lack specifications.\n\n';
    report += '3. **Model Name Standardization**: Despite normalization efforts, many models use different naming conventions.\n\n';
    report += '4. **Consider Alternative Approaches**:\n';
    report += '   - Import specs from the same source as the motorcycle catalog\n';
    report += '   - Use fuzzy matching with manual verification for high-value matches\n';
    report += '   - Focus on specific manufacturers or year ranges for better coverage\n';
    report += '   - Consider web scraping to fill gaps for popular models\n\n';
    
    // Statistics on what was successfully linked
    const successfulLinks = await client.query(`
      SELECT 
        m.make,
        COUNT(DISTINCT m.model) as linked_models,
        COUNT(*) as linked_motorcycles,
        MIN(m.year) || '-' || MAX(m.year) as year_range
      FROM motorcycles m
      WHERE m.cleaned_spec_id IS NOT NULL
      GROUP BY m.make
      ORDER BY linked_motorcycles DESC
      LIMIT 20
    `);
    
    report += '## Successfully Linked Motorcycles\n\n';
    report += '| Manufacturer | Linked Models | Linked Motorcycles | Year Range |\n';
    report += '|--------------|---------------|-------------------|------------|\n';
    
    successfulLinks.rows.forEach(row => {
      report += `| ${row.make} | ${row.linked_models} | ${row.linked_motorcycles} | ${row.year_range} |\n`;
    });
    
    // Save report
    const filename = 'motorcycle_specs_linkage_report.md';
    writeFileSync(filename, report);
    console.log(`\nReport saved to: ${filename}`);
    
    // Also output key statistics to console
    console.log('\n=== Key Statistics ===');
    console.log(`Total motorcycles: ${stats.total_motorcycles.toLocaleString()}`);
    console.log(`Linked: ${stats.linked_motorcycles.toLocaleString()} (${linkageRate}%)`);
    console.log(`Orphaned specs: ${(stats.total_specs - stats.used_specs).toLocaleString()} (${(100 - parseFloat(specUsageRate)).toFixed(2)}%)`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Generate the report
generateSpecLinkageReport();