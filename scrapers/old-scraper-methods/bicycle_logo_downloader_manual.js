const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const LOGOS_DIR = path.join(__dirname, '../logos/bicycle-brands');
const MIN_WIDTH = 200;  // Minimum width for high-quality logo
const MIN_HEIGHT = 200; // Minimum height for high-quality logo

// Ensure logos directory exists
if (!fs.existsSync(LOGOS_DIR)) {
  fs.mkdirSync(LOGOS_DIR, { recursive: true });
}

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
        
        if (brandId && brandName) {
          brands.push({
            id: brandId,
            name: brandName,
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

// Download and validate a single logo
async function downloadLogo(url, brandName, fileName) {
  const tempFile = path.join(LOGOS_DIR, `temp_${fileName}`);
  const finalFile = path.join(LOGOS_DIR, fileName);
  
  console.log(`\n📥 Downloading logo for ${brandName}...`);
  console.log(`   URL: ${url}`);
  
  try {
    // Download the file
    await downloadFile(url, tempFile);
    
    // Check if file exists and has content
    const stats = fs.statSync(tempFile);
    if (stats.size < 1000) {
      throw new Error('File too small - likely not a valid logo');
    }
    
    // Use ImageMagick to get image info and validate
    try {
      const { stdout } = await execAsync(`identify -format "%w %h %[channels] %[colorspace]" "${tempFile}"`);
      const [width, height, channels, colorspace] = stdout.trim().split(' ');
      
      console.log(`   Dimensions: ${width}x${height}`);
      console.log(`   Channels: ${channels}`);
      console.log(`   Colorspace: ${colorspace}`);
      
      // Validate dimensions
      if (parseInt(width) < MIN_WIDTH || parseInt(height) < MIN_HEIGHT) {
        throw new Error(`Image too small (${width}x${height}). Minimum required: ${MIN_WIDTH}x${MIN_HEIGHT}`);
      }
      
      // Check for transparency (alpha channel)
      const hasAlpha = channels.includes('a') || channels === '4' || channels === 'rgba';
      if (!hasAlpha) {
        console.log('   ⚠️  Warning: Image may not have transparent background');
        const response = await promptUser('Continue anyway? (y/n): ');
        if (response.toLowerCase() !== 'y') {
          throw new Error('User cancelled - no transparency');
        }
      }
      
      // Convert to PNG with transparency if needed
      console.log('   Converting to PNG with transparency...');
      await execAsync(`convert "${tempFile}" -background none "${finalFile}"`);
      
      // Clean up temp file
      fs.unlinkSync(tempFile);
      
      console.log(`   ✅ Success! Saved as: ${fileName}`);
      return { success: true, fileName };
      
    } catch (cmdError) {
      // Fallback if ImageMagick is not installed
      console.log('   ⚠️  ImageMagick not found. Saving without validation...');
      fs.renameSync(tempFile, finalFile);
      console.log(`   ✅ Saved as: ${fileName} (unvalidated)`);
      return { success: true, fileName, unvalidated: true };
    }
    
  } catch (error) {
    // Clean up temp file if it exists
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Download file helper
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        file.close();
        fs.unlinkSync(filepath);
        downloadFile(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });
    
    request.on('error', (err) => {
      file.close();
      fs.unlink(filepath, () => {});
      reject(err);
    });
    
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

// Prompt user for input
function promptUser(question) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    readline.question(question, answer => {
      readline.close();
      resolve(answer);
    });
  });
}

// Interactive mode - download logos one by one
async function interactiveMode() {
  const brands = getBrands();
  console.log(`\n🚲 Bicycle Logo Downloader - Interactive Mode`);
  console.log(`Found ${brands.length} brands\n`);
  
  // Check which logos already exist
  const existing = brands.filter(b => fs.existsSync(path.join(LOGOS_DIR, b.fileName)));
  const missing = brands.filter(b => !fs.existsSync(path.join(LOGOS_DIR, b.fileName)));
  
  console.log(`✅ Already have: ${existing.length} logos`);
  console.log(`❌ Missing: ${missing.length} logos\n`);
  
  if (missing.length === 0) {
    console.log('All logos already downloaded!');
    return;
  }
  
  console.log('Missing brands:');
  missing.forEach((b, i) => {
    if (i < 10 || i >= missing.length - 3) {
      console.log(`  ${i + 1}. ${b.name} -> ${b.fileName}`);
    } else if (i === 10) {
      console.log(`  ... and ${missing.length - 13} more ...`);
    }
  });
  
  const startIndex = await promptUser('\nStart from brand number (1 to start from beginning): ');
  const start = Math.max(0, parseInt(startIndex) - 1) || 0;
  
  for (let i = start; i < missing.length; i++) {
    const brand = missing[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Brand ${i + 1}/${missing.length}: ${brand.name}`);
    console.log(`Filename: ${brand.fileName}`);
    
    const action = await promptUser('\nEnter logo URL (or "skip" to skip, "quit" to exit): ');
    
    if (action.toLowerCase() === 'quit') {
      console.log('\nExiting...');
      break;
    }
    
    if (action.toLowerCase() === 'skip' || !action.trim()) {
      console.log('Skipping...');
      continue;
    }
    
    await downloadLogo(action.trim(), brand.name, brand.fileName);
  }
  
  // Show final summary
  const finalExisting = brands.filter(b => fs.existsSync(path.join(LOGOS_DIR, b.fileName)));
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Final Summary:');
  console.log(`   Total brands: ${brands.length}`);
  console.log(`   Logos downloaded: ${finalExisting.length}`);
  console.log(`   Still missing: ${brands.length - finalExisting.length}`);
}

// Batch mode - download from a list
async function batchMode(listFile) {
  console.log(`\n🚲 Bicycle Logo Downloader - Batch Mode`);
  console.log(`Reading from: ${listFile}\n`);
  
  const content = fs.readFileSync(listFile, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const results = [];
  
  for (const line of lines) {
    // Expected format: "Brand Name,URL" or "brand-filename.png,URL"
    const [brandPart, url] = line.split(',').map(s => s.trim());
    
    if (!brandPart || !url) continue;
    
    // Determine brand name and filename
    let brandName, fileName;
    if (brandPart.endsWith('.png')) {
      fileName = brandPart;
      brandName = brandPart.replace('.png', '').replace(/-/g, ' ');
    } else {
      brandName = brandPart;
      fileName = brandName.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') + '.png';
    }
    
    const result = await downloadLogo(url, brandName, fileName);
    results.push({ brandName, fileName, ...result });
  }
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Batch Download Summary:');
  console.log(`   Total attempted: ${results.length}`);
  console.log(`   Successful: ${results.filter(r => r.success).length}`);
  console.log(`   Failed: ${results.filter(r => !r.success).length}`);
  
  // Save results
  const resultsFile = path.join(LOGOS_DIR, 'batch_results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${resultsFile}`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === '--batch' && args[1]) {
    await batchMode(args[1]);
  } else if (args[0] === '--url' && args[1] && args[2]) {
    // Single download mode
    const brandName = args[1];
    const url = args[2];
    const fileName = brandName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '.png';
    
    await downloadLogo(url, brandName, fileName);
  } else {
    // Interactive mode
    await interactiveMode();
  }
}

// Show usage if needed
if (process.argv.includes('--help')) {
  console.log(`
Bicycle Logo Downloader - High Quality Logo Acquisition Tool

Usage:
  node bicycle_logo_downloader_manual.js              Interactive mode
  node bicycle_logo_downloader_manual.js --batch <file>    Batch mode (CSV file)
  node bicycle_logo_downloader_manual.js --url "Brand Name" "https://example.com/logo.png"

The tool will:
- Download logos and validate they are high quality (200x200px minimum)
- Check for transparent backgrounds
- Convert to PNG format if needed
- Save with standardized filenames

Requires ImageMagick for full validation (optional).
  `);
  process.exit(0);
}

// Run the script
main().catch(console.error);