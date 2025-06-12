#!/usr/bin/env node

import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function addBikezToExistingSpecs() {
    const client = new Client(config);
    
    try {
        await client.connect();
        console.log('✅ Connected to database\n');
        
        // Check if we already have specs for this motorcycle
        const existingSpecs = await client.query(`
            SELECT * FROM motorcycle_specs_cleaned
            WHERE manufacturer = 'CF Moto' 
            AND model = 'Leader 150'
            AND year = 2015
        `);
        
        console.log(`Found ${existingSpecs.rows.length} existing specs for CF Moto Leader 150 2015`);
        
        // The scraped data from bikez
        const bikezData = {
            "Model": "CF Moto Leader 150",
            "Model year": "2015",
            "Category": "Allround",
            "Displacement": "149.4 ccm (9.12 cubic inches)",
            "Engine type": "Single cylinder, four-stroke",
            "Power output": "14.1 HP (10.3  kW)) @ 9000 RPM",
            "Torque": "12.2 Nm (1.2 kgf-m or 9.0 ft.lbs) @ 6500 RPM",
            "Top speed": "100.0 km/h (62.1 mph)",
            "Compression": "10.5:1",
            "Bore x stroke": "57.0 x 58.0 mm (2.2 x 2.3 inches)",
            "Fuel system": "Injection. EFI",
            "Cooling system": "Liquid",
            "Gearbox": "6-speed",
            "Transmission type": "Chain  (final drive)",
            "Fuel consumption": "2.20 litres/100 km (45.5 km/l or 106.92 mpg)",
            "Front suspension": "Telescopic Fork",
            "Rear suspension": "Swingarrm",
            "Front tire": "2.75-18",
            "Rear tire": "3.25-18",
            "Front brakes": "Single disc",
            "Rear brakes": "Expanding brake (drum brake)",
            "Weight incl. oil, gas, etc": "128.0 kg (282.2 pounds)",
            "Seat height": "760 mm (29.9 inches)",
            "Overall height": "1170 mm (46.1 inches)",
            "Overall length": "2040 mm (80.3 inches)",
            "Overall width": "750 mm (29.5 inches)",
            "Ground clearance": "170 mm (6.7 inches)",
            "Wheelbase": "1280 mm (50.4 inches)",
            "Fuel capacity": "16.50 litres (4.36 US gallons)",
            "Color options": "Orange, Blue, Red, Titanium",
            "Starter": "Electric"
        };
        
        if (existingSpecs.rows.length > 0) {
            // Update existing spec with bikez data
            const specId = existingSpecs.rows[0].id;
            console.log(`\nUpdating existing spec ID: ${specId}`);
            
            await client.query(`
                UPDATE motorcycle_specs_cleaned
                SET 
                    spec_data = spec_data || $1::jsonb,
                    updated_at = NOW()
                WHERE id = $2
            `, [JSON.stringify({ bikez: bikezData }), specId]);
            
            console.log('✅ Updated existing spec with bikez data');
            
        } else {
            // Create new spec entry
            console.log('\nCreating new spec entry...');
            
            const result = await client.query(`
                INSERT INTO motorcycle_specs_cleaned 
                (manufacturer, model, year, variant, spec_data, year_invariant, original_year_string)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `, [
                'CF Moto',
                'Leader 150', 
                2015,
                null,
                JSON.stringify({ bikez: bikezData }),
                false,
                '2015'
            ]);
            
            console.log(`✅ Created new spec with ID: ${result.rows[0].id}`);
        }
        
        // Now link it to the motorcycle
        const motorcycleId = '7cf45ac6-3563-5919-8916-67afd3a89a45';
        
        // Get the spec ID to link
        const specToLink = await client.query(`
            SELECT id FROM motorcycle_specs_cleaned
            WHERE manufacturer = 'CF Moto' 
            AND model = 'Leader 150'
            AND year = 2015
            LIMIT 1
        `);
        
        if (specToLink.rows.length > 0) {
            await client.query(`
                UPDATE motorcycles
                SET cleaned_spec_id = $1
                WHERE id = $2
            `, [specToLink.rows[0].id, motorcycleId]);
            
            console.log(`\n✅ Linked motorcycle ${motorcycleId} to spec ${specToLink.rows[0].id}`);
        }
        
        // Verify the linkage
        const verify = await client.query(`
            SELECT 
                m.id, m.make, m.model, m.year,
                msc.manufacturer, msc.model as spec_model,
                jsonb_pretty(msc.spec_data) as spec_data
            FROM motorcycles m
            JOIN motorcycle_specs_cleaned msc ON m.cleaned_spec_id = msc.id
            WHERE m.id = $1
        `, [motorcycleId]);
        
        if (verify.rows.length > 0) {
            console.log('\n📊 Verification:');
            console.log(`Motorcycle: ${verify.rows[0].make} ${verify.rows[0].model} ${verify.rows[0].year}`);
            console.log(`Linked to spec: ${verify.rows[0].manufacturer} ${verify.rows[0].spec_model}`);
            console.log('\nSpec data:', verify.rows[0].spec_data);
        }
        
        // Clean up the unnecessary bikez_specs table
        await client.query('DROP TABLE IF EXISTS bikez_specs CASCADE');
        console.log('\n🧹 Cleaned up unnecessary bikez_specs table');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.end();
        console.log('\n✅ Disconnected from database');
    }
}

addBikezToExistingSpecs();