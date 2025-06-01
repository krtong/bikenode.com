#!/usr/bin/env node

import pkg from 'pg';
import fs from 'fs/promises';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/bikenode?sslmode=disable'
});

// Get existing variant IDs from database
const dbResult = await pool.query('SELECT variant_id FROM bikes');
const existingIds = new Set(dbResult.rows.map(row => row.variant_id));
console.log(`Database contains ${existingIds.size} variants`);

// Load the bike variants file
const rawData = await fs.readFile('bike_variants.json', 'utf8');
const bikeVariants = JSON.parse(rawData);

// Find first 3 variants that DON'T exist in database
const unscrapedVariants = [];
let found = 0;

for (const [makerId, makerData] of Object.entries(bikeVariants)) {
  if (found >= 3) break;
  
  for (const family of makerData.families || []) {
    if (found >= 3) break;
    
    for (const variant of family.variants || []) {
      if (found >= 3) break;
      
      if (!existingIds.has(variant.variantId)) {
        unscrapedVariants.push({
          variantId: variant.variantId,
          name: variant.name,
          url: variant.url
        });
        found++;
      }
    }
  }
}

console.log(`\nFound ${unscrapedVariants.length} unscraped variants for testing:`);
unscrapedVariants.forEach((variant, i) => {
  console.log(`${i+1}. ID: ${variant.variantId}`);
  console.log(`   Name: ${variant.name}`);
  console.log(`   URL: ${variant.url}`);
  console.log('');
});

await pool.end();