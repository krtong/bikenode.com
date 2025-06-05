const fs = require('fs');
const path = require('path');

// Load maker_ids.js
const makerIdsPath = path.join(__dirname, 'scrapers', 'maker_ids.js');
const makerIdsContent = fs.readFileSync(makerIdsPath, 'utf8');
const makerIdsMatch = makerIdsContent.match(/const maker_ids = ({[\s\S]*?});/);
const maker_ids = eval('(' + makerIdsMatch[1] + ')');

// Load bicycle_brands.js
const bicycleBrandsPath = path.join(__dirname, 'scrapers', 'bicycle_brands.js');
const brandinfo = require(bicycleBrandsPath);

// Extract brand IDs from bicycle_brands.js
const bicycleBrandsList = brandinfo.map(brand => brand.brand_id).sort();

// Extract brand IDs from both files
const makerIdsList = Object.keys(maker_ids).sort();

// Find missing brands
const missingBrands = makerIdsList.filter(id => !bicycleBrandsList.includes(id));

console.log(`Total brands in maker_ids.js: ${makerIdsList.length}`);
console.log(`Total brands in bicycle_brands.js: ${bicycleBrandsList.length}`);
console.log(`Missing brands: ${missingBrands.length}\n`);

console.log('MISSING BRANDS CHECKLIST:');
console.log('========================\n');

missingBrands.forEach((id, index) => {
    console.log(`[ ] ${index + 1}. ${id} - ${maker_ids[id]}`);
});

// Also save to a file
const checklistContent = `# Missing Bicycle Brands Checklist

Generated on: ${new Date().toISOString()}

Total brands in maker_ids.js: ${makerIdsList.length}
Total brands in bicycle_brands.js: ${bicycleBrandsList.length}
Missing brands: ${missingBrands.length}

## Missing Brands:

${missingBrands.map((id, index) => `- [ ] ${index + 1}. **${id}** - ${maker_ids[id]}`).join('\n')}
`;

fs.writeFileSync('missing_bicycle_brands_checklist.md', checklistContent);
console.log('\nChecklist also saved to: missing_bicycle_brands_checklist.md');