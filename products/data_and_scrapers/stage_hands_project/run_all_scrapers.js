const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * This script runs both 99spokes scrapers sequentially and combines their results
 */
async function main() {
  console.log('Starting 99spokes.com scraper suite...');
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  
  try {
    // Run the standard AI-based scraper
    console.log('\n=== Running Standard AI-based Scraper ===\n');
    execSync('npm run start:99spokes', { stdio: 'inherit' });
    
    // Run the direct scraper
    console.log('\n=== Running Direct Scraper ===\n');
    execSync('npm run start:99spokes:direct', { stdio: 'inherit' });
    
    // Combine results
    console.log('\n=== Combining Results ===\n');
    
    // Find the most recent data files
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      console.log('Data directory not found. Skipping combination step.');
      return;
    }
    
    const files = fs.readdirSync(dataDir);
    
    let standardResults = [];
    let directResults = [];
    
    // Find the most recent standard results
    const standardFile = files
      .filter(file => file.startsWith('99spokes_bikes_') && !file.includes('direct'))
      .sort()
      .pop();
    
    // Find the most recent direct results
    const directFile = files
      .filter(file => file.startsWith('99spokes_bikes_direct_'))
      .sort()
      .pop();
    
    if (standardFile) {
      console.log(`Found standard results: ${standardFile}`);
      standardResults = JSON.parse(fs.readFileSync(path.join(dataDir, standardFile), 'utf8'));
    }
    
    if (directFile) {
      console.log(`Found direct results: ${directFile}`);
      directResults = JSON.parse(fs.readFileSync(path.join(dataDir, directFile), 'utf8'));
    }
    
    // Combine results, avoiding duplicates
    const combinedResults = [...standardResults];
    
    // Add direct results that aren't already in the standard results
    for (const directBike of directResults) {
      const isDuplicate = combinedResults.some(bike => 
        bike.brand === directBike.brand && 
        bike.model === directBike.model
      );
      
      if (!isDuplicate) {
        combinedResults.push(directBike);
      }
    }
    
    // Save combined results
    const combinedPath = path.join(dataDir, `99spokes_bikes_combined_${timestamp}.json`);
    fs.writeFileSync(combinedPath, JSON.stringify(combinedResults, null, 2));
    
    console.log(`\nCombined ${standardResults.length} standard results and ${directResults.length} direct results.`);
    console.log(`Total unique bikes: ${combinedResults.length}`);
    console.log(`Combined data saved to: ${combinedPath}`);
    
  } catch (error) {
    console.error('Error running scrapers:', error);
    process.exit(1);
  }
}

main();