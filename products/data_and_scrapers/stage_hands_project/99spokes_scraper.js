// Set API key for Stage Hands
process.env.OPENAI_API_KEY = 'your-api-key-here';

const stagehand = require('@browserbasehq/stagehand');
const fs = require('fs');
const path = require('path');

/**
 * This script navigates to 99spokes.com and extracts
 * comprehensive data about bicycles available on the site.
 */
async function main() {
  console.log("Starting 99spokes.com bike scraper...");
  
  // Create a timestamp for this scrape session
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const allBikes = [];
  
  // Open browser
  console.log("Opening browser...");
  const browser = await stagehand.act('open chromium');
  
  try {
    // Navigate to 99spokes.com
    console.log("Navigating to 99spokes.com...");
    await stagehand.act('navigate to "https://99spokes.com/en-US"', { browser });
    
    // Accept cookies if prompted
    try {
      await stagehand.act('Accept cookies if there is a cookie consent dialog', { browser });
      console.log("Handled cookie consent dialog");
    } catch (error) {
      console.log("No cookie dialog found or unable to handle it");
    }
    
    // Navigate to the bikes section
    console.log("Navigating to bikes section...");
    await stagehand.act('navigate to "https://99spokes.com/en-US/bikes"', { browser });
    
    // Take a screenshot
    await takeScreenshot(browser, 'bikes_listing_page.png');
    
    // Extract bike listings from the first page
    console.log("Extracting bike data from current page...");
    const bikesData = await stagehand.ask('Extract data for the first 5 bikes on this page. For each bike, get the brand name, model name, price, category, and URL to its detail page. Return as JSON.', { browser });
    
    // Parse the bike data
    let bikesOnPage = [];
    try {
      bikesOnPage = JSON.parse(bikesData);
      console.log(`Found ${bikesOnPage.length} bikes on page 1`);
      
      // Save the listing data as a checkpoint
      saveCheckpoint(bikesOnPage, `bikes_listing_page_1_js`, timestamp);
      
    } catch (error) {
      console.error("Error parsing bike data:", error);
      console.log("Raw bike data:", bikesData);
      
      // Try a more structured approach
      const structuredBikesData = await stagehand.ask('Extract data for the first 5 bikes on this page. For each bike, provide the following properties: brand, model, price, category, url. Format as a valid JSON array of objects.', { browser });
      
      try {
        bikesOnPage = JSON.parse(structuredBikesData);
        console.log(`Found ${bikesOnPage.length} bikes using structured approach`);
        saveCheckpoint(bikesOnPage, `bikes_listing_page_1_structured_js`, timestamp);
      } catch (fallbackError) {
        console.error("Structured approach also failed:", fallbackError);
        // Create a minimal dataset to continue
        bikesOnPage = [
          { brand: "Example", model: "Bike", url: "https://99spokes.com/en-US/bikes" }
        ];
      }
    }
    
    // Add bikes to our collection
    allBikes.push(...bikesOnPage);
    
    // Visit each bike's detail page to get comprehensive data
    for (let i = 0; i < Math.min(bikesOnPage.length, 3); i++) {
      const basicBike = bikesOnPage[i];
      console.log(`Scraping details for ${basicBike.brand} ${basicBike.model} (${i+1}/${Math.min(bikesOnPage.length, 3)})...`);
      
      try {
        // Navigate to the bike's detail page
        if (basicBike.url) {
          await stagehand.act(`navigate to "${basicBike.url}"`, { browser });
          await takeScreenshot(browser, `bike_detail_js_${i}.png`);
          
          // Extract detailed information
          const bikeDetails = await stagehand.ask('Extract comprehensive data about this bike, including brand, model, year, price, category, all specifications, and the URL of the main image. Return as JSON.', { browser });
          
          try {
            const detailedBike = JSON.parse(bikeDetails);
            
            // Merge the basic and detailed information
            const completeBike = {
              ...basicBike,
              ...detailedBike
            };
            
            // Update the bike in our collection
            const index = allBikes.findIndex(bike => 
              bike.brand === basicBike.brand && bike.model === basicBike.model);
            
            if (index !== -1) {
              allBikes[index] = completeBike;
            }
            
            // Save individual bike data as a checkpoint
            saveCheckpoint(completeBike, `bike_${basicBike.brand}_${basicBike.model}_js`.replace(/[^a-z0-9]/gi, '_').toLowerCase(), timestamp);
            
          } catch (parseError) {
            console.error(`Error parsing bike details for ${basicBike.brand} ${basicBike.model}:`, parseError);
            console.log("Raw bike details:", bikeDetails);
          }
        }
      } catch (error) {
        console.error(`Error scraping details for ${basicBike.brand} ${basicBike.model}:`, error);
      }
    }
    
    // Save the complete data to a JSON file
    const outputDir = path.join(__dirname, 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `99spokes_bikes_js_${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(allBikes, null, 2));
    
    console.log(`\nScraping complete! Collected data for ${allBikes.length} bikes.`);
    console.log(`Data saved to: ${outputPath}`);
    
  } catch (error) {
    console.error("Error occurred:", error);
    await takeScreenshot(browser, 'error_js_main.png');
  } finally {
    // Always close the browser
    await stagehand.act('close browser', { browser });
    console.log("Browser closed.");
  }
}

/**
 * Takes a screenshot and saves it to the screenshots directory
 */
async function takeScreenshot(browser, filename) {
  try {
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    const screenshotPath = path.join(screenshotsDir, filename);
    await stagehand.act(`take a screenshot and save it as "${screenshotPath}"`, { browser });
    console.log(`Screenshot saved: ${filename}`);
  } catch (error) {
    console.error(`Failed to take screenshot ${filename}:`, error);
  }
}

/**
 * Saves data to a checkpoint file
 */
function saveCheckpoint(data, name, timestamp) {
  try {
    const checkpointsDir = path.join(__dirname, 'checkpoints');
    if (!fs.existsSync(checkpointsDir)) {
      fs.mkdirSync(checkpointsDir, { recursive: true });
    }
    
    const checkpointPath = path.join(checkpointsDir, `${name}_${timestamp}.json`);
    fs.writeFileSync(checkpointPath, JSON.stringify(data, null, 2));
    console.log(`Checkpoint saved: ${name}`);
  } catch (error) {
    console.error(`Failed to save checkpoint ${name}:`, error);
  }
}

// Run the main function
main().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});