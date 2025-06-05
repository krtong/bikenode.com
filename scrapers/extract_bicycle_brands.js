const fs = require('fs');

// Read the bicycle_brands.js file
const content = fs.readFileSync('bicycle_brands.js', 'utf8');

// Extract the brandinfo array content
const match = content.match(/const brandinfo = \[([\s\S]*)\];/);
if (!match) {
  console.error('Could not find brandinfo array');
  process.exit(1);
}

// Clean up the JavaScript object notation to make it valid JSON
let jsonStr = match[1];

// Remove trailing commas
jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

// Remove comments
jsonStr = jsonStr.replace(/\/\/[^\n]*/g, '');
jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');

// Replace single quotes with double quotes
jsonStr = jsonStr.replace(/'/g, '"');

// Fix property names without quotes
jsonStr = jsonStr.replace(/(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

// Remove any remaining trailing commas
jsonStr = jsonStr.replace(/,\s*}/g, '}');
jsonStr = jsonStr.replace(/,\s*]/g, ']');

try {
  // Parse the JSON
  const brands = JSON.parse('[' + jsonStr + ']');
  
  // Extract relevant information
  const brandList = brands.map(b => ({
    id: b.brand_id,
    name: b.brand_name,
    logo_url: b.logo?.logo_url || null,
    icon_url: b.logo?.icon_url || null,
    website: b.website || null
  }));
  
  // Save to a file
  fs.writeFileSync('bicycle_brand_list.json', JSON.stringify(brandList, null, 2));
  
  console.log(`Found ${brandList.length} bicycle brands`);
  console.log('\nFirst 10 brands:');
  brandList.slice(0, 10).forEach(b => {
    console.log(`- ${b.name} (${b.id})`);
  });
  
} catch (e) {
  console.error('Error parsing brands:', e.message);
  console.error('At position:', e.message.match(/position (\d+)/)?.[1]);
}