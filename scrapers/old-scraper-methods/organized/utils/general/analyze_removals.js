const fs = require('fs');

// Load original merged data
const originalData = JSON.parse(fs.readFileSync('./scraped_data/motorcycles/merged_motorcycle_data_2025-06-05T11-51-40-464Z.json', 'utf8'));

console.log('Original total:', originalData.motorcycles.length);

// Track what gets removed at each step
let currentData = [...originalData.motorcycles];

// Step 1: Check for invalid entries that would be filtered
const invalidEntries = currentData.filter(bike => {
    if (!bike.manufacturer || !bike.model) return true;
    if (bike.manufacturer.toLowerCase().includes('test') ||
        bike.model.toLowerCase().includes('test') ||
        bike.manufacturer === 'Home' ||
        bike.manufacturer === 'Manufacturer') {
        return true;
    }
    return false;
});

console.log('\nInvalid entries that would be removed:', invalidEntries.length);
invalidEntries.slice(0, 10).forEach((bike, i) => {
    console.log(`  ${i + 1}. ${bike.manufacturer} - ${bike.model}`);
});

// Step 2: Check for duplicates
const duplicateKeys = new Set();
const duplicates = [];
const unique = [];

currentData.forEach(bike => {
    const key = `${bike.manufacturer}|${bike.model}|${bike.year}|${bike.package || ''}`;
    if (duplicateKeys.has(key)) {
        duplicates.push(bike);
    } else {
        duplicateKeys.add(key);
        unique.push(bike);
    }
});

console.log('\nDuplicates that would be removed:', duplicates.length);
console.log('Examples of duplicates:');
duplicates.slice(0, 10).forEach((bike, i) => {
    console.log(`  ${i + 1}. ${bike.manufacturer} ${bike.model} (${bike.year}) - ${bike.package || 'no package'} - Source: ${bike.source}`);
});

console.log('\nFinal count after removal:', unique.length - invalidEntries.length);
console.log('Total removed:', originalData.motorcycles.length - (unique.length - invalidEntries.length));