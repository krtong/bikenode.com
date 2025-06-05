import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const brandsFile = path.join(__dirname, '../scrapers/bicycle_brands.js');
const content = fs.readFileSync(brandsFile, 'utf8');

// Parse the brands array - handle the module.exports line
const match = content.match(/const brandinfo = \[([\s\S]*)\]\s*module\.exports/);
if (!match) {
  console.error('Could not parse brands array');
  process.exit(1);
}

// Split into individual brand objects
const brandsText = match[1];
const brandBlocks = brandsText.split(/},\s*{/).map((block, i, arr) => {
  if (i === 0) return block + '}';
  if (i === arr.length - 1) return '{' + block;
  return '{' + block + '}';
});

// Track seen brand IDs and keep the LAST occurrence
const brandsByIdMap = new Map();

brandBlocks.forEach((block, index) => {
  const idMatch = block.match(/"brand_id":\s*"([^"]*)"/);
  if (idMatch) {
    const brandId = idMatch[1];
    brandsByIdMap.set(brandId, { block, index });
  }
});

// Get unique brands in original order
const uniqueBrands = [];
const processedIds = new Set();
let removedCount = 0;

brandBlocks.forEach((block, index) => {
  const idMatch = block.match(/"brand_id":\s*"([^"]*)"/);
  if (idMatch) {
    const brandId = idMatch[1];
    const lastOccurrence = brandsByIdMap.get(brandId);
    
    // Only keep if this is the last occurrence of this brand_id
    if (lastOccurrence.index === index) {
      uniqueBrands.push(block);
      processedIds.add(brandId);
    } else {
      console.log(`Removing earlier duplicate: ${brandId} at index ${index}`);
      removedCount++;
    }
  }
});

// Reconstruct the file
const newContent = `const brandinfo = [
${uniqueBrands.join(',\n')}
]

module.exports = brandinfo;`;

// Write the cleaned file
fs.writeFileSync(brandsFile, newContent);

console.log(`\nRemoved ${removedCount} earlier duplicate(s)`);
console.log(`Total unique brands: ${uniqueBrands.length}`);