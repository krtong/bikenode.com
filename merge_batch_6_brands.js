#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load batch_6_brands.js
const batch6Path = path.join(__dirname, 'batch_6_brands.js');
const batch6Content = fs.readFileSync(batch6Path, 'utf8');
const batch6Match = batch6Content.match(/const batch_6_brands = (\[[\s\S]*\]);/);
const batch6Brands = eval(batch6Match[1]);

// Load bicycle_brands.js
const bicycleBrandsPath = path.join(__dirname, 'scrapers', 'bicycle_brands.js');
const existingBrands = require(bicycleBrandsPath);

// Create a set of existing brand IDs for quick lookup
const existingBrandIds = new Set(existingBrands.map(brand => brand.brand_id));

// Filter out any brands that already exist
const newBrands = batch6Brands.filter(brand => !existingBrandIds.has(brand.brand_id));

console.log(`Found ${batch6Brands.length} brands in batch_6_brands.js`);
console.log(`${newBrands.length} are new brands to add`);

if (newBrands.length === 0) {
    console.log('No new brands to add. All brands already exist.');
    process.exit(0);
}

// Merge the arrays
const mergedBrands = [...existingBrands, ...newBrands];

// Sort by brand_id for consistency
mergedBrands.sort((a, b) => a.brand_id.localeCompare(b.brand_id));

// Create the new file content
const newContent = `const brandinfo = ${JSON.stringify(mergedBrands, null, 2)};

module.exports = brandinfo;`;

// Backup the original file
const backupPath = bicycleBrandsPath + '.backup.' + new Date().toISOString().replace(/[:.]/g, '_');
fs.copyFileSync(bicycleBrandsPath, backupPath);
console.log(`Created backup at: ${backupPath}`);

// Write the updated content
fs.writeFileSync(bicycleBrandsPath, newContent);

console.log(`✅ Successfully merged ${newBrands.length} new brands into bicycle_brands.js`);
console.log(`Total brands now: ${mergedBrands.length}`);

// List the new brands added
console.log('\nNew brands added:');
newBrands.forEach((brand, index) => {
    console.log(`  ${index + 1}. ${brand.brand_id} - ${brand.brand_name}`);
});