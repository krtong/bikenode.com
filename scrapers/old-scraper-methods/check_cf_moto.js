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

async function checkCFMoto() {
    const client = new Client(config);
    
    try {
        await client.connect();
        console.log('✅ Connected to database\n');
        
        // Check CF Moto Leader 150
        const cfMoto = await client.query(`
            SELECT id, make, model, year, category, engine, cleaned_spec_id
            FROM motorcycles
            WHERE id = '7cf45ac6-3563-5919-8916-67afd3a89a45'
        `);
        
        if (cfMoto.rows.length > 0) {
            console.log('Found CF Moto Leader 150:');
            console.log(cfMoto.rows[0]);
            console.log('\nCleaned spec ID:', cfMoto.rows[0].cleaned_spec_id || 'None');
        }
        
        // Drop and recreate bikez_specs table
        console.log('\n📦 Setting up bikez_specs table...');
        await client.query('DROP TABLE IF EXISTS bikez_specs CASCADE');
        
        await client.query(`
            CREATE TABLE bikez_specs (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                motorcycle_id UUID REFERENCES motorcycles(id) UNIQUE,
                source_url TEXT,
                title TEXT,
                specs JSONB,
                images TEXT[],
                scraped_at TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        console.log('✅ Table created successfully');
        
        // Now insert the scraped data
        const scrapedData = {
            title: "CF Moto Leader 150 2015",
            specs: {
                "Model": "CF Moto Leader 150",
                "Model year": "2015",
                "Category": "Allround",
                "Displacement": "149.4 ccm (9.12 cubic inches)",
                "Engine type": "Single cylinder, four-stroke",
                "Power output": "14.1 HP (10.3  kW)) @ 9000 RPM",
                "Torque": "12.2 Nm (1.2 kgf-m or 9.0 ft.lbs) @ 6500 RPM",
                "Top speed": "100.0 km/h (62.1 mph)",
                "Fuel consumption": "2.20 litres/100 km (45.5 km/l or 106.92 mpg)",
                "Weight incl. oil, gas, etc": "128.0 kg (282.2 pounds)",
                "Seat height": "760 mm (29.9 inches)",
                "Fuel capacity": "16.50 litres (4.36 US gallons)"
            },
            images: ["https://bikez.com/pictures/cf%20moto/2015/leader%20150.jpg"]
        };
        
        const result = await client.query(`
            INSERT INTO bikez_specs (motorcycle_id, title, specs, images, source_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [
            '7cf45ac6-3563-5919-8916-67afd3a89a45',
            scrapedData.title,
            JSON.stringify(scrapedData.specs),
            scrapedData.images,
            'https://web.archive.org/web/20241107124610/https://bikez.com/motorcycles/cf_moto_leader_150_2015.php'
        ]);
        
        console.log(`\n✅ Specs inserted with ID: ${result.rows[0].id}`);
        
        // Verify the link
        const verify = await client.query(`
            SELECT 
                m.id, m.make, m.model, m.year,
                bs.title, bs.source_url,
                jsonb_pretty(bs.specs) as specs
            FROM motorcycles m
            JOIN bikez_specs bs ON bs.motorcycle_id = m.id
            WHERE m.id = '7cf45ac6-3563-5919-8916-67afd3a89a45'
        `);
        
        console.log('\n📊 Verified linkage:');
        console.log('Motorcycle:', verify.rows[0].make, verify.rows[0].model, verify.rows[0].year);
        console.log('Bikez Title:', verify.rows[0].title);
        console.log('Source:', verify.rows[0].source_url);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.end();
        console.log('\n✅ Disconnected from database');
    }
}

checkCFMoto();