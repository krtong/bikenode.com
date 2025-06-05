const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Read the full brand data from bicycle_brands.js
async function extractBrandData() {
  const content = fs.readFileSync('bicycle_brands.js', 'utf8');
  
  // Extract brand data with existing URLs
  const brands = [];
  const brandMatches = content.match(/\{[^}]*"brand_id":[^}]*\}/gs);
  
  if (brandMatches) {
    for (const match of brandMatches) {
      try {
        const brandId = match.match(/"brand_id":\s*"([^"]+)"/)?.[1];
        const brandName = match.match(/"brand_name":\s*"([^"]+)"/)?.[1];
        const website = match.match(/"website":\s*"([^"]+)"/)?.[1];
        const logoUrl = match.match(/"logo_url":\s*"([^"]+)"/)?.[1];
        const iconUrl = match.match(/"icon_url":\s*"([^"]+)"/)?.[1];
        
        if (brandId && brandName) {
          brands.push({
            id: brandId,
            name: brandName,
            website: website || null,
            logoUrl: logoUrl || null,
            iconUrl: iconUrl || null,
            fileName: brandName.toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
          });
        }
      } catch (e) {
        console.error('Error parsing brand:', e.message);
      }
    }
  }
  
  return brands;
}

// Generate search URLs for each brand
function generateSearchUrls(brand) {
  const encodedName = encodeURIComponent(brand.name);
  const searchTerms = [
    `${brand.name} bicycle logo transparent png`,
    `${brand.name} bike logo png`,
    `${brand.name} cycling logo`
  ];
  
  return {
    direct: [
      brand.logoUrl,
      brand.iconUrl,
      brand.website ? `${brand.website}/favicon.ico` : null,
      brand.website ? `${brand.website}/logo.png` : null,
      brand.website ? `${brand.website}/images/logo.png` : null,
      brand.website ? `${brand.website}/assets/logo.png` : null,
      brand.website ? `${brand.website}/assets/images/logo.png` : null
    ].filter(Boolean),
    search: searchTerms.map(term => ({
      google: `https://www.google.com/search?q=${encodeURIComponent(term)}&tbm=isch`,
      duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(term)}&iax=images&ia=images`
    }))
  };
}

// Check if URL returns a valid image
async function checkImageUrl(url) {
  return new Promise((resolve) => {
    try {
      const protocol = url.startsWith('https') ? https : require('http');
      const req = protocol.get(url, { timeout: 5000 }, (res) => {
        const contentType = res.headers['content-type'] || '';
        const isImage = contentType.includes('image/');
        resolve({
          valid: res.statusCode === 200 && isImage,
          contentType,
          url
        });
      });
      
      req.on('error', () => resolve({ valid: false, url }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ valid: false, url });
      });
    } catch (e) {
      resolve({ valid: false, url });
    }
  });
}

// Main script
async function main() {
  console.log('Extracting brand data...');
  const brands = await extractBrandData();
  console.log(`Found ${brands.length} brands with data`);
  
  const logosDir = path.join(__dirname, '../logos/bicycle-brands');
  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
  }
  
  // Create a search guide
  const searchGuide = [];
  
  for (const brand of brands) {
    console.log(`\nProcessing: ${brand.name}`);
    
    const urls = generateSearchUrls(brand);
    const validUrls = [];
    
    // Check direct URLs
    for (const url of urls.direct) {
      const result = await checkImageUrl(url);
      if (result.valid) {
        validUrls.push(url);
        console.log(`  ✓ Found valid image at: ${url}`);
      }
    }
    
    searchGuide.push({
      brand: brand.name,
      id: brand.id,
      fileName: `${brand.fileName}.png`,
      website: brand.website,
      potentialUrls: validUrls,
      searchUrls: urls.search[0],
      status: validUrls.length > 0 ? 'found' : 'manual_search_needed'
    });
  }
  
  // Save search guide
  const guidePath = path.join(logosDir, 'logo_search_guide.json');
  fs.writeFileSync(guidePath, JSON.stringify(searchGuide, null, 2));
  
  // Create manual search HTML
  const manualSearchHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Bicycle Brand Logo Search</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .brand { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
    .brand h3 { margin-top: 0; }
    .search-links { margin: 10px 0; }
    .search-links a { margin-right: 15px; }
    .status-found { background-color: #e8f5e9; }
    .status-manual { background-color: #fff3e0; }
    .potential-urls { background: #f5f5f5; padding: 10px; margin: 10px 0; }
    pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Bicycle Brand Logo Search Guide</h1>
  <p>Total brands: ${searchGuide.length}</p>
  <p>Found logos: ${searchGuide.filter(b => b.status === 'found').length}</p>
  <p>Manual search needed: ${searchGuide.filter(b => b.status === 'manual_search_needed').length}</p>
  
  ${searchGuide.map(brand => `
    <div class="brand status-${brand.status === 'found' ? 'found' : 'manual'}">
      <h3>${brand.brand}</h3>
      <p><strong>Filename:</strong> ${brand.fileName}</p>
      ${brand.website ? `<p><strong>Website:</strong> <a href="${brand.website}" target="_blank">${brand.website}</a></p>` : ''}
      
      ${brand.potentialUrls.length > 0 ? `
        <div class="potential-urls">
          <strong>Potential URLs found:</strong>
          <ul>${brand.potentialUrls.map(url => `<li><a href="${url}" target="_blank">${url}</a></li>`).join('')}</ul>
        </div>
      ` : ''}
      
      <div class="search-links">
        <strong>Search for logos:</strong>
        <a href="${brand.searchUrls.google}" target="_blank">Google Images</a>
        <a href="${brand.searchUrls.duckduckgo}" target="_blank">DuckDuckGo</a>
      </div>
      
      <details>
        <summary>Download command (after finding URL)</summary>
        <pre>curl -o "${logosDir}/${brand.fileName}" "LOGO_URL_HERE"</pre>
      </details>
    </div>
  `).join('')}
</body>
</html>`;
  
  fs.writeFileSync(path.join(logosDir, 'search_guide.html'), manualSearchHtml);
  
  console.log('\n=== Summary ===');
  console.log(`Total brands: ${searchGuide.length}`);
  console.log(`Found potential logos: ${searchGuide.filter(b => b.status === 'found').length}`);
  console.log(`Manual search needed: ${searchGuide.filter(b => b.status === 'manual_search_needed').length}`);
  console.log(`\nSearch guide saved to: ${path.join(logosDir, 'search_guide.html')}`);
  console.log(`JSON data saved to: ${guidePath}`);
  
  // Create a simple download script for found logos
  const downloadScript = searchGuide
    .filter(b => b.potentialUrls.length > 0)
    .map(b => `# ${b.brand}\ncurl -o "${logosDir}/${b.fileName}" "${b.potentialUrls[0]}"`)
    .join('\n\n');
  
  fs.writeFileSync(path.join(logosDir, 'download_found_logos.sh'), downloadScript);
  console.log(`\nDownload script for found logos: ${path.join(logosDir, 'download_found_logos.sh')}`);
}

main().catch(console.error);