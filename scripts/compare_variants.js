import fs from 'fs/promises';
import pkg from 'pg';

const { Pool } = pkg;
const pool = new Pool({
  connectionString: 'postgres://kevintong@localhost:5432/bikenode?sslmode=disable',
});

// Load bike variants from JSON
const rawData = await fs.readFile('/Users/kevintong/Documents/Code/bikenode.com/scrapers/bike_variants.json', 'utf8');
const bikeVariants = JSON.parse(rawData);

// Get YT 2018 variants from JSON file
const yt2018 = bikeVariants.yt_2018;
const jsonVariants = [];
if (yt2018 && yt2018.families) {
  yt2018.families.forEach(family => {
    if (family.variants) {
      family.variants.forEach(variant => {
        jsonVariants.push(variant.variantId);
      });
    }
  });
}

// Get YT 2018 variants from database
const dbResult = await pool.query(`
  SELECT 
    bc.keyid,
    bd.comprehensive_data->'pageInfo'->>'url' as stored_url
  FROM bikes_catalog bc
  LEFT JOIN bikes_data bd ON bc.keyid = bd.keyid
  WHERE bc.make = 'YT Industries' AND bc.year = 2018
`);

const extractVariantFromUrl = (url) => {
  if (!url) return null;
  const match = url.match(/\/bikes\/[^\/]+\/\d+\/(.+)$/);
  return match ? match[1] : null;
};

const dbVariants = dbResult.rows.map(row => extractVariantFromUrl(row.stored_url)).filter(v => v);

console.log('YT 2018 variants in JSON file (' + jsonVariants.length + '):');
jsonVariants.slice(0, 5).forEach(v => console.log('  ' + v));

console.log('\nYT 2018 variants in database (' + dbVariants.length + '):');
dbVariants.slice(0, 5).forEach(v => console.log('  ' + v));

console.log('\nMatching variants:');
const matches = jsonVariants.filter(jv => dbVariants.includes(jv));
console.log('Found ' + matches.length + ' matches out of ' + jsonVariants.length + ' JSON variants');

if (matches.length > 0) {
  console.log('All matches:');
  matches.forEach(v => console.log('  ' + v));
} else {
  console.log('No matches found. Let\'s check for partial matches:');
  jsonVariants.slice(0, 5).forEach(jv => {
    const partialMatches = dbVariants.filter(dv => dv.includes(jv) || jv.includes(dv));
    if (partialMatches.length > 0) {
      console.log('  JSON: ' + jv + ' -> DB: ' + partialMatches.join(', '));
    }
  });
}

await pool.end();