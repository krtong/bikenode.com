const fs = require('fs');
const path = require('path');

// Read the full brand data
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
        const wikipediaUrl = match.match(/"wikipedia_url":\s*"([^"]+)"/)?.[1];
        
        if (brandId && brandName) {
          brands.push({
            id: brandId,
            name: brandName,
            website: website || null,
            wikipedia: wikipediaUrl || null,
            fileName: brandName.toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '') + '.png'
          });
        }
      } catch (e) {
        console.error('Error parsing brand:', e.message);
      }
    }
  }
  
  return brands;
}

// Generate manual search guide
function generateSearchGuide() {
  const brands = extractBrandData();
  const logosDir = path.join(__dirname, '../logos/bicycle-brands');
  
  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
  }
  
  // Prioritized search locations for high-quality logos
  const searchSources = [
    { name: 'Wikimedia Commons', urlPattern: 'https://commons.wikimedia.org/wiki/Special:Search?search={brand}+logo+bicycle&ns6=1&ns12=1' },
    { name: 'Brand Press Kit', urlPattern: '{website}/press or {website}/media or {website}/brand-assets' },
    { name: 'Wikipedia', urlPattern: '{wikipedia}' },
    { name: 'Brands of the World', urlPattern: 'https://www.brandsoftheworld.com/search/logo?search={brand}' },
    { name: 'Seek Logo', urlPattern: 'https://seeklogo.com/search?q={brand}' },
    { name: 'WorldVectorLogo', urlPattern: 'https://worldvectorlogo.com/?s={brand}' },
    { name: 'Logo Wine', urlPattern: 'https://www.logo.wine/?s={brand}' }
  ];
  
  // Create HTML guide
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Bicycle Brand Logo Manual Search Guide</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto; }
    h1 { color: #2c3e50; }
    .info { background: #e8f4f8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .brand { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    .brand:hover { box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    .brand h3 { margin-top: 0; color: #2c3e50; }
    .filename { background: #f5f5f5; padding: 5px 10px; border-radius: 3px; font-family: monospace; }
    .search-links { margin: 15px 0; }
    .search-links a { 
      display: inline-block; 
      margin: 5px 10px 5px 0; 
      padding: 8px 15px; 
      background: #3498db; 
      color: white; 
      text-decoration: none; 
      border-radius: 3px; 
    }
    .search-links a:hover { background: #2980b9; }
    .website-link { color: #27ae60; }
    .instructions { background: #fff9e6; padding: 10px; border-radius: 3px; margin: 10px 0; }
    .download-cmd { background: #2c3e50; color: #fff; padding: 10px; border-radius: 3px; font-family: monospace; }
    table { width: 100%; margin: 20px 0; }
    td { padding: 5px; }
    .completed { background: #d4edda; }
    .pending { background: #fff3cd; }
  </style>
</head>
<body>
  <h1>Bicycle Brand Logo Manual Search Guide</h1>
  
  <div class="info">
    <h2>Instructions</h2>
    <ol>
      <li>Search for each brand's logo using the provided links</li>
      <li>Look for high-resolution transparent PNG files (ideally 500x500px or larger)</li>
      <li>Download the logo and save it with the specified filename</li>
      <li>Check off completed brands as you go</li>
    </ol>
    <p><strong>Priority:</strong> Wikipedia/Wikimedia Commons often have high-quality SVG/PNG logos. Brand press kits are the best source.</p>
  </div>
  
  <table>
    <tr>
      <td>Total Brands: <strong>${brands.length}</strong></td>
      <td class="pending">⏳ Pending: <span id="pending-count">${brands.length}</span></td>
      <td class="completed">✅ Completed: <span id="completed-count">0</span></td>
    </tr>
  </table>
  
  ${brands.map((brand, index) => `
    <div class="brand" id="brand-${index}">
      <h3>
        <input type="checkbox" id="check-${index}" onchange="updateCount()"> 
        ${brand.name}
      </h3>
      <p><strong>Save as:</strong> <span class="filename">${brand.fileName}</span></p>
      
      ${brand.website ? `<p><strong>Official Website:</strong> <a href="${brand.website}" target="_blank" class="website-link">${brand.website}</a></p>` : ''}
      
      <div class="search-links">
        ${brand.wikipedia ? `<a href="${brand.wikipedia}" target="_blank">Wikipedia</a>` : ''}
        
        ${searchSources.map(source => {
          let url = source.urlPattern
            .replace('{brand}', encodeURIComponent(brand.name))
            .replace('{website}', brand.website || 'https://example.com')
            .replace('{wikipedia}', brand.wikipedia || '#');
          
          if (source.name === 'Brand Press Kit' && !brand.website) return '';
          if (source.name === 'Wikipedia' && !brand.wikipedia) return '';
          
          return `<a href="${url}" target="_blank">${source.name}</a>`;
        }).join('')}
      </div>
      
      <details>
        <summary>Download Instructions</summary>
        <div class="instructions">
          <p>After finding a high-quality logo:</p>
          <div class="download-cmd">
            # Right-click and save image as: ${logosDir}/${brand.fileName}<br>
            # Or use curl:<br>
            curl -o "${logosDir}/${brand.fileName}" "PASTE_LOGO_URL_HERE"
          </div>
        </div>
      </details>
    </div>
  `).join('')}
  
  <script>
    function updateCount() {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const completed = Array.from(checkboxes).filter(cb => cb.checked).length;
      const pending = checkboxes.length - completed;
      
      document.getElementById('completed-count').textContent = completed;
      document.getElementById('pending-count').textContent = pending;
      
      // Save progress to localStorage
      const progress = Array.from(checkboxes).map(cb => cb.checked);
      localStorage.setItem('bicycle-logo-progress', JSON.stringify(progress));
    }
    
    // Load saved progress
    const savedProgress = localStorage.getItem('bicycle-logo-progress');
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      progress.forEach((checked, index) => {
        if (checkboxes[index]) {
          checkboxes[index].checked = checked;
        }
      });
      updateCount();
    }
  </script>
</body>
</html>`;
  
  fs.writeFileSync(path.join(logosDir, 'manual_search_guide.html'), html);
  
  // Create a CSV for tracking
  const csv = [
    'Brand Name,Brand ID,Filename,Website,Wikipedia,Status',
    ...brands.map(b => `"${b.name}","${b.id}","${b.fileName}","${b.website || ''}","${b.wikipedia || ''}","pending"`)
  ].join('\n');
  
  fs.writeFileSync(path.join(logosDir, 'brand_logo_tracking.csv'), csv);
  
  // Create a simple text list
  const textList = brands.map((b, i) => `${i + 1}. ${b.name} -> ${b.fileName}`).join('\n');
  fs.writeFileSync(path.join(logosDir, 'brand_list.txt'), textList);
  
  console.log(`\n✅ Created manual search guide for ${brands.length} bicycle brands`);
  console.log(`\n📁 Files created in: ${logosDir}`);
  console.log('   - manual_search_guide.html (interactive search guide)');
  console.log('   - brand_logo_tracking.csv (for tracking progress)');
  console.log('   - brand_list.txt (simple text list)');
  console.log('\n🔍 Open manual_search_guide.html in your browser to start searching for logos');
}

// Run the script
generateSearchGuide();