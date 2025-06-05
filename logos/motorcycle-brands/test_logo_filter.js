const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Test 1: Hash comparison
function getImageHash(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(buffer).digest('hex');
  } catch (e) {
    return null;
  }
}

// Test 2: File size patterns (motorcycle logos tend to be certain sizes)
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (e) {
    return 0;
  }
}

// Test 3: Check actual image content by examining a few suspicious ones
async function examineLogos() {
  const suspiciousLogos = ['abc.png', 'access.png', 'abarth.png'];
  const knownGoodLogos = ['honda.png', 'yamaha.png', 'ducati.png'];
  
  console.log('=== Examining Suspicious Logos ===\n');
  
  // Get hashes and sizes for comparison
  for (const logo of suspiciousLogos) {
    const hash = getImageHash(logo);
    const size = getFileSize(logo);
    console.log(`${logo}:`);
    console.log(`  Hash: ${hash}`);
    console.log(`  Size: ${size} bytes`);
  }
  
  console.log('\n=== Known Good Logos ===\n');
  
  for (const logo of knownGoodLogos) {
    const hash = getImageHash(logo);
    const size = getFileSize(logo);
    console.log(`${logo}:`);
    console.log(`  Hash: ${hash}`);
    console.log(`  Size: ${size} bytes`);
  }
  
  // Test 4: Look for patterns in the brand_list.txt
  console.log('\n=== Checking Brand List ===\n');
  
  try {
    const brandList = fs.readFileSync('brand_list.txt', 'utf8');
    const brands = brandList.split('\n').filter(b => b.trim());
    
    // Check if our suspicious brands are in the official list
    const suspiciousBrands = ['ABC', 'Access', 'Abarth'];
    
    for (const brand of suspiciousBrands) {
      const found = brands.some(b => b.toLowerCase().includes(brand.toLowerCase()));
      console.log(`${brand}: ${found ? 'Found in brand list' : 'NOT in brand list'}`);
    }
  } catch (e) {
    console.log('Could not read brand_list.txt');
  }
}

// Test 5: Simple visual inspection helper
function createVisualReport() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Logo Verification</title>
  <style>
    .logo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 20px; }
    .logo-item { border: 2px solid #ccc; padding: 10px; text-align: center; }
    .logo-item img { max-width: 200px; max-height: 150px; }
    .suspicious { border-color: red; }
    .verified { border-color: green; }
  </style>
</head>
<body>
  <h1>Motorcycle Logo Verification</h1>
  
  <h2>Suspicious Logos</h2>
  <div class="logo-grid">
    <div class="logo-item suspicious">
      <h3>ABC</h3>
      <img src="abc.png" />
      <p>Check: Does this look like a motorcycle brand?</p>
    </div>
    <div class="logo-item suspicious">
      <h3>Access</h3>
      <img src="access.png" />
      <p>Check: Does this look like a motorcycle brand?</p>
    </div>
    <div class="logo-item suspicious">
      <h3>Abarth</h3>
      <img src="abarth.png" />
      <p>Check: Does this look like a motorcycle brand?</p>
    </div>
  </div>
  
  <h2>Verified Logos</h2>
  <div class="logo-grid">
    <div class="logo-item verified">
      <h3>Honda</h3>
      <img src="honda.png" />
    </div>
    <div class="logo-item verified">
      <h3>Yamaha</h3>
      <img src="yamaha.png" />
    </div>
    <div class="logo-item verified">
      <h3>Ducati</h3>
      <img src="ducati.png" />
    </div>
  </div>
</body>
</html>`;
  
  fs.writeFileSync('verify_logos.html', html);
  console.log('\n=== Visual Verification ===\n');
  console.log('Created verify_logos.html - Open this file to visually check logos');
}

// Run all tests
examineLogos().then(() => {
  createVisualReport();
});