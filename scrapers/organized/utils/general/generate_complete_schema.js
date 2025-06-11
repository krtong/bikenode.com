const fs = require('fs');

// Read the motorcycle data
const data = JSON.parse(fs.readFileSync('scraped_data/motorcycles/motorcyclespecs_2025-06-05T10-29-11-191Z.json', 'utf8'));

// Get all specification field names and their frequencies
const fieldCounts = {};
data.motorcycles.forEach(motorcycle => {
    Object.keys(motorcycle.specifications || {}).forEach(field => {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
    });
});

// Sort by frequency
const sortedFields = Object.entries(fieldCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([field, count]) => ({ field, count }));

// Filter out fields that look like motorcycle model names (contain numbers, long names, etc)
const legitSpecFields = sortedFields.filter(({ field, count }) => {
    // Skip fields that look like model names
    if (field.match(/^\d+/)) return false; // Starts with number
    if (field.length > 50) return false; // Too long
    if (field.includes(' & ')) return false; // Model combos
    if (field.includes('Ago') || field.includes('Corona') || field.includes('Sport') && field.includes('125')) return false;
    if (count < 5) return false; // Too rare (likely model names)
    
    return true;
});

console.log(`Found ${legitSpecFields.length} legitimate specification fields`);

// Convert field names to valid SQL column names
function toSqlColumnName(fieldName) {
    return fieldName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
        .replace(/_+/g, '_') // Replace multiple underscores with single
        .replace(/^_|_$/g, '') // Remove leading/trailing underscores
        .substring(0, 63); // PostgreSQL column name limit
}

// Generate SQL schema
const sqlColumns = [
    'id SERIAL PRIMARY KEY',
    'manufacturer VARCHAR(100) NOT NULL',
    'model VARCHAR(200) NOT NULL',
    'title VARCHAR(300)',
    'description TEXT',
    'content TEXT',
    'url VARCHAR(500)',
    'scraped_at TIMESTAMP WITH TIME ZONE',
    'created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
    'updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
];

// Add all specification fields as columns
legitSpecFields.forEach(({ field, count }) => {
    const columnName = toSqlColumnName(field);
    sqlColumns.push(`${columnName} TEXT -- ${field} (${count} entries)`);
});

// Generate complete SQL
const createTableSQL = `
-- Complete motorcycle specifications table with all ${legitSpecFields.length} specification fields
-- Generated from ${data.total_motorcycles} motorcycles scraped from motorcyclespecs.co.za

CREATE TABLE IF NOT EXISTS motorcycle_specs_complete (
    ${sqlColumns.join(',\n    ')}
);

-- Create indexes for common search fields
CREATE INDEX IF NOT EXISTS idx_motorcycle_specs_complete_manufacturer ON motorcycle_specs_complete(manufacturer);
CREATE INDEX IF NOT EXISTS idx_motorcycle_specs_complete_model ON motorcycle_specs_complete(model);
CREATE INDEX IF NOT EXISTS idx_motorcycle_specs_complete_year ON motorcycle_specs_complete(year);
CREATE INDEX IF NOT EXISTS idx_motorcycle_specs_complete_manufacturer_model ON motorcycle_specs_complete(manufacturer, model);

-- Create unique constraint to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_motorcycle_specs_complete_unique 
ON motorcycle_specs_complete(manufacturer, model, COALESCE(year, ''));

-- Create mapping table for catalog relationships
CREATE TABLE IF NOT EXISTS motorcycle_catalog_specs_mapping (
    id SERIAL PRIMARY KEY,
    catalog_id UUID REFERENCES motorcycles(id) ON DELETE CASCADE,
    spec_id INTEGER REFERENCES motorcycle_specs_complete(id) ON DELETE CASCADE,
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    mapping_type VARCHAR(50) DEFAULT 'automatic',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_specs_mapping_complete_unique 
ON motorcycle_catalog_specs_mapping(catalog_id, spec_id);
`;

// Write SQL file
fs.writeFileSync('create_complete_motorcycle_specs_table.sql', createTableSQL);

// Generate field mapping for import script
const fieldMapping = {};
legitSpecFields.forEach(({ field }) => {
    fieldMapping[field] = toSqlColumnName(field);
});

fs.writeFileSync('spec_field_mapping.json', JSON.stringify(fieldMapping, null, 2));

console.log(`✅ Generated SQL schema with ${legitSpecFields.length} specification fields`);
console.log('📁 Files created:');
console.log('  - create_complete_motorcycle_specs_table.sql');
console.log('  - spec_field_mapping.json');

// Show top 20 fields for verification
console.log('\nTop 20 specification fields:');
legitSpecFields.slice(0, 20).forEach(({ field, count }, i) => {
    console.log(`  ${i + 1}. ${field} (${count} entries) -> ${toSqlColumnName(field)}`);
});