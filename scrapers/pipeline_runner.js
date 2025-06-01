const { execSync } = require('child_process');

/**
 * This script runs the entire 99spokes.com data pipeline:
 * 1. Run both scrapers
 * 2. Combine their results
 * 3. Process and analyze the data
 */
async function main() {
  console.log('Starting 99spokes.com data pipeline...');
  const startTime = new Date();
  
  try {
    // Step 1: Run all scrapers
    console.log('\n=== STEP 1: Running Scrapers ===\n');
    execSync('npm run start:99spokes:all', { stdio: 'inherit' });
    
    // Step 2: Process the data
    console.log('\n=== STEP 2: Processing Data ===\n');
    execSync('npm run process:bikes', { stdio: 'inherit' });
    
    // Calculate total runtime
    const endTime = new Date();
    const runtime = (endTime - startTime) / 1000 / 60; // in minutes
    
    console.log(`\n=== Pipeline Complete! ===`);
    console.log(`Total runtime: ${runtime.toFixed(2)} minutes`);
    
  } catch (error) {
    console.error('Error in pipeline:', error);
    process.exit(1);
  }
}

main();