#!/usr/bin/env node

const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, 'database', 'data', 'motorcycles.db');
const CSV_PATH = path.join(__dirname, 'scrapers', 'motorcycle_enhancements_2025-06-04.csv');

// Open database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err);
        process.exit(1);
    }
    console.log('✅ Connected to motorcycles database');
});

// Read and parse CSV
function parseCSV() {
    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = content.split('\n');
    const motorcycles = [];
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            // Handle multi-line entries by combining until we get 6 comma-separated values
            let currentLine = line;
            let j = i + 1;
            
            // Count commas to determine if we have a complete row
            while ((currentLine.match(/,/g) || []).length < 5 && j < lines.length) {
                currentLine += ' ' + lines[j].trim();
                j++;
            }
            
            // Parse the combined line
            const parts = currentLine.split(',');
            if (parts.length >= 6) {
                const [year, make, model, packageVar, category, engine] = parts;
                
                // Clean up the model name (remove extra whitespace and "Starting at")
                let cleanModel = model.replace(/\s+/g, ' ').trim();
                cleanModel = cleanModel.replace(/Starting at.*$/, '').trim();
                
                if (cleanModel && make && year) {
                    motorcycles.push({
                        year: parseInt(year),
                        make: make.trim(),
                        model: cleanModel,
                        package: packageVar ? packageVar.trim() : '',
                        category: category ? category.trim() : '',
                        engine: engine ? engine.trim() : ''
                    });
                }
            }
            
            // Skip the lines we've already processed
            i = j - 1;
        }
    }
    
    return motorcycles;
}

// Import motorcycles into database
async function importMotorcycles() {
    const motorcycles = parseCSV();
    console.log(`📊 Found ${motorcycles.length} motorcycles to import`);
    
    let imported = 0;
    let skipped = 0;
    
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO motorcycles (year, make, model, package, category, engine)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    for (const moto of motorcycles) {
        stmt.run(
            moto.year,
            moto.make,
            moto.model,
            moto.package,
            moto.category,
            moto.engine,
            function(err) {
                if (err) {
                    console.error(`❌ Error importing ${moto.year} ${moto.make} ${moto.model}:`, err);
                } else if (this.changes > 0) {
                    imported++;
                    console.log(`✅ Imported: ${moto.year} ${moto.make} ${moto.model}`);
                } else {
                    skipped++;
                }
            }
        );
    }
    
    stmt.finalize(() => {
        console.log(`\n📈 Import Summary:`);
        console.log(`✅ Imported: ${imported} motorcycles`);
        console.log(`⏭️  Skipped (already exists): ${skipped} motorcycles`);
        
        // Get updated counts
        db.get(`SELECT COUNT(*) as count FROM motorcycles`, (err, row) => {
            if (!err) {
                console.log(`📊 Total motorcycles in database: ${row.count}`);
            }
            db.close();
        });
    });
}

// Run import
importMotorcycles();