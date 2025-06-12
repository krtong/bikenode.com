#!/usr/bin/env node

import pkg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

class BikezToMotorcycleLinker {
    constructor() {
        this.client = new Client(config);
    }

    async connect() {
        await this.client.connect();
        console.log('✅ Connected to database');
    }

    async disconnect() {
        await this.client.end();
        console.log('✅ Disconnected from database');
    }

    // Parse the scraped data to extract key fields
    parseScrapedData(scrapedData) {
        const parsed = {
            make: null,
            model: null,
            year: null,
            displacement: null,
            power: null,
            category: null
        };

        // Extract from title (e.g., "CF Moto Leader 150 2015")
        if (scrapedData.title) {
            const titleParts = scrapedData.title.split(' ');
            const yearMatch = scrapedData.title.match(/\b(19|20)\d{2}\b/);
            
            if (yearMatch) {
                parsed.year = parseInt(yearMatch[0]);
            }
            
            // For CF Moto, the make is "CF Moto"
            if (scrapedData.title.includes('CF Moto')) {
                parsed.make = 'CF Moto';
                parsed.model = scrapedData.title.replace('CF Moto', '').replace(yearMatch?.[0] || '', '').trim();
            }
        }

        // Also check specs
        if (scrapedData.specs) {
            parsed.year = parsed.year || parseInt(scrapedData.specs['Model year']);
            parsed.category = scrapedData.specs['Category'];
            
            // Parse displacement
            const dispMatch = scrapedData.specs['Displacement']?.match(/(\d+\.?\d*)/);
            if (dispMatch) {
                parsed.displacement = parseFloat(dispMatch[1]);
            }
            
            // Parse power
            const powerMatch = scrapedData.specs['Power output']?.match(/(\d+\.?\d*)\s*HP/);
            if (powerMatch) {
                parsed.power = parseFloat(powerMatch[1]);
            }
        }

        return parsed;
    }

    // Find matching motorcycles in the database
    async findMatches(parsedData) {
        console.log('\n🔍 Searching for matches with:', parsedData);
        
        // Try different matching strategies
        const matches = [];

        // Strategy 1: Exact match on make, model, year
        if (parsedData.make && parsedData.model && parsedData.year) {
            const exactMatch = await this.client.query(`
                SELECT id, make, model, year, category, engine
                FROM motorcycles
                WHERE 
                    LOWER(make) = LOWER($1) AND
                    LOWER(model) = LOWER($2) AND
                    year = $3
            `, [parsedData.make, parsedData.model, parsedData.year]);
            
            if (exactMatch.rows.length > 0) {
                matches.push(...exactMatch.rows.map(r => ({ ...r, match_type: 'exact' })));
            }
        }

        // Strategy 2: Fuzzy match on model (handle variations)
        if (parsedData.make && parsedData.model && parsedData.year && matches.length === 0) {
            // Try different variations of the model name
            const modelVariations = [
                parsedData.model,
                parsedData.model.replace(/\s+/g, ''),  // Remove spaces
                parsedData.model.replace(/\s+/g, ' '), // Normalize spaces
                parsedData.model.replace(/(\d+)/, ' $1 '), // Add spaces around numbers
            ];

            for (const modelVar of modelVariations) {
                const fuzzyMatch = await this.client.query(`
                    SELECT id, make, model, year, category, engine
                    FROM motorcycles
                    WHERE 
                        (LOWER(make) = LOWER($1) OR 
                         LOWER(make) = LOWER($2) OR
                         LOWER(make) = 'cf' OR
                         LOWER(make) = 'cfmoto') AND
                        (LOWER(model) LIKE '%' || LOWER($3) || '%' OR
                         LOWER($3) LIKE '%' || LOWER(model) || '%' OR
                         LOWER(REPLACE(model, ' ', '')) = LOWER(REPLACE($3, ' ', ''))) AND
                        year = $4
                `, ['CF Moto', 'CFMoto', modelVar, parsedData.year]);
                
                if (fuzzyMatch.rows.length > 0) {
                    matches.push(...fuzzyMatch.rows.map(r => ({ ...r, match_type: 'fuzzy' })));
                    break;
                }
            }
        }

        // Strategy 3: Check by year and displacement
        if (parsedData.year && parsedData.displacement && matches.length === 0) {
            const dispMatch = await this.client.query(`
                SELECT id, make, model, year, category, engine
                FROM motorcycles
                WHERE 
                    year = $1 AND
                    engine LIKE '%' || $2 || '%'
                LIMIT 10
            `, [parsedData.year, Math.round(parsedData.displacement).toString()]);
            
            if (dispMatch.rows.length > 0) {
                matches.push(...dispMatch.rows.map(r => ({ ...r, match_type: 'displacement' })));
            }
        }

        return matches;
    }

    // Link the scraped data to a motorcycle
    async linkToMotorcycle(scrapedDataFile, motorcycleId = null) {
        try {
            // Read scraped data
            const scrapedData = JSON.parse(fs.readFileSync(scrapedDataFile, 'utf8'));
            console.log('\n📋 Loaded scraped data:', scrapedData.title);

            // Parse the data
            const parsed = this.parseScrapedData(scrapedData);
            
            // Find matches if no motorcycle ID provided
            if (!motorcycleId) {
                const matches = await this.findMatches(parsed);
                
                if (matches.length === 0) {
                    console.log('\n❌ No matching motorcycles found');
                    return null;
                }

                console.log(`\n📊 Found ${matches.length} potential matches:\n`);
                matches.forEach((match, i) => {
                    console.log(`${i + 1}. [${match.match_type}] ${match.year} ${match.make} ${match.model}`);
                    console.log(`   ID: ${match.id}`);
                    console.log(`   Category: ${match.category || 'N/A'}`);
                    console.log(`   Engine: ${match.engine || 'N/A'}\n`);
                });

                // If only one match, use it
                if (matches.length === 1) {
                    motorcycleId = matches[0].id;
                    console.log(`✅ Using single match: ${motorcycleId}`);
                } else {
                    console.log('❓ Multiple matches found. Please specify motorcycle ID to link.');
                    return matches;
                }
            }

            // Store the scraped specs in a new table or update existing
            await this.storeScrapedSpecs(motorcycleId, scrapedData);
            
            return motorcycleId;

        } catch (error) {
            console.error('❌ Error:', error);
            throw error;
        }
    }

    // Store scraped specs
    async storeScrapedSpecs(motorcycleId, scrapedData) {
        try {
            // First check if we have a bikez_specs table, if not create it
            const tableExists = await this.client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'bikez_specs'
                )
            `);

            if (!tableExists.rows[0].exists) {
                console.log('📦 Creating bikez_specs table...');
                await this.client.query(`
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
                
                await this.client.query(`
                    CREATE INDEX idx_bikez_specs_motorcycle_id ON bikez_specs(motorcycle_id);
                `);
            }

            // Insert or update the scraped data
            const result = await this.client.query(`
                INSERT INTO bikez_specs (motorcycle_id, title, specs, images, source_url)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (motorcycle_id) 
                DO UPDATE SET 
                    title = EXCLUDED.title,
                    specs = EXCLUDED.specs,
                    images = EXCLUDED.images,
                    source_url = EXCLUDED.source_url,
                    updated_at = NOW()
                RETURNING id
            `, [
                motorcycleId,
                scrapedData.title,
                JSON.stringify(scrapedData.specs),
                scrapedData.images || [],
                scrapedData.url || null
            ]);

            console.log(`\n✅ Specs stored with ID: ${result.rows[0].id}`);
            
            // Update the motorcycle's cleaned_spec_id if needed
            await this.client.query(`
                UPDATE motorcycles 
                SET updated_at = NOW()
                WHERE id = $1
            `, [motorcycleId]);

            return result.rows[0].id;

        } catch (error) {
            console.error('❌ Error storing specs:', error);
            throw error;
        }
    }

    // Search for CF Moto motorcycles in the database
    async searchCFMoto() {
        console.log('\n🔍 Searching for CF Moto motorcycles in database...\n');
        
        const results = await this.client.query(`
            SELECT id, make, model, year, category, engine
            FROM motorcycles
            WHERE 
                LOWER(make) LIKE '%cf%' OR
                LOWER(make) LIKE '%moto%' OR
                LOWER(model) LIKE '%leader%' OR
                LOWER(model) LIKE '%150%'
            ORDER BY make, year DESC, model
            LIMIT 20
        `);

        if (results.rows.length > 0) {
            console.log('Found motorcycles:');
            results.rows.forEach(row => {
                console.log(`- ${row.year} ${row.make} ${row.model} (ID: ${row.id})`);
            });
        } else {
            console.log('No CF Moto or similar motorcycles found');
        }

        return results.rows;
    }
}

// Main execution
async function main() {
    const linker = new BikezToMotorcycleLinker();
    
    try {
        await linker.connect();
        
        // Search for CF Moto motorcycles first
        console.log('🏍️  BikeZ to Motorcycle Linker\n');
        await linker.searchCFMoto();
        
        // Try to link the scraped data
        const scrapedFile = process.argv[2] || 'test_archive_scrape.json';
        const motorcycleId = process.argv[3] || null;
        
        console.log(`\n📄 Processing scraped file: ${scrapedFile}`);
        await linker.linkToMotorcycle(scrapedFile, motorcycleId);
        
    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        await linker.disconnect();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default BikezToMotorcycleLinker;