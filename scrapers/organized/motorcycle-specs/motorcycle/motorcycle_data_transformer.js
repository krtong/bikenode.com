#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class MotorcycleDataTransformer {
    constructor() {
        this.normalizedData = [];
        this.fieldMappings = {
            // Engine mappings
            'Engine': 'engine.type',
            'Engine Type': 'engine.type',
            'Capacity': 'engine.capacity',
            'Displacement': 'engine.capacity',
            'Bore x Stroke': 'engine.bore_stroke',
            'Bore and Stroke': 'engine.bore_stroke',
            'Compression Ratio': 'engine.compression_ratio',
            'Compression': 'engine.compression_ratio',
            'Cooling System': 'engine.cooling_system',
            'Cooling': 'engine.cooling_system',
            'Induction': 'engine.fuel_system',
            'Fuel System': 'engine.fuel_system',
            'Carburetion': 'engine.fuel_system',
            'Fuel Injection': 'engine.fuel_system',
            'Ignition': 'engine.ignition',
            'Starting': 'engine.starting',
            'Start': 'engine.starting',
            'Starter': 'engine.starting',
            'Lubrication': 'engine.lubrication',
            'Oil System': 'engine.lubrication',
            'Valves': 'engine.valves',
            'Valves per Cylinder': 'engine.valves',
            
            // Performance mappings
            'Max Power': 'performance.max_power',
            'Maximum Power': 'performance.max_power',
            'Power': 'performance.max_power',
            'Max Torque': 'performance.max_torque',
            'Maximum Torque': 'performance.max_torque',
            'Torque': 'performance.max_torque',
            'Top Speed': 'performance.top_speed',
            'Maximum Speed': 'performance.top_speed',
            'Fuel Consumption': 'performance.fuel_consumption',
            'Economy': 'performance.fuel_consumption',
            'Range': 'performance.range',
            
            // Transmission mappings
            'Transmission': 'transmission.gearbox',
            'Gearbox': 'transmission.gearbox',
            'Gears': 'transmission.gearbox',
            'Final Drive': 'transmission.final_drive',
            'Drive': 'transmission.final_drive',
            'Secondary Drive': 'transmission.final_drive',
            'Clutch': 'transmission.clutch',
            'Primary Drive': 'transmission.primary_drive',
            
            // Suspension mappings
            'Front Suspension': 'suspension.front',
            'Front Forks': 'suspension.front',
            'Front': 'suspension.front',
            'Rear Suspension': 'suspension.rear',
            'Rear Shock': 'suspension.rear',
            'Rear': 'suspension.rear',
            'Front Wheel Travel': 'suspension.front_travel',
            'Rear Wheel Travel': 'suspension.rear_travel',
            
            // Brakes mappings
            'Front Brakes': 'brakes.front',
            'Front Brake': 'brakes.front',
            'Rear Brakes': 'brakes.rear',
            'Rear Brake': 'brakes.rear',
            'ABS': 'brakes.abs',
            
            // Wheels & Tires mappings
            'Front Tyre': 'wheels.front_tire',
            'Front Tire': 'wheels.front_tire',
            'Rear Tyre': 'wheels.rear_tire',
            'Rear Tire': 'wheels.rear_tire',
            'Front Wheel': 'wheels.front_wheel',
            'Rear Wheel': 'wheels.rear_wheel',
            'Front Rim': 'wheels.front_wheel',
            'Rear Rim': 'wheels.rear_wheel',
            
            // Dimensions mappings
            'Overall Length': 'dimensions.overall_length',
            'Length': 'dimensions.overall_length',
            'Overall Width': 'dimensions.overall_width',
            'Width': 'dimensions.overall_width',
            'Overall Height': 'dimensions.overall_height',
            'Height': 'dimensions.overall_height',
            'Seat Height': 'dimensions.seat_height',
            'Saddle Height': 'dimensions.seat_height',
            'Wheelbase': 'dimensions.wheelbase',
            'Ground Clearance': 'dimensions.ground_clearance',
            'Trail': 'dimensions.trail',
            'Rake': 'dimensions.rake',
            'Steering Angle': 'dimensions.rake',
            
            // Weight mappings
            'Wet Weight': 'weight.wet_weight',
            'Wet-Weight': 'weight.wet_weight',
            'Curb Weight': 'weight.wet_weight',
            'Dry Weight': 'weight.dry_weight',
            'Dry-Weight': 'weight.dry_weight',
            'Weight Incl Oil': 'weight.weight_incl_oil',
            'Payload': 'weight.payload',
            'Carrying Capacity': 'weight.payload',
            
            // Capacity mappings
            'Fuel Capacity': 'capacity.fuel_capacity',
            'Tank Capacity': 'capacity.fuel_capacity',
            'Fuel Tank': 'capacity.fuel_capacity',
            'Oil Capacity': 'capacity.oil_capacity',
            'Reserve': 'capacity.reserve',
            'Fuel Reserve': 'capacity.reserve',
            
            // Electrical mappings
            'Alternator': 'electrical.alternator',
            'Generator': 'electrical.alternator',
            'Battery': 'electrical.battery',
            'Headlight': 'electrical.headlight',
            'Headlamp': 'electrical.headlight',
            
            // Basic info mappings
            'Make Model': 'model',
            'Model': 'model',
            'Year': 'year',
            'Category': 'category',
            'Class': 'category'
        };
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    getNestedValue(obj, path) {
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (!current[key]) return null;
            current = current[key];
        }
        
        return current;
    }

    normalizeSpecifications(rawSpecs) {
        const normalized = {
            engine: {},
            performance: {},
            transmission: {},
            suspension: {},
            brakes: {},
            wheels: {},
            dimensions: {},
            weight: {},
            capacity: {},
            electrical: {},
            equipment: {}
        };

        // Process each specification
        for (const [key, value] of Object.entries(rawSpecs)) {
            // Skip invalid entries
            if (key.includes('Classic Bikes') || 
                key.includes('Complete Manufacturer List') ||
                key === '.' ||
                value === '(adsbygoogle = window.adsbygoogle || []).push({});') {
                continue;
            }

            // Find matching field mapping
            const mappedPath = this.fieldMappings[key];
            if (mappedPath) {
                this.setNestedValue(normalized, mappedPath, value);
            } else {
                // Store unmapped fields in equipment.other
                if (!normalized.equipment.other) {
                    normalized.equipment.other = {};
                }
                normalized.equipment.other[key] = value;
            }
        }

        return normalized;
    }

    async transformData() {
        const dataDir = './scraped_data/motorcycles';
        
        try {
            const files = await fs.readdir(dataDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            console.log(`🔄 Transforming data from ${jsonFiles.length} files...\n`);
            
            for (const file of jsonFiles) {
                const filePath = path.join(dataDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                const data = JSON.parse(content);
                
                if (data.motorcycles) {
                    for (const motorcycle of data.motorcycles) {
                        const transformed = {
                            // Basic info
                            manufacturer: motorcycle.manufacturer,
                            model: motorcycle.model,
                            year: this.extractYear(motorcycle),
                            
                            // Normalized specifications
                            specifications: this.normalizeSpecifications(motorcycle.specifications || {}),
                            
                            // Additional data
                            images: motorcycle.images || [],
                            url: motorcycle.url,
                            content: motorcycle.content,
                            metadata: motorcycle.metadata || {},
                            scraped_at: motorcycle.scraped_at
                        };
                        
                        this.normalizedData.push(transformed);
                    }
                }
            }
            
            console.log(`✅ Transformed ${this.normalizedData.length} motorcycles\n`);
            
            // Save normalized data
            const outputPath = './scraped_data/motorcycles_normalized.json';
            await fs.writeFile(outputPath, JSON.stringify(this.normalizedData, null, 2));
            
            console.log(`💾 Saved normalized data to ${outputPath}`);
            
            // Generate schema documentation
            await this.generateSchemaDocumentation();
            
        } catch (error) {
            console.error('❌ Error transforming data:', error);
        }
    }

    extractYear(motorcycle) {
        // Try to extract year from specifications
        if (motorcycle.specifications && motorcycle.specifications.Year) {
            const yearStr = motorcycle.specifications.Year;
            const yearMatch = yearStr.match(/\d{4}/);
            if (yearMatch) {
                return parseInt(yearMatch[0]);
            }
        }
        
        // Try to extract from model name
        const modelMatch = motorcycle.model?.match(/\d{4}/);
        if (modelMatch) {
            return parseInt(modelMatch[0]);
        }
        
        return null;
    }

    async generateSchemaDocumentation() {
        const schemaDoc = `# Motorcycle Data Schema

## Overview
This schema represents normalized motorcycle specification data scraped from motorcyclespecs.co.za.

## Schema Structure

### Root Object
- **manufacturer** (string): The motorcycle manufacturer name
- **model** (string): The motorcycle model name  
- **year** (number|null): The model year
- **specifications** (object): Normalized specification data
- **images** (array): Array of image objects
- **url** (string): Source URL
- **content** (string): Additional text content
- **metadata** (object): Page metadata
- **scraped_at** (string): ISO timestamp of when data was scraped

### Specifications Object

#### engine
- **type** (string): Engine configuration (e.g., "Single cylinder, 4-stroke, DOHC")
- **capacity** (string): Engine displacement (e.g., "652 cc / 39.8 cu in")
- **bore_stroke** (string): Bore and stroke measurements (e.g., "100 x 83 mm")
- **compression_ratio** (string): Compression ratio (e.g., "11.5:1")
- **cooling_system** (string): Cooling type (e.g., "Liquid cooled")
- **valves** (string): Valve configuration
- **fuel_system** (string): Fuel delivery system
- **ignition** (string): Ignition system type
- **starting** (string): Starting method (e.g., "Electric")
- **lubrication** (string): Oil system type

#### performance
- **max_power** (string): Maximum power output (e.g., "37.3 kW / 50 hp @ 6800 rpm")
- **max_torque** (string): Maximum torque (e.g., "62.3 Nm @ 5500 rpm")
- **top_speed** (string): Maximum speed
- **fuel_consumption** (string): Fuel economy
- **range** (string): Maximum range

#### transmission
- **gearbox** (string): Number of gears (e.g., "5 Speed")
- **clutch** (string): Clutch type
- **final_drive** (string): Final drive method (e.g., "Belt", "Chain", "Shaft")
- **primary_drive** (string): Primary drive type

#### suspension
- **front** (string): Front suspension description
- **rear** (string): Rear suspension description
- **front_travel** (string): Front suspension travel
- **rear_travel** (string): Rear suspension travel

#### brakes
- **front** (string): Front brake description
- **rear** (string): Rear brake description
- **abs** (string): ABS system info

#### wheels
- **front_tire** (string): Front tire size (e.g., "110/70 ZR17")
- **rear_tire** (string): Rear tire size (e.g., "160/60 ZR17")
- **front_wheel** (string): Front wheel/rim info
- **rear_wheel** (string): Rear wheel/rim info

#### dimensions
- **overall_length** (string): Total length
- **overall_width** (string): Total width
- **overall_height** (string): Total height
- **seat_height** (string): Seat height from ground
- **wheelbase** (string): Distance between wheels
- **ground_clearance** (string): Minimum ground clearance
- **trail** (string): Trail measurement
- **rake** (string): Steering head angle

#### weight
- **wet_weight** (string): Weight with fluids (e.g., "189 kg / 417 lbs")
- **dry_weight** (string): Weight without fluids
- **weight_incl_oil** (string): Weight including oil
- **payload** (string): Maximum carrying capacity

#### capacity
- **fuel_capacity** (string): Fuel tank size (e.g., "15 Litres / 4.0 US gal")
- **oil_capacity** (string): Oil capacity
- **reserve** (string): Reserve fuel amount

#### electrical
- **alternator** (string): Alternator/generator specs
- **battery** (string): Battery specifications
- **headlight** (string): Headlight type/power

#### equipment
- **instruments** (string): Dashboard/instrumentation
- **fairing** (string): Fairing type
- **exhaust** (string): Exhaust system
- **seat** (string): Seat type/configuration
- **other** (object): Additional unmapped specifications

### Image Object
- **url** (string): Image URL
- **alt** (string): Alt text
- **width** (number): Image width
- **height** (number): Image height

## Field Mappings
The transformer automatically maps various field names to the normalized schema:
- "Engine Type" → engine.type
- "Max Power" → performance.max_power
- "Front Brakes" → brakes.front
- etc.

## Usage Example
\`\`\`javascript
const data = require('./scraped_data/motorcycles_normalized.json');

// Access normalized data
const motorcycle = data[0];
console.log(motorcycle.manufacturer); // "AC Schnitzer"
console.log(motorcycle.specifications.engine.capacity); // "652 cc / 39.8 cu in"
console.log(motorcycle.specifications.performance.max_power); // "37.3 kW / 50 hp @ 6800 rpm"
\`\`\`
`;

        await fs.writeFile('./scraped_data/MOTORCYCLE_SCHEMA.md', schemaDoc);
        console.log('📚 Generated schema documentation at ./scraped_data/MOTORCYCLE_SCHEMA.md');
    }
}

// Run the transformer
if (require.main === module) {
    const transformer = new MotorcycleDataTransformer();
    transformer.transformData();
}

module.exports = MotorcycleDataTransformer;