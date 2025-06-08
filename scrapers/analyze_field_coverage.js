const fs = require('fs');

// Read the motorcycle data
const data = JSON.parse(fs.readFileSync('scraped_data/motorcycles/motorcyclespecs_2025-06-05T10-29-11-191Z.json', 'utf8'));

// Count field occurrences
const fieldCounts = {};
const totalMotorcycles = data.motorcycles.length;

data.motorcycles.forEach(motorcycle => {
    Object.keys(motorcycle.specifications || {}).forEach(field => {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
    });
});

// Find fields present in 90%+ of motorcycles
const threshold90 = Math.floor(totalMotorcycles * 0.90);
const threshold80 = Math.floor(totalMotorcycles * 0.80);
const threshold70 = Math.floor(totalMotorcycles * 0.70);
const threshold60 = Math.floor(totalMotorcycles * 0.60);
const threshold50 = Math.floor(totalMotorcycles * 0.50);

const fields90 = [];
const fields80 = [];
const fields70 = [];
const fields60 = [];
const fields50 = [];

Object.entries(fieldCounts).forEach(([field, count]) => {
    // Skip fields that look like motorcycle models
    if (field.match(/^\d+/) || field.length > 50 || count < 100) return;
    
    const percentage = (count / totalMotorcycles * 100).toFixed(1);
    
    if (count >= threshold90) {
        fields90.push({ field, count, percentage });
    } else if (count >= threshold80) {
        fields80.push({ field, count, percentage });
    } else if (count >= threshold70) {
        fields70.push({ field, count, percentage });
    } else if (count >= threshold60) {
        fields60.push({ field, count, percentage });
    } else if (count >= threshold50) {
        fields50.push({ field, count, percentage });
    }
});

// Sort by count
fields90.sort((a, b) => b.count - a.count);
fields80.sort((a, b) => b.count - a.count);
fields70.sort((a, b) => b.count - a.count);
fields60.sort((a, b) => b.count - a.count);
fields50.sort((a, b) => b.count - a.count);

console.log(`Total motorcycles analyzed: ${totalMotorcycles}`);
console.log(`\n📊 FIELD COVERAGE ANALYSIS:\n`);

console.log(`Fields present in 90%+ of motorcycles (${fields90.length} fields):`);
if (fields90.length === 0) {
    console.log('  ❌ NO FIELDS appear in 90% or more motorcycles!');
} else {
    fields90.forEach(({ field, count, percentage }) => {
        console.log(`  ${field}: ${count} (${percentage}%)`);
    });
}

console.log(`\nFields present in 80-89% of motorcycles (${fields80.length} fields):`);
fields80.forEach(({ field, count, percentage }) => {
    console.log(`  ${field}: ${count} (${percentage}%)`);
});

console.log(`\nFields present in 70-79% of motorcycles (${fields70.length} fields):`);
fields70.slice(0, 10).forEach(({ field, count, percentage }) => {
    console.log(`  ${field}: ${count} (${percentage}%)`);
});
if (fields70.length > 10) console.log(`  ... and ${fields70.length - 10} more`);

console.log(`\nFields present in 60-69% of motorcycles (${fields60.length} fields):`);
fields60.slice(0, 5).forEach(({ field, count, percentage }) => {
    console.log(`  ${field}: ${count} (${percentage}%)`);
});
if (fields60.length > 5) console.log(`  ... and ${fields60.length - 5} more`);

console.log(`\nFields present in 50-59% of motorcycles (${fields50.length} fields):`);
console.log(`  Total: ${fields50.length} fields`);

// Generate recommended schema
console.log('\n📋 RECOMMENDATION:');
const recommendedFields = [...fields90, ...fields80, ...fields70];
console.log(`Based on 70%+ coverage threshold: ${recommendedFields.length} structured columns + JSONB for rest`);

// Save analysis
fs.writeFileSync('field_coverage_analysis.json', JSON.stringify({
    total_motorcycles: totalMotorcycles,
    coverage_90: fields90,
    coverage_80: fields80,
    coverage_70: fields70,
    coverage_60: fields60,
    coverage_50: fields50,
    recommendation: {
        threshold: '70%',
        structured_fields: recommendedFields.length,
        fields: recommendedFields.map(f => f.field)
    }
}, null, 2));