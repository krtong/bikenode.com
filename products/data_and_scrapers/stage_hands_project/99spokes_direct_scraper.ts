import { Browser } from "browser";
import * as fs from 'fs';
import * as path from 'path';

// Add TypeScript ignore for the JSON.parse calls
// @ts-ignore

interface BikeData {
  brand: string;
  model: string;
  year?: string | number;
  price?: string;
  category?: string;
  specs?: Record<string, string>;
  imageUrl?: string;
  url?: string;
}

/**
 * This script uses a more direct approach to scrape 99spokes.com
 * by using specific CSS selectors and DOM traversal.
 */
async function main() {
  console.log("Starting 99spokes.com direct scraper...");
  const browser = new Browser();
  const allBikes: BikeData[] = [];
  
  // Create a timestamp for this scrape session
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  
  try {
    // Navigate to 99spokes.com bikes page
    console.log("Navigating to 99spokes.com bikes page...");
    await browser.goto("https://99spokes.com/en-US/bikes");
    
    // Accept cookies if prompted
    try {
      await browser.do("If there's a cookie consent dialog, click 'Accept' or 'Accept All'");
      console.log("Handled cookie consent dialog");
    } catch (error) {
      console.log("No cookie dialog found or unable to handle it");
    }
    
    // Take a screenshot to see what we're working with
    await takeScreenshot(browser, 'bikes_listing_page_direct.png');
    
    // Use a more direct approach to extract bike data
    console.log("Extracting bike data using direct selectors...");
    
    // First, let's analyze the page structure
    const pageStructure = await browser.do(`
      Analyze the page structure and identify:
      1. The CSS selector for bike listing cards
      2. The CSS selectors for brand, model, price, and category within each card
      3. The CSS selector for the link to the bike's detail page
      4. The CSS selector for pagination controls
      
      Return this information in a structured format.
    `);
    
    console.log("Page structure analysis:", pageStructure);
    
    // Extract bike listings from the first page
    const bikeListings = await browser.do(`
      Extract data from all bike listing cards on this page. For each bike, get:
      - Brand name
      - Model name
      - Price (if available)
      - Category (if available)
      - URL to the detail page
      
      Return this as a structured JSON array.
    `);
    
    // Parse the bike listings
    let bikesOnPage: BikeData[] = [];
    try {
      bikesOnPage = JSON.parse(bikeListings);
      console.log(`Found ${bikesOnPage.length} bikes on page 1`);
      
      // Save the listing data as a checkpoint
      saveCheckpoint(bikesOnPage, `bikes_listing_page_1_direct`, timestamp);
      
      // Add to our collection
      allBikes.push(...bikesOnPage);
      
    } catch (error) {
      console.error("Error parsing bike listings:", error);
      // Try to extract using the AI approach as fallback
      try {
        const extractedBikes = await browser.extract({
          bikes: [{
            brand: "string",
            model: "string",
            price: "string?",
            category: "string?",
            url: "string"
          }]
        });
        
        bikesOnPage = extractedBikes.bikes;
        console.log(`Found ${bikesOnPage.length} bikes using AI extraction`);
        
        // Save the listing data as a checkpoint
        saveCheckpoint(bikesOnPage, `bikes_listing_page_1_ai_fallback`, timestamp);
        
        // Add to our collection
        allBikes.push(...bikesOnPage);
        
      } catch (fallbackError) {
        console.error("Fallback extraction also failed:", fallbackError);
      }
    }
    
    // Limit the number of bikes to scrape for testing
    const bikesToScrape = bikesOnPage.slice(0, 3);
    
    // Visit each bike's detail page to get comprehensive data
    for (let i = 0; i < bikesToScrape.length; i++) {
      const basicBike = bikesToScrape[i];
      console.log(`Scraping details for ${basicBike.brand} ${basicBike.model} (${i+1}/${bikesToScrape.length})...`);
      
      try {
        // Navigate to the bike's detail page
        await browser.goto(basicBike.url);
        await takeScreenshot(browser, `bike_detail_direct_${i}.png`);
        
        // Analyze the detail page structure
        const detailPageStructure = await browser.do(`
          Analyze this bike detail page and identify:
          1. The CSS selector for the bike's specifications table
          2. The CSS selectors for year, price, and category information
          3. The CSS selector for the bike's main image
          
          Return this information in a structured format.
        `);
        
        console.log("Detail page structure analysis:", detailPageStructure);
        
        // Extract detailed bike information
        const bikeDetails = await browser.do(`
          Extract the following information from this bike detail page:
          - Brand name
          - Model name
          - Year (if available)
          - Price (if available)
          - Category (if available)
          - All specifications from the specs table (as key-value pairs)
          - URL of the main bike image
          
          Return this as a structured JSON object.
        `);
        
        // Parse the bike details
        try {
          const detailedBike = JSON.parse(bikeDetails);
          
          // Merge the basic and detailed information
          const completeBike: BikeData = {
            ...basicBike,
            ...detailedBike,
            url: basicBike.url
          };
          
          // Update the bike in our collection
          const index = allBikes.findIndex(bike => 
            bike.brand === basicBike.brand && bike.model === basicBike.model);
          
          if (index !== -1) {
            allBikes[index] = completeBike;
          }
          
          // Save individual bike data as a checkpoint
          saveCheckpoint(completeBike, `bike_${basicBike.brand}_${basicBike.model}_direct`.replace(/[^a-z0-9]/gi, '_').toLowerCase(), timestamp);
          
        } catch (parseError) {
          console.error(`Error parsing bike details for ${basicBike.brand} ${basicBike.model}:`, parseError);
          
          // Try to extract using the AI approach as fallback
          try {
            const detailedBike = await browser.extract({
              brand: "string",
              model: "string",
              year: "string?",
              price: "string?",
              category: "string?",
              specs: "object?",
              imageUrl: "string?"
            });
            
            // Merge the basic and detailed information
            const completeBike: BikeData = {
              ...basicBike,
              ...detailedBike,
              url: basicBike.url
            };
            
            // Update the bike in our collection
            const index = allBikes.findIndex(bike => 
              bike.brand === basicBike.brand && bike.model === basicBike.model);
            
            if (index !== -1) {
              allBikes[index] = completeBike;
            }
            
            // Save individual bike data as a checkpoint
            saveCheckpoint(completeBike, `bike_${basicBike.brand}_${basicBike.model}_ai_fallback`.replace(/[^a-z0-9]/gi, '_').toLowerCase(), timestamp);
            
          } catch (fallbackError) {
            console.error(`Fallback extraction also failed for ${basicBike.brand} ${basicBike.model}:`, fallbackError);
          }
        }
        
      } catch (error) {
        console.error(`Error scraping details for ${basicBike.brand} ${basicBike.model}:`, error);
        continue; // Continue with next bike
      }
    }
    
    // Save the complete data to a JSON file
    const outputDir = path.join(__dirname, 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `99spokes_bikes_direct_${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(allBikes, null, 2));
    
    console.log(`\nScraping complete! Collected data for ${allBikes.length} bikes.`);
    console.log(`Data saved to: ${outputPath}`);
    
  } catch (error) {
    console.error("Error occurred:", error);
    await takeScreenshot(browser, 'error_direct_main.png');
  } finally {
    // Always close the browser
    await browser.close();
    console.log("Browser closed.");
  }
}

/**
 * Takes a screenshot and saves it to the screenshots directory
 */
async function takeScreenshot(browser: Browser, filename: string): Promise<void> {
  try {
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    const screenshotPath = path.join(screenshotsDir, filename);
    await browser.do(`Take a screenshot and save it as "${screenshotPath}"`);
    console.log(`Screenshot saved: ${filename}`);
  } catch (error) {
    console.error(`Failed to take screenshot ${filename}:`, error);
  }
}

/**
 * Saves data to a checkpoint file
 */
function saveCheckpoint(data: any, name: string, timestamp: string): void {
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

main();