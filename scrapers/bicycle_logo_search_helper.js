const fs = require('fs');
const path = require('path');

// Extract brand data
function getBrands() {
  const content = fs.readFileSync('bicycle_brands.js', 'utf8');
  const brands = [];
  const brandMatches = content.match(/\{[^}]*"brand_id":[^}]*\}/gs);
  
  if (brandMatches) {
    for (const match of brandMatches) {
      try {
        const brandId = match.match(/"brand_id":\s*"([^"]+)"/)?.[1];
        const brandName = match.match(/"brand_name":\s*"([^"]+)"/)?.[1];
        const website = match.match(/"website":\s*"([^"]+)"/)?.[1];
        const wikipedia = match.match(/"wikipedia_url":\s*"([^"]+)"/)?.[1];
        
        if (brandId && brandName) {
          brands.push({
            id: brandId,
            name: brandName,
            website: website || null,
            wikipedia: wikipedia || null,
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

// Check which logos exist
function checkExistingLogos() {
  const LOGOS_DIR = path.join(__dirname, '../logos/bicycle-brands');
  const brands = getBrands();
  
  const existing = [];
  const missing = [];
  
  brands.forEach(brand => {
    const logoPath = path.join(LOGOS_DIR, brand.fileName);
    if (fs.existsSync(logoPath)) {
      const stats = fs.statSync(logoPath);
      existing.push({
        ...brand,
        fileSize: stats.size,
        fileSizeKB: (stats.size / 1024).toFixed(1) + ' KB'
      });
    } else {
      missing.push(brand);
    }
  });
  
  return { existing, missing, total: brands.length };
}

// Generate search URLs
function generateSearchUrls(brand) {
  const searchQuery = encodeURIComponent(`${brand.name} bicycle logo transparent png high resolution`);
  const brandQuery = encodeURIComponent(brand.name);
  
  return {
    googleImages: `https://www.google.com/search?q=${searchQuery}&tbm=isch&tbs=ic:trans,isz:l`,
    bingImages: `https://www.bing.com/images/search?q=${searchQuery}&qft=+filterui:photo-transparent+filterui:imagesize-large`,
    wikipediaCommons: `https://commons.wikimedia.org/w/index.php?search=${brandQuery}+logo&title=Special:MediaSearch&type=image`,
    brandsOfWorld: `https://www.brandsoftheworld.com/search/logo?search=${brandQuery}`,
    seekLogo: `https://seeklogo.com/search?q=${brandQuery}`,
    vectorLogo: `https://worldvectorlogo.com/?s=${brandQuery}`,
    logoWine: `https://www.logo.wine/?s=${brandQuery}`,
    wikipedia: brand.wikipedia,
    website: brand.website
  };
}

// Main function
function main() {
  const { existing, missing, total } = checkExistingLogos();
  
  console.log(`\n🚲 Bicycle Brand Logo Search Helper`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Total brands: ${total}`);
  console.log(`✅ Logos found: ${existing.length}`);
  console.log(`❌ Logos missing: ${missing.length}`);
  
  // Create output directory
  const OUTPUT_DIR = path.join(__dirname, '../logos/bicycle-brands/search-lists');
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Save missing brands list
  const missingList = missing.map((brand, i) => 
    `${i + 1}. ${brand.name}\n   File: ${brand.fileName}\n   Website: ${brand.website || 'N/A'}`
  ).join('\n\n');
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'missing_logos.txt'), missingList);
  
  // Create CSV for batch downloading
  const csvContent = [
    'Brand Name,Filename,Website,Wikipedia,Search URLs',
    ...missing.map(brand => {
      const urls = generateSearchUrls(brand);
      return `"${brand.name}","${brand.fileName}","${brand.website || ''}","${brand.wikipedia || ''}","Google: ${urls.googleImages}"`;
    })
  ].join('\n');
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'missing_logos.csv'), csvContent);
  
  // Create detailed search guide
  const searchGuide = `# Bicycle Brand Logo Search Guide
Generated: ${new Date().toISOString()}

## Summary
- Total brands: ${total}
- Logos found: ${existing.length}
- Logos missing: ${missing.length}

## Search Tips
1. Look for transparent PNG files (minimum 200x200px, preferably 500x500px or larger)
2. Check Wikipedia/Wikimedia Commons first - they often have high-quality vector logos
3. Try the brand's official website press/media section
4. Use image search with "transparent" and "logo" filters

## Missing Logos

${missing.map((brand, i) => {
  const urls = generateSearchUrls(brand);
  return `### ${i + 1}. ${brand.name}
- **Filename:** ${brand.fileName}
- **Website:** ${brand.website || 'N/A'}
- **Wikipedia:** ${brand.wikipedia || 'N/A'}

**Search Links:**
- [Google Images (Transparent, Large)](${urls.googleImages})
- [Bing Images (Transparent)](${urls.bingImages})
- [Wikimedia Commons](${urls.wikipediaCommons})
- [Brands of the World](${urls.brandsOfWorld})
- [Seek Logo](${urls.seekLogo})
- [World Vector Logo](${urls.vectorLogo})

---
`;
}).join('\n')}`;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'search_guide.md'), searchGuide);
  
  // Create quick copy-paste list for manual downloading
  const quickList = missing.map(brand => {
    const urls = generateSearchUrls(brand);
    return [
      `# ${brand.name}`,
      `curl -o "../logos/bicycle-brands/${brand.fileName}" "PASTE_URL_HERE"`,
      `# Search: ${urls.googleImages}`,
      ''
    ].join('\n');
  }).join('\n');
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'download_commands.sh'), quickList);
  
  console.log(`\n📁 Files created in: ${OUTPUT_DIR}`);
  console.log('  - missing_logos.txt    (Simple list)');
  console.log('  - missing_logos.csv    (For spreadsheet tracking)');
  console.log('  - search_guide.md      (Detailed guide with links)');
  console.log('  - download_commands.sh (curl commands ready to use)');
  
  // Show first few missing brands
  console.log(`\n🔍 First 5 missing brands:`);
  missing.slice(0, 5).forEach((brand, i) => {
    console.log(`\n${i + 1}. ${brand.name}`);
    console.log(`   File: ${brand.fileName}`);
    const urls = generateSearchUrls(brand);
    console.log(`   Search: ${urls.googleImages}`);
  });
  
  if (missing.length > 5) {
    console.log(`\n... and ${missing.length - 5} more brands`);
  }
}

main();