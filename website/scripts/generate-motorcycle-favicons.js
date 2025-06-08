// Generate Motorcycle Brand Favicons using DALL-E 3
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs').promises;
const sharp = require('sharp');

// Motorcycle brand eras - define when each brand was/is active
const motorcycleBrands = [
  { name: 'Honda', era: 'Modern', founded: 1948, active: true },
  { name: 'Yamaha', era: 'Modern', founded: 1955, active: true },
  { name: 'Kawasaki', era: 'Modern', founded: 1963, active: true },
  { name: 'Suzuki', era: 'Modern', founded: 1909, active: true },
  { name: 'Harley-Davidson', era: 'Modern', founded: 1903, active: true },
  { name: 'Ducati', era: 'Modern', founded: 1926, active: true },
  { name: 'BMW', era: 'Modern', founded: 1923, active: true },
  { name: 'KTM', era: 'Modern', founded: 1934, active: true },
  { name: 'Triumph', era: 'Modern', founded: 1885, active: true },
  { name: 'Royal Enfield', era: 'Modern', founded: 1901, active: true },
  { name: 'Indian', era: 'Modern', founded: 1901, active: true },
  { name: 'Aprilia', era: 'Modern', founded: 1945, active: true },
  { name: 'MV Agusta', era: 'Modern', founded: 1945, active: true },
  { name: 'Husqvarna', era: 'Modern', founded: 1903, active: true },
  { name: 'Moto Guzzi', era: 'Modern', founded: 1921, active: true },
  { name: 'Norton', era: 'Modern', founded: 1898, active: true },
  { name: 'Benelli', era: 'Modern', founded: 1911, active: true },
  { name: 'Beta', era: 'Modern', founded: 1904, active: true },
  { name: 'Buell', era: '1983 to 2009 era', founded: 1983, endYear: 2009, active: false },
  { name: 'BSA', era: '1861 to 1972 era', founded: 1861, endYear: 1972, active: false },
  { name: 'Vincent', era: '1928 to 1955 era', founded: 1928, endYear: 1955, active: false },
  { name: 'Brough Superior', era: 'Modern', founded: 1919, active: true }, // Revived in 2008
  { name: 'Excelsior-Henderson', era: '1912 to 1931 era', founded: 1912, endYear: 1931, active: false },
  { name: 'Henderson', era: '1912 to 1931 era', founded: 1912, endYear: 1931, active: false },
  { name: 'Ariel', era: '1870 to 1970 era', founded: 1870, endYear: 1970, active: false },
];

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate prompt based on brand and era
function generatePrompt(brand) {
  const eraText = brand.active 
    ? 'Modern' 
    : `${brand.founded} to ${brand.endYear} era`;
  
  return `${eraText} favicon logo for ${brand.name} motorcycle company`;
}

// Generate favicon using DALL-E 3
async function generateFavicon(brand) {
  try {
    console.log(`Generating favicon for ${brand.name}...`);
    
    const prompt = generatePrompt(brand);
    console.log(`  Prompt: ${prompt}`);
    
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'natural'
    });
    
    const imageUrl = response.data[0].url;
    
    // Download the image
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(imageResponse.data);
    
    // Create output directory
    const outputDir = path.join(__dirname, '..', '..', 'logos', 'motorcycle-favicons');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Save original
    const originalPath = path.join(outputDir, `${brand.name.toLowerCase()}_original.png`);
    await fs.writeFile(originalPath, buffer);
    
    // Generate different favicon sizes
    const sizes = [16, 32, 48, 64, 128, 256];
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `${brand.name.toLowerCase()}_${size}x${size}.png`);
      await sharp(buffer)
        .resize(size, size, { 
          kernel: sharp.kernel.lanczos3,
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
    }
    
    // Generate ICO file (contains multiple sizes)
    const icoPath = path.join(outputDir, `${brand.name.toLowerCase()}.ico`);
    await sharp(buffer)
      .resize(256, 256)
      .toFile(icoPath);
    
    console.log(`  ✅ Successfully generated favicons for ${brand.name}`);
    return { success: true, brand: brand.name };
    
  } catch (error) {
    console.error(`  ❌ Failed to generate favicon for ${brand.name}:`, error.message);
    return { success: false, brand: brand.name, error: error.message };
  }
}

// Main execution
async function main() {
  console.log('Starting Motorcycle Brand Favicon Generation');
  console.log('==========================================\n');
  
  const results = [];
  
  // Test with just first 3 brands
  const testBrands = motorcycleBrands.slice(0, 3);
  
  // Process brands in batches to avoid rate limits
  const batchSize = 3;
  for (let i = 0; i < testBrands.length; i += batchSize) {
    const batch = testBrands.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(testBrands.length/batchSize)}`);
    
    const batchResults = await Promise.all(
      batch.map(brand => generateFavicon(brand))
    );
    
    results.push(...batchResults);
    
    // Wait between batches to respect rate limits
    if (i + batchSize < motorcycleBrands.length) {
      console.log('Waiting 60 seconds before next batch...\n');
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }
  
  // Summary
  console.log('\n==========================================');
  console.log('Generation Complete!');
  console.log(`Total brands: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  
  // Save results log
  const logPath = path.join(__dirname, '..', '..', 'logos', 'motorcycle-favicons', 'generation_log.json');
  await fs.writeFile(logPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results: results,
    prompts: motorcycleBrands.map(b => ({
      brand: b.name,
      prompt: generatePrompt(b)
    }))
  }, null, 2));
  
  console.log(`\nLog saved to: ${logPath}`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  motorcycleBrands,
  generatePrompt,
  generateFavicon
};