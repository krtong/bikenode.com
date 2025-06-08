// Generate SVG Placeholder Images for BikeNode Profile
// No API required - creates clean placeholder images

const fs = require('fs').promises;
const path = require('path');

// SVG Templates
const svgTemplates = {
  // Profile avatar placeholder
  profileAvatar: `
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="#1a1a1a"/>
  <circle cx="100" cy="85" r="35" fill="#333" stroke="#666" stroke-width="2"/>
  <path d="M 50 140 Q 100 120 150 140 L 150 180 Q 100 170 50 180 Z" fill="#333" stroke="#666" stroke-width="2"/>
  <path d="M 85 70 Q 100 60 115 70 L 115 85 L 85 85 Z" fill="#666"/>
</svg>`,

  // Profile cover banner
  profileCover: `
<svg width="1792" height="400" viewBox="0 0 1792 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="coverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1792" height="400" fill="url(#coverGrad)"/>
  <path d="M 0 250 Q 400 200 800 250 T 1600 250 L 1792 250 L 1792 400 L 0 400 Z" fill="#0a0a0a" opacity="0.5"/>
  <path d="M 0 300 Q 300 280 600 300 T 1200 300 Q 1500 280 1792 300 L 1792 400 L 0 400 Z" fill="#0a0a0a" opacity="0.7"/>
</svg>`,

  // Motorcycle placeholder
  motorcycle: (color1, color2) => `
<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="600" fill="#f5f5f5"/>
  <!-- Motorcycle body -->
  <ellipse cx="400" cy="300" rx="180" ry="80" fill="${color1}" stroke="#333" stroke-width="3"/>
  <rect x="320" y="250" width="160" height="100" rx="20" fill="${color1}" stroke="#333" stroke-width="3"/>
  <!-- Wheels -->
  <circle cx="250" cy="400" r="60" fill="#333" stroke="#000" stroke-width="5"/>
  <circle cx="250" cy="400" r="40" fill="#666"/>
  <circle cx="550" cy="400" r="60" fill="#333" stroke="#000" stroke-width="5"/>
  <circle cx="550" cy="400" r="40" fill="#666"/>
  <!-- Details -->
  <rect x="380" y="230" width="80" height="30" rx="5" fill="${color2}"/>
  <path d="M 320 300 L 280 350 L 250 400" stroke="#333" stroke-width="8" fill="none"/>
  <path d="M 480 300 L 520 350 L 550 400" stroke="#333" stroke-width="8" fill="none"/>
</svg>`,

  // Helmet placeholder
  helmet: `
<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="#f5f5f5"/>
  <ellipse cx="200" cy="200" rx="120" ry="140" fill="#1a1a1a" stroke="#333" stroke-width="3"/>
  <path d="M 80 200 Q 80 280 140 320 L 260 320 Q 320 280 320 200" fill="#333"/>
  <rect x="100" y="180" width="200" height="80" rx="40" fill="rgba(100,100,100,0.3)"/>
  <ellipse cx="200" cy="140" rx="60" ry="20" fill="#666"/>
</svg>`,

  // Jacket placeholder
  jacket: `
<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="#f5f5f5"/>
  <path d="M 100 100 L 100 300 L 150 350 L 250 350 L 300 300 L 300 100 L 250 80 L 150 80 Z" fill="#1a1a1a" stroke="#333" stroke-width="3"/>
  <path d="M 100 120 L 50 130 L 40 250 L 80 280 L 100 260" fill="#1a1a1a" stroke="#333" stroke-width="3"/>
  <path d="M 300 120 L 350 130 L 360 250 L 320 280 L 300 260" fill="#1a1a1a" stroke="#333" stroke-width="3"/>
  <rect x="180" y="120" width="40" height="60" fill="#333"/>
  <circle cx="150" cy="150" r="10" fill="#666"/>
  <circle cx="250" cy="150" r="10" fill="#666"/>
</svg>`,

  // Gloves placeholder  
  gloves: `
<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="#f5f5f5"/>
  <!-- Left glove -->
  <path d="M 80 200 L 80 300 L 100 340 L 140 340 L 160 300 L 160 200 L 140 180 L 100 180 Z" fill="#1a1a1a" stroke="#333" stroke-width="3"/>
  <rect x="90" y="200" width="15" height="40" fill="#333"/>
  <rect x="110" y="200" width="15" height="45" fill="#333"/>
  <rect x="130" y="200" width="15" height="45" fill="#333"/>
  <rect x="145" y="210" width="15" height="35" fill="#333"/>
  <!-- Right glove -->
  <path d="M 240 200 L 240 300 L 260 340 L 300 340 L 320 300 L 320 200 L 300 180 L 260 180 Z" fill="#1a1a1a" stroke="#333" stroke-width="3"/>
  <rect x="255" y="200" width="15" height="40" fill="#333"/>
  <rect x="275" y="200" width="15" height="45" fill="#333"/>
  <rect x="295" y="200" width="15" height="45" fill="#333"/>
  <rect x="240" y="210" width="15" height="35" fill="#333"/>
</svg>`,

  // Pants placeholder
  pants: `
<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="#f5f5f5"/>
  <path d="M 150 80 L 150 200 L 120 350 L 170 350 L 190 220 L 210 220 L 230 350 L 280 350 L 250 200 L 250 80 Z" fill="#1a1a1a" stroke="#333" stroke-width="3"/>
  <ellipse cx="200" cy="180" rx="30" ry="15" fill="#333"/>
  <ellipse cx="165" cy="250" rx="25" ry="15" fill="#666"/>
  <ellipse cx="235" cy="250" rx="25" ry="15" fill="#666"/>
</svg>`,

  // Boots placeholder
  boots: `
<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="#f5f5f5"/>
  <!-- Left boot -->
  <path d="M 120 150 L 120 280 L 100 320 L 100 350 L 160 350 L 170 320 L 170 150 Z" fill="#1a1a1a" stroke="#333" stroke-width="3"/>
  <rect x="100" y="340" width="70" height="10" fill="#333"/>
  <path d="M 130 200 L 160 200" stroke="#666" stroke-width="3"/>
  <path d="M 130 220 L 160 220" stroke="#666" stroke-width="3"/>
  <!-- Right boot -->
  <path d="M 230 150 L 230 280 L 240 320 L 240 350 L 300 350 L 300 320 L 280 280 L 280 150 Z" fill="#1a1a1a" stroke="#333" stroke-width="3"/>
  <rect x="230" y="340" width="70" height="10" fill="#333"/>
  <path d="M 240 200 L 270 200" stroke="#666" stroke-width="3"/>
  <path d="M 240 220 L 270 220" stroke="#666" stroke-width="3"/>
</svg>`,

  // Gear placeholder icon
  gearIcon: `
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="#e0e0e0"/>
  <ellipse cx="100" cy="90" rx="50" ry="60" fill="#999" stroke="#666" stroke-width="2"/>
  <path d="M 50 90 Q 50 130 70 150 L 130 150 Q 150 130 150 90" fill="#b3b3b3"/>
  <rect x="70" y="80" width="60" height="40" rx="20" fill="rgba(255,255,255,0.3)"/>
</svg>`
};

// Image definitions
const imagesToGenerate = [
  // Profile images
  { path: 'nerd_blank_profile.png', svg: svgTemplates.profileAvatar },
  { path: 'profile-cover-default.jpg', svg: svgTemplates.profileCover },
  
  // Motorcycle images
  { path: 'bikes/yamaha-r1.jpg', svg: svgTemplates.motorcycle('#0050d8', '#004099') }, // Yamaha blue
  { path: 'bikes/ducati-v4.jpg', svg: svgTemplates.motorcycle('#dc0000', '#aa0000') }, // Ducati red
  { path: 'bikes/honda-cbr.jpg', svg: svgTemplates.motorcycle('#ff6600', '#cc5200') }, // Honda orange
  { path: 'bikes/bmw-gs.jpg', svg: svgTemplates.motorcycle('#666666', '#333333') }, // BMW gray
  
  // Gear images
  { path: 'gear/helmet-1.jpg', svg: svgTemplates.helmet },
  { path: 'gear/jacket-1.jpg', svg: svgTemplates.jacket },
  { path: 'gear/gloves-1.jpg', svg: svgTemplates.gloves },
  { path: 'gear/pants-1.jpg', svg: svgTemplates.pants },
  { path: 'gear/boots-1.jpg', svg: svgTemplates.boots },
  { path: 'gear/gear-placeholder.png', svg: svgTemplates.gearIcon }
];

// Convert SVG to PNG using canvas (requires canvas package for real PNG conversion)
// For now, we'll save as SVG files which browsers can display
async function generatePlaceholders() {
  console.log('🏍️  BikeNode SVG Placeholder Generator');
  console.log('=====================================\n');
  
  const baseDir = path.join(__dirname, '..', 'assets', 'images');
  
  // Create directories
  await fs.mkdir(baseDir, { recursive: true });
  await fs.mkdir(path.join(baseDir, 'bikes'), { recursive: true });
  await fs.mkdir(path.join(baseDir, 'gear'), { recursive: true });
  
  console.log(`📁 Output directory: ${baseDir}\n`);
  
  let successCount = 0;
  
  for (const image of imagesToGenerate) {
    const fullPath = path.join(baseDir, image.path);
    const svgPath = fullPath.replace(/\.(jpg|png)$/, '.svg');
    
    try {
      await fs.writeFile(svgPath, image.svg.trim());
      console.log(`✅ Created: ${image.path.replace(/\.(jpg|png)$/, '.svg')}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed: ${image.path} - ${error.message}`);
    }
  }
  
  console.log(`\n✨ Complete! Generated ${successCount}/${imagesToGenerate.length} placeholder images.`);
  console.log('\n📌 Note: Images saved as SVG files. To convert to PNG/JPG, install canvas package.');
  
  // Create preview HTML
  await createPreviewPage(baseDir);
}

// Create preview page
async function createPreviewPage(baseDir) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>BikeNode Placeholder Images</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0a0a0a;
      color: #fff;
      padding: 2rem;
      margin: 0;
    }
    h1 {
      text-align: center;
      color: #3b82f6;
      margin-bottom: 3rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .card {
      background: #1a1a1a;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #333;
    }
    .card img {
      width: 100%;
      height: 250px;
      object-fit: contain;
      background: #f5f5f5;
    }
    .card-info {
      padding: 1rem;
    }
    .card-title {
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 0.25rem;
    }
    .card-path {
      font-size: 0.875rem;
      color: #666;
      font-family: monospace;
    }
    .note {
      text-align: center;
      margin-top: 3rem;
      padding: 2rem;
      background: #1a1a1a;
      border-radius: 8px;
      border: 1px solid #333;
    }
    .note h2 {
      color: #22c55e;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <h1>🏍️ BikeNode Placeholder Images</h1>
  
  <div class="grid">
${imagesToGenerate.map(img => {
  const svgPath = img.path.replace(/\.(jpg|png)$/, '.svg');
  return `
    <div class="card">
      <img src="${svgPath}" alt="${img.path}">
      <div class="card-info">
        <div class="card-title">${path.basename(img.path)}</div>
        <div class="card-path">${img.path}</div>
      </div>
    </div>`;
}).join('')}
  </div>
  
  <div class="note">
    <h2>✅ Placeholder Images Ready!</h2>
    <p>These SVG placeholders can be used immediately in your profile page.</p>
    <p>They're lightweight, scalable, and work in all modern browsers.</p>
  </div>
</body>
</html>
`;
  
  await fs.writeFile(path.join(baseDir, 'placeholder-preview.html'), html);
  console.log(`\n🌐 Preview page: ${path.join(baseDir, 'placeholder-preview.html')}`);
}

// Run the generator
if (require.main === module) {
  generatePlaceholders().catch(console.error);
}

module.exports = { generatePlaceholders };