// Generate All Profile Page Images
// This script generates all placeholder images needed for the BikeNode profile page

const path = require('path');

// Load environment variables from root .env file using absolute path
const envPath = path.resolve(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs').promises;

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Image generation function
async function generateImage(prompt, size = '1024x1024') {
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: size,
      quality: 'hd',
      style: 'natural'
    });
    return response.data[0].url;
  } catch (error) {
    console.error('Generation error:', error.message);
    return null;
  }
}

// Download and save image
async function downloadImage(url, filepath) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    await fs.writeFile(filepath, response.data);
    console.log(`✅ Saved: ${filepath}`);
  } catch (error) {
    console.error(`❌ Failed to save ${filepath}:`, error.message);
  }
}

// All images needed for the profile page
const imagesToGenerate = [
  // Profile Images
  {
    category: 'profile',
    images: [
      {
        filename: 'nerd_blank_profile.png',
        prompt: 'Minimalist avatar icon of a motorcycle rider, simple geometric style, helmet silhouette, neutral gray colors, clean vector illustration, suitable for profile placeholder'
      },
      {
        filename: 'profile-cover-default.jpg',
        prompt: 'Scenic mountain road with motorcycle curves, aerial view, misty mountains, golden hour lighting, cinematic landscape photography, wide banner format',
        size: '1792x1024'
      }
    ]
  },
  
  // Motorcycle Images
  {
    category: 'bikes',
    images: [
      {
        filename: 'yamaha-r1.jpg',
        prompt: 'Professional product photo of 2025 Yamaha YZF-R1 sport bike, blue and black color scheme, 3/4 front view, studio lighting on white background, high detail commercial photography'
      },
      {
        filename: 'ducati-v4.jpg',
        prompt: 'Professional product photo of 2024 Ducati Panigale V4S, iconic red Italian racing motorcycle, side profile, studio lighting on white background, high detail commercial photography'
      },
      {
        filename: 'honda-cbr.jpg',
        prompt: 'Professional product photo of 2023 Honda CBR1000RR-R Fireblade SP, tricolor HRC racing livery, 3/4 front view, studio lighting on white background, high detail commercial photography'
      },
      {
        filename: 'bmw-gs.jpg',
        prompt: 'Professional product photo of 2022 BMW R1250GS Adventure touring motorcycle, gray with black accents, side view with panniers, studio lighting on white background, high detail commercial photography'
      }
    ]
  },
  
  // Gear Images
  {
    category: 'gear',
    images: [
      {
        filename: 'helmet-1.jpg',
        prompt: 'Premium racing motorcycle helmet, glossy black with subtle racing graphics, 3/4 view, studio product photography on white background, high detail'
      },
      {
        filename: 'jacket-1.jpg',
        prompt: 'Professional motorcycle racing leather jacket, black with white accents, visible armor protection, front view, studio product photography on white background'
      },
      {
        filename: 'gloves-1.jpg',
        prompt: 'Motorcycle racing gloves, black leather with carbon fiber knuckle protection, pair displayed, studio product photography on white background'
      },
      {
        filename: 'pants-1.jpg',
        prompt: 'Motorcycle racing leather pants, black with knee sliders, front view, studio product photography on white background'
      },
      {
        filename: 'boots-1.jpg',
        prompt: 'Motorcycle racing boots, black and red leather with toe sliders, side view, studio product photography on white background'
      },
      {
        filename: 'gear-placeholder.png',
        prompt: 'Simple gray silhouette icon of motorcycle helmet, minimalist design, placeholder style, centered on light gray background'
      }
    ]
  }
];

// Main execution
async function generateAllImages() {
  console.log('🏍️  BikeNode Profile Image Generator');
  console.log('====================================\n');
  
  // Create directories
  const baseDir = path.join(__dirname, '..', 'assets', 'images');
  await fs.mkdir(baseDir, { recursive: true });
  await fs.mkdir(path.join(baseDir, 'bikes'), { recursive: true });
  await fs.mkdir(path.join(baseDir, 'gear'), { recursive: true });
  
  let totalImages = 0;
  let successCount = 0;
  
  // Count total images
  imagesToGenerate.forEach(category => {
    totalImages += category.images.length;
  });
  
  console.log(`📸 Generating ${totalImages} images...\n`);
  
  // Generate images by category
  for (const category of imagesToGenerate) {
    console.log(`\n📁 Category: ${category.category.toUpperCase()}`);
    console.log('─'.repeat(40));
    
    for (const image of category.images) {
      console.log(`\n⏳ Generating: ${image.filename}`);
      console.log(`   Prompt: "${image.prompt.substring(0, 60)}..."`);
      
      const imageUrl = await generateImage(image.prompt, image.size || '1024x1024');
      
      if (imageUrl) {
        const filepath = category.category === 'profile' 
          ? path.join(baseDir, image.filename)
          : path.join(baseDir, category.category, image.filename);
        
        await downloadImage(imageUrl, filepath);
        successCount++;
      } else {
        console.log(`❌ Failed to generate: ${image.filename}`);
      }
      
      // Rate limiting (3 images per minute for DALL-E 3)
      if (successCount < totalImages) {
        console.log('⏸️  Waiting 20 seconds (rate limit)...');
        await new Promise(resolve => setTimeout(resolve, 20000));
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Generation Complete!`);
  console.log(`📊 Success: ${successCount}/${totalImages} images`);
  console.log(`📍 Location: ${baseDir}`);
  console.log('='.repeat(50));
  
  // Create an HTML preview page
  await createPreviewPage(baseDir);
}

// Create HTML preview of all generated images
async function createPreviewPage(baseDir) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>BikeNode Profile Images Preview</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #0a0a0a;
      color: #fff;
    }
    h1 {
      text-align: center;
      color: #3b82f6;
      margin-bottom: 40px;
    }
    .category {
      margin-bottom: 60px;
    }
    .category h2 {
      color: #8b5cf6;
      border-bottom: 2px solid #8b5cf6;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    .image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
    }
    .image-card {
      background: #1a1a1a;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #333;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .image-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
    }
    .image-container {
      width: 100%;
      height: 300px;
      background: #0a0a0a;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .image-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .image-info {
      padding: 20px;
    }
    .filename {
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 5px;
    }
    .filepath {
      font-size: 12px;
      color: #666;
      font-family: monospace;
      word-break: break-all;
    }
    .status {
      text-align: center;
      padding: 40px;
      background: #1a1a1a;
      border-radius: 12px;
      margin-bottom: 40px;
    }
    .status h3 {
      color: #22c55e;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <h1>🏍️ BikeNode Profile Images Preview</h1>
  
  <div class="status">
    <h3>✅ Images Generated Successfully</h3>
    <p>All images are ready to use in your profile page</p>
  </div>
`;

  let htmlContent = html;
  
  for (const category of imagesToGenerate) {
    htmlContent += `
  <div class="category">
    <h2>${category.category.charAt(0).toUpperCase() + category.category.slice(1)}</h2>
    <div class="image-grid">
`;
    
    for (const image of category.images) {
      const relativePath = category.category === 'profile' 
        ? image.filename 
        : `${category.category}/${image.filename}`;
      
      htmlContent += `
      <div class="image-card">
        <div class="image-container">
          <img src="${relativePath}" alt="${image.filename}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4='">
        </div>
        <div class="image-info">
          <div class="filename">${image.filename}</div>
          <div class="filepath">/assets/images/${relativePath}</div>
        </div>
      </div>
`;
    }
    
    htmlContent += `
    </div>
  </div>
`;
  }
  
  htmlContent += `
</body>
</html>
`;
  
  await fs.writeFile(path.join(baseDir, 'preview.html'), htmlContent);
  console.log(`\n🌐 Preview page created: ${path.join(baseDir, 'preview.html')}`);
}

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY environment variable not set');
  console.log('\n💡 To use this script:');
  console.log('1. Get an API key from https://platform.openai.com/api-keys');
  console.log('2. Set the environment variable:');
  console.log('   export OPENAI_API_KEY="your-api-key-here"');
  console.log('3. Run the script again\n');
  process.exit(1);
}

// Run the generator
if (require.main === module) {
  generateAllImages().catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { generateImage, downloadImage, generateAllImages };