const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./scraped_data/motorcycles/merged_motorcycle_data_2025-06-05T11-51-40-464Z.json', 'utf8'));

console.log('🏍️ Merged Motorcycle Database Overview');
console.log('=====================================');
console.log('Total motorcycles:', data.total_motorcycles.toLocaleString());
console.log('Sources:', data.sources);
console.log();

// Show examples of each source type
const bySource = {};
data.motorcycles.forEach(bike => {
  if (!bySource[bike.source]) bySource[bike.source] = [];
  if (bySource[bike.source].length < 3) {
    bySource[bike.source].push(bike);
  }
});

Object.entries(bySource).forEach(([source, bikes]) => {
  console.log(`${source.toUpperCase()} Examples:`);
  bikes.forEach((bike, i) => {
    console.log(`  ${i + 1}. ${bike.manufacturer} ${bike.model} (${bike.year || 'Unknown year'})`);
    if (bike.specifications && Object.keys(bike.specifications).length > 0) {
      console.log(`     Specs: ${Object.keys(bike.specifications).length} fields`);
    }
    if (bike.images && bike.images.length > 0) {
      console.log(`     Images: ${bike.images.length}`);
    }
  });
  console.log();
});

// Show year range
const years = data.motorcycles
  .map(bike => parseInt(bike.year))
  .filter(year => !isNaN(year))
  .sort((a, b) => a - b);

if (years.length > 0) {
  console.log(`Year range: ${years[0]} - ${years[years.length - 1]}`);
}

// Show top manufacturers
const manufacturers = {};
data.motorcycles.forEach(bike => {
  manufacturers[bike.manufacturer] = (manufacturers[bike.manufacturer] || 0) + 1;
});

const topManufacturers = Object.entries(manufacturers)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log('\nTop 10 Manufacturers:');
topManufacturers.forEach(([make, count], i) => {
  console.log(`  ${i + 1}. ${make}: ${count.toLocaleString()} motorcycles`);
});

// Show detailed specs example
console.log('\nExample of detailed motorcycle with full specs:');
const detailedExample = data.motorcycles.find(bike => 
  bike.source === 'merged' && 
  bike.specifications && 
  Object.keys(bike.specifications).length > 10
);

if (detailedExample) {
  console.log(`${detailedExample.manufacturer} ${detailedExample.model} (${detailedExample.year})`);
  console.log('Specifications:');
  Object.entries(detailedExample.specifications).slice(0, 10).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  if (detailedExample.images && detailedExample.images.length > 0) {
    console.log(`Images: ${detailedExample.images.length} available`);
  }
}