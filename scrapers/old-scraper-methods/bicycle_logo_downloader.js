const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Read brand names
const brandNames = fs.readFileSync('bicycle_brand_names.txt', 'utf8')
  .split('\n')
  .filter(name => name.trim())
  .map(name => ({
    displayName: name.trim(),
    fileName: name.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }));

// Create logos directory
const logosDir = path.join(__dirname, '../logos/bicycle-brands');
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

// Function to download file
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        downloadFile(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// Function to search for logo URLs (placeholder - needs implementation)
async function findLogoUrl(brandName) {
  // This would need to be implemented with actual logo search logic
  // For now, return null
  return null;
}

// Main function
async function downloadLogos() {
  console.log(`Found ${brandNames.length} bicycle brands`);
  
  const results = {
    success: [],
    failed: [],
    manual: []
  };
  
  for (const brand of brandNames) {
    console.log(`\nProcessing: ${brand.displayName}`);
    
    try {
      const logoUrl = await findLogoUrl(brand.displayName);
      
      if (logoUrl) {
        const filename = `${brand.fileName}.png`;
        const filepath = path.join(logosDir, filename);
        
        await downloadFile(logoUrl, filepath);
        console.log(`✓ Downloaded: ${filename}`);
        results.success.push(brand.displayName);
      } else {
        console.log(`⚠ Manual search needed: ${brand.displayName}`);
        results.manual.push(brand.displayName);
      }
    } catch (error) {
      console.log(`✗ Failed: ${brand.displayName} - ${error.message}`);
      results.failed.push(brand.displayName);
    }
  }
  
  // Save results summary
  const summary = {
    total: brandNames.length,
    success: results.success.length,
    failed: results.failed.length,
    manual: results.manual.length,
    brands: results
  };
  
  fs.writeFileSync(
    path.join(logosDir, 'download_summary.json'),
    JSON.stringify(summary, null, 2)
  );
  
  console.log('\n=== Summary ===');
  console.log(`Total brands: ${summary.total}`);
  console.log(`Downloaded: ${summary.success}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Manual needed: ${summary.manual}`);
  
  // Create manual search list
  if (results.manual.length > 0) {
    const manualList = results.manual.map((brand, i) => 
      `${i + 1}. ${brand}`
    ).join('\n');
    
    fs.writeFileSync(
      path.join(logosDir, 'manual_search_needed.txt'),
      manualList
    );
    
    console.log('\nManual search list saved to: manual_search_needed.txt');
  }
}

// Export for use in other scripts
module.exports = {
  downloadFile,
  brandNames,
  logosDir
};

// Run if called directly
if (require.main === module) {
  downloadLogos().catch(console.error);
}