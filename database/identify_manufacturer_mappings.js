import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function identifyManufacturerMappings() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Get all unique manufacturers from both tables
    const motorcycleMakes = await client.query(`
      SELECT DISTINCT make, COUNT(*) as count
      FROM motorcycles
      GROUP BY make
      ORDER BY make
    `);
    
    const specManufacturers = await client.query(`
      SELECT DISTINCT manufacturer, COUNT(*) as count
      FROM motorcycle_specs_cleaned
      GROUP BY manufacturer
      ORDER BY manufacturer
    `);
    
    // Create sets for quick lookup
    const makesSet = new Set(motorcycleMakes.rows.map(r => r.make.toLowerCase()));
    const specsSet = new Set(specManufacturers.rows.map(r => r.manufacturer.toLowerCase()));
    
    console.log('=== Potential Manufacturer Mappings ===\n');
    console.log('Motorcycle Make → Spec Manufacturer | Motorcycle Count | Spec Count\n');
    
    // Find potential mappings
    const mappings = [];
    
    // Check for exact matches first
    motorcycleMakes.rows.forEach(mRow => {
      specManufacturers.rows.forEach(sRow => {
        const makeLower = mRow.make.toLowerCase();
        const specLower = sRow.manufacturer.toLowerCase();
        
        // Skip if already exact match
        if (makeLower === specLower) return;
        
        let confidence = 0;
        let reason = '';
        
        // Check if one contains the other
        if (specLower.includes(makeLower) || makeLower.includes(specLower)) {
          confidence = 0.8;
          reason = 'substring match';
        }
        
        // Check specific known patterns
        if (mRow.make === 'Moto' && sRow.manufacturer === 'Moto Guzzi') {
          confidence = 0.95;
          reason = 'known pattern';
        } else if (mRow.make === 'GAS' && sRow.manufacturer === 'GASGAS') {
          confidence = 0.95;
          reason = 'known pattern';
        } else if (mRow.make === 'MV' && sRow.manufacturer === 'MV Agusta') {
          confidence = 0.95;
          reason = 'known pattern';
        } else if (mRow.make === 'Enfield' && sRow.manufacturer === 'Royal Enfield') {
          confidence = 0.95;
          reason = 'known pattern';
        } else if (mRow.make === 'Arctic' && sRow.manufacturer === 'Arctic Cat') {
          confidence = 0.9;
          reason = 'known pattern';
        } else if (mRow.make === 'Chang-Jiang' && sRow.manufacturer === 'Chang Jiang') {
          confidence = 0.95;
          reason = 'hyphen variation';
        } else if (mRow.make === 'Big' && sRow.manufacturer.includes('Big Bear')) {
          confidence = 0.9;
          reason = 'partial match';
        }
        
        // Check for hyphen/space variations
        if (makeLower.replace(/[-\s]/g, '') === specLower.replace(/[-\s]/g, '') && confidence === 0) {
          confidence = 0.9;
          reason = 'punctuation variation';
        }
        
        // Check for case variations
        if (mRow.make.toLowerCase() === sRow.manufacturer.toLowerCase() && confidence === 0) {
          confidence = 0.95;
          reason = 'case variation';
        }
        
        if (confidence > 0.7) {
          mappings.push({
            motorcycleMake: mRow.make,
            specManufacturer: sRow.manufacturer,
            motorcycleCount: mRow.count,
            specCount: sRow.count,
            confidence,
            reason
          });
        }
      });
    });
    
    // Sort by confidence and motorcycle count
    mappings.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return b.motorcycleCount - a.motorcycleCount;
    });
    
    // Display mappings
    mappings.forEach(m => {
      console.log(`${m.motorcycleMake} → ${m.specManufacturer} | ${m.motorcycleCount} | ${m.specCount} | ${(m.confidence * 100).toFixed(0)}% (${m.reason})`);
    });
    
    // Show manufacturers without matches
    console.log('\n\n=== Motorcycles Makes Without Spec Matches ===\n');
    
    motorcycleMakes.rows.forEach(row => {
      if (!specsSet.has(row.make.toLowerCase()) && !mappings.find(m => m.motorcycleMake === row.make)) {
        console.log(`${row.make} (${row.count} motorcycles)`);
      }
    });
    
    console.log('\n\n=== Spec Manufacturers Without Motorcycle Matches ===\n');
    
    specManufacturers.rows.forEach(row => {
      if (!makesSet.has(row.manufacturer.toLowerCase()) && !mappings.find(m => m.specManufacturer === row.manufacturer)) {
        console.log(`${row.manufacturer} (${row.count} specs)`);
      }
    });
    
    // Test a few mappings to see how many would link
    console.log('\n\n=== Testing Potential Links ===\n');
    
    for (const mapping of mappings.slice(0, 5)) {
      const testResult = await client.query(`
        SELECT COUNT(DISTINCT m.id) as potential_links
        FROM motorcycles m
        JOIN motorcycle_specs_cleaned msc ON 
          m.make = $1 AND
          LOWER(msc.manufacturer) = LOWER($2) AND
          LOWER(m.model) = LOWER(msc.model) AND
          m.year = msc.year
        WHERE m.cleaned_spec_id IS NULL
      `, [mapping.motorcycleMake, mapping.specManufacturer]);
      
      console.log(`${mapping.motorcycleMake} → ${mapping.specManufacturer}: ${testResult.rows[0].potential_links} potential links`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the analysis
identifyManufacturerMappings();