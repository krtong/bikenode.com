import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function fixMalformedYears() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Find the malformed entries
    const malformed = await client.query(`
      SELECT 
        id,
        manufacturer,
        model,
        specifications->>'Year' as year_string
      FROM motorcycle_specs
      WHERE 
        (manufacturer = 'KYMCO' AND model = 'KR Sport / Quannon' AND specifications->>'Year' = '200 7 -08') OR
        (manufacturer = 'Vespa' AND model = 'P80' AND specifications->>'Year' = '198 1 -93')
    `);
    
    console.log(`Found ${malformed.rows.length} malformed entries to fix:\n`);
    
    for (const spec of malformed.rows) {
      console.log(`${spec.manufacturer} ${spec.model}: "${spec.year_string}"`);
      
      // Fix the year string in the JSONB
      let fixedYear;
      if (spec.year_string === '200 7 -08') {
        fixedYear = '2007 - 08';
      } else if (spec.year_string === '198 1 -93') {
        fixedYear = '1981 - 93';
      }
      
      if (fixedYear) {
        await client.query(`
          UPDATE motorcycle_specs
          SET 
            specifications = jsonb_set(specifications, '{Year}', to_jsonb($1)),
            updated_at = NOW()
          WHERE id = $2
        `, [fixedYear, spec.id]);
        
        console.log(`  Fixed to: "${fixedYear}"`);
      }
    }
    
    console.log('\n✓ Malformed years fixed!');
    
    // Now add these to the cleaned table
    console.log('\nAdding fixed entries to cleaned table...');
    
    const fixedSpecs = await client.query(`
      SELECT 
        id,
        manufacturer,
        model,
        year,
        title,
        description,
        content,
        url,
        scraped_at,
        specifications,
        specifications->>'Year' as year_string
      FROM motorcycle_specs
      WHERE 
        (manufacturer = 'KYMCO' AND model = 'KR Sport / Quannon') OR
        (manufacturer = 'Vespa' AND model = 'P80')
    `);
    
    for (const spec of fixedSpecs.rows) {
      // Parse the fixed year
      const yearMatch = spec.year_string.match(/(\d{4})\s*-\s*(\d{2})/);
      if (yearMatch) {
        const startYear = parseInt(yearMatch[1]);
        const endYear = parseInt(yearMatch[1].substring(0, 2) + yearMatch[2]);
        
        for (let year = startYear; year <= endYear; year++) {
          const updatedSpecs = {
            ...spec.specifications,
            Year: year.toString(),
            Original_Year: spec.year_string
          };
          
          await client.query(`
            INSERT INTO motorcycle_specs_cleaned (
              original_spec_id, manufacturer, model, variant, year,
              title, description, content, url, scraped_at,
              specifications, year_invariant, original_year_string
            ) VALUES (
              $1, $2, $3, NULL, $4,
              $5, $6, $7, $8, $9,
              $10, FALSE, $11
            )
          `, [
            spec.id, spec.manufacturer, spec.model, year,
            spec.title, spec.description, spec.content, spec.url, spec.scraped_at,
            updatedSpecs, spec.year_string
          ]);
        }
        
        console.log(`  Added ${spec.manufacturer} ${spec.model}: ${endYear - startYear + 1} years`);
      }
    }
    
    console.log('\n✓ Fixed entries added to cleaned table!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

fixMalformedYears();