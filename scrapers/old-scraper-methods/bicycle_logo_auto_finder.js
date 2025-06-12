const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Common logo URL patterns on brand websites
const logoPatterns = [
  '/logo.png',
  '/logo.svg',
  '/images/logo.png',
  '/images/logo.svg',
  '/assets/logo.png',
  '/assets/logo.svg',
  '/assets/images/logo.png',
  '/assets/images/logo.svg',
  '/img/logo.png',
  '/img/logo.svg',
  '/media/logo.png',
  '/media/logo.svg',
  '/brand/logo.png',
  '/brand/logo.svg',
  '/press/logo.png',
  '/press/logo.svg',
  '/about/logo.png',
  '/about/logo.svg',
  '/wp-content/uploads/logo.png',
  '/wp-content/themes/*/images/logo.png',
  '/sites/default/files/logo.png',
  '/sites/all/themes/*/logo.png'
];

// Extract brand data from bicycle_brands.js
function extractBrandData() {
  const content = fs.readFileSync('bicycle_brands.js', 'utf8');
  const brands = [];
  const brandMatches = content.match(/\{[^}]*"brand_id":[^}]*\}/gs);
  
  if (brandMatches) {
    for (const match of brandMatches) {
      try {
        const brandId = match.match(/"brand_id":\s*"([^"]+)"/)?.[1];
        const brandName = match.match(/"brand_name":\s*"([^"]+)"/)?.[1];
        const website = match.match(/"website":\s*"([^"]+)"/)?.[1];
        
        if (brandId && brandName) {
          if (website && website !== 'null' && website !== 'undefined') {
            brands.push({
              id: brandId,
              name: brandName,
              website: website,
              fileName: brandName.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') + '.png'
            });
          }
        }
      } catch (e) {
        console.error('Error parsing brand:', e.message);
      }
    }
  }
  
  return brands;
}

// Check if URL exists and is an image
async function checkUrl(url, timeout = 5000) {
  return new Promise((resolve) => {
    try {
      const protocol = url.startsWith('https') ? https : http;
      const req = protocol.get(url, { timeout }, (res) => {
        const contentType = res.headers['content-type'] || '';
        const contentLength = parseInt(res.headers['content-length'] || '0');
        
        // Look for high-quality images (not favicons)
        const isImage = contentType.includes('image/');
        const isLargeEnough = contentLength > 5000; // At least 5KB
        
        resolve({
          exists: res.statusCode === 200,
          isImage: isImage,
          isHighQuality: isImage && isLargeEnough,
          contentType,
          contentLength,
          url
        });
      });
      
      req.on('error', () => resolve({ exists: false, url }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ exists: false, url });
      });
    } catch (e) {
      resolve({ exists: false, url });
    }
  });
}

// Try to find logo on brand website
async function findLogoOnWebsite(brand) {
  const baseUrl = brand.website.replace(/\/$/, '');
  const foundLogos = [];
  
  for (const pattern of logoPatterns) {
    const url = baseUrl + pattern;
    const result = await checkUrl(url);
    
    if (result.exists && result.isHighQuality) {
      foundLogos.push({
        url,
        contentType: result.contentType,
        size: result.contentLength
      });
      console.log(`  ✓ Found logo: ${url} (${result.contentLength} bytes)`);
    }
  }
  
  return foundLogos;
}

// Download file
async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        file.close();
        fs.unlinkSync(filepath);
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

// Main function
async function findAndDownloadLogos() {
  const brands = extractBrandData();
  const logosDir = path.join(__dirname, '../logos/bicycle-brands');
  
  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
  }
  
  console.log(`🔍 Searching for logos for ${brands.length} brands with websites...\n`);
  
  const results = {
    found: [],
    notFound: [],
    errors: []
  };
  
  for (const brand of brands) {
    console.log(`\nChecking: ${brand.name}`);
    console.log(`  Website: ${brand.website}`);
    
    try {
      const logos = await findLogoOnWebsite(brand);
      
      if (logos.length > 0) {
        // Download the first found logo
        const logoUrl = logos[0].url;
        const filepath = path.join(logosDir, brand.fileName);
        
        try {
          await downloadFile(logoUrl, filepath);
          console.log(`  ✅ Downloaded: ${brand.fileName}`);
          results.found.push({
            brand: brand.name,
            url: logoUrl,
            file: brand.fileName
          });
        } catch (err) {
          console.log(`  ❌ Download failed: ${err.message}`);
          results.errors.push({ brand: brand.name, error: err.message });
        }
      } else {
        console.log(`  ⚠️  No logo found`);
        results.notFound.push(brand.name);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      results.errors.push({ brand: brand.name, error: error.message });
    }
  }
  
  // Save results
  const summary = {
    total: brands.length,
    found: results.found.length,
    notFound: results.notFound.length,
    errors: results.errors.length,
    timestamp: new Date().toISOString(),
    results
  };
  
  fs.writeFileSync(
    path.join(logosDir, 'auto_download_results.json'),
    JSON.stringify(summary, null, 2)
  );
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   Total brands checked: ${summary.total}`);
  console.log(`   ✅ Logos found and downloaded: ${summary.found}`);
  console.log(`   ⚠️  Logos not found: ${summary.notFound}`);
  console.log(`   ❌ Errors: ${summary.errors}`);
  console.log('\nResults saved to: auto_download_results.json');
  
  // Create list of brands still needing manual search
  if (results.notFound.length > 0) {
    const manualSearchList = results.notFound.join('\n');
    fs.writeFileSync(
      path.join(logosDir, 'brands_needing_manual_search.txt'),
      manualSearchList
    );
    console.log(`\n📝 Brands needing manual search: brands_needing_manual_search.txt`);
  }
}

// Run the script
findAndDownloadLogos().catch(console.error);