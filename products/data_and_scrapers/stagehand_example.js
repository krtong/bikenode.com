// Set dummy API key before requiring Stagehand
process.env.OPENAI_API_KEY = 'your-api-key-here';

const stagehand = require('@browserbasehq/stagehand');

// Simple logging function with timestamps
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Example function to search for bike products
async function searchBikeProducts() {
  log('Starting bike product search example...');
  
  // Open browser
  const browser = await stagehand.act('open chromium');
  log('Browser opened successfully');
  
  try {
    // Navigate to a bike shopping website
    await stagehand.act('navigate to "https://www.rei.com/c/bikes"', { browser });
    log('Navigated to REI bikes page');
    
    // Extract some basic information about bike products
    const results = await stagehand.ask('extract the names and prices of the first 3 bike products shown on this page', { browser });
    log('Extracted bike products:');
    console.log(results);
    
    // Take a screenshot
    await stagehand.act('take a screenshot named "bike_products.png"', { browser });
    log('Screenshot saved as bike_products.png');
    
  } catch (err) {
    log(`Error during execution: ${err.message}`);
  } finally {
    // Always close the browser
    await stagehand.act('close browser', { browser });
    log('Browser closed');
  }
}

// Run with error handling
searchBikeProducts().catch(err => {
  log(`Unhandled error: ${err.message}`);
  process.exit(1);
});
