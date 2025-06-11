#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function analyzeSpecifications() {
    const specFieldsMap = new Map();
    const specValuesMap = new Map();
    const dataDir = './scraped_data/motorcycles';
    
    try {
        // Read all JSON files in the directory
        const files = await fs.readdir(dataDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        console.log(`Found ${jsonFiles.length} data files to analyze\n`);
        
        let totalMotorcycles = 0;
        
        for (const file of jsonFiles) {
            const filePath = path.join(dataDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            
            if (data.motorcycles) {
                totalMotorcycles += data.motorcycles.length;
                
                for (const motorcycle of data.motorcycles) {
                    if (motorcycle.specifications) {
                        for (const [key, value] of Object.entries(motorcycle.specifications)) {
                            // Count occurrences of each specification field
                            specFieldsMap.set(key, (specFieldsMap.get(key) || 0) + 1);
                            
                            // Collect sample values for each field
                            if (!specValuesMap.has(key)) {
                                specValuesMap.set(key, new Set());
                            }
                            specValuesMap.get(key).add(value);
                        }
                    }
                }
            }
        }
        
        console.log(`Analyzed ${totalMotorcycles} motorcycles\n`);
        
        // Sort fields by frequency
        const sortedFields = Array.from(specFieldsMap.entries())
            .sort((a, b) => b[1] - a[1]);
        
        console.log('=== SPECIFICATION FIELDS BY FREQUENCY ===\n');
        
        for (const [field, count] of sortedFields) {
            const percentage = ((count / totalMotorcycles) * 100).toFixed(1);
            const sampleValues = Array.from(specValuesMap.get(field)).slice(0, 3);
            
            console.log(`${field}: ${count} occurrences (${percentage}%)`);
            console.log(`  Sample values: ${sampleValues.join(' | ')}`);
            console.log();
        }
        
        // Generate schema
        console.log('\n=== PROPOSED SCHEMA ===\n');
        
        const schema = {
            // Core identification
            manufacturer: 'string',
            model: 'string', 
            year: 'number',
            
            // Engine specifications
            engine: {
                type: 'string', // e.g., "Single cylinder, 4-stroke, DOHC"
                capacity: 'string', // e.g., "652 cc / 39.8 cu in"
                bore_stroke: 'string', // e.g., "100 x 83 mm"
                compression_ratio: 'string', // e.g., "11.5:1"
                cooling_system: 'string', // e.g., "Liquid cooled"
                valves: 'string',
                fuel_system: 'string', // Induction/Injection
                ignition: 'string',
                starting: 'string', // Electric/Kick
                lubrication: 'string'
            },
            
            // Performance
            performance: {
                max_power: 'string', // e.g., "37.3 kW / 50 hp @ 6800 rpm"
                max_torque: 'string', // e.g., "62.3 Nm @ 5500 rpm"
                top_speed: 'string',
                fuel_consumption: 'string'
            },
            
            // Transmission
            transmission: {
                gearbox: 'string', // e.g., "5 Speed"
                clutch: 'string',
                final_drive: 'string' // Belt/Chain/Shaft
            },
            
            // Suspension & Brakes
            suspension: {
                front: 'string',
                rear: 'string'
            },
            
            brakes: {
                front: 'string',
                rear: 'string'
            },
            
            // Wheels & Tires
            wheels: {
                front_tire: 'string',
                rear_tire: 'string',
                front_wheel: 'string',
                rear_wheel: 'string'
            },
            
            // Dimensions & Weight
            dimensions: {
                overall_length: 'string',
                overall_width: 'string', 
                overall_height: 'string',
                seat_height: 'string',
                wheelbase: 'string',
                ground_clearance: 'string',
                trail: 'string',
                rake: 'string'
            },
            
            weight: {
                wet_weight: 'string', // e.g., "189 kg / 417 lbs"
                dry_weight: 'string',
                weight_incl_oil: 'string',
                payload: 'string'
            },
            
            // Capacity
            capacity: {
                fuel_capacity: 'string', // e.g., "15 Litres / 4.0 US gal"
                oil_capacity: 'string',
                reserve: 'string'
            },
            
            // Additional info
            electrical: {
                alternator: 'string',
                battery: 'string',
                headlight: 'string'
            },
            
            equipment: {
                instruments: 'string',
                fairing: 'string',
                exhaust: 'string',
                seat: 'string'
            },
            
            // Metadata
            url: 'string',
            scraped_at: 'string',
            images: 'array',
            content: 'string',
            metadata: 'object'
        };
        
        console.log(JSON.stringify(schema, null, 2));
        
        // Save analysis results
        const analysisResults = {
            totalMotorcycles,
            totalFields: specFieldsMap.size,
            fieldFrequency: Object.fromEntries(sortedFields),
            proposedSchema: schema,
            analyzedAt: new Date().toISOString()
        };
        
        await fs.writeFile(
            './scraped_data/motorcycle_specs_analysis.json',
            JSON.stringify(analysisResults, null, 2)
        );
        
        console.log('\n✅ Analysis saved to ./scraped_data/motorcycle_specs_analysis.json');
        
    } catch (error) {
        console.error('Error analyzing specifications:', error);
    }
}

// Run the analysis
analyzeSpecifications();