import { Browser } from "browser";
import * as fs from 'fs';
import * as path from 'path';

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
 * This script navigates to 99spokes.com and extracts
 * comprehensive data about bicycles available on the site.
 */
async function main() {
  console.log("Starting 99spokes.com bike scraper...");
  const browser = new Browser();
  const allBikes: BikeData[] = [];
  
  // Create a timestamp for this scrape session
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  
  try {
    // Navigate to 99spokes.com
    console.log("Navigating to 99spokes.com...");
    await browser.goto("https://99spokes.com/en-US");
    
    // Accept cookies if prompted
    try {
      await browser.do("Accept cookies if there is a cookie consent dialog");
      console.log("Handled cookie consent dialog");
    } catch (error) {
      console.log("No cookie dialog found or unable to handle it");
    }
    
    // Navigate to the bikes section - try direct URL first
    console.log("Navigating to bikes section...");
    await browser.goto("https://99spokes.com/en-US/bikes");
    
    // Take a screenshot to see what we're working with
    await takeScreenshot(browser, 'bikes_listing_page.png');
    
    // Get the total number of pages to scrape
    console.log("Determining number of pages to scrape...");
    let totalPages = 1;
    try {
      const paginationInfo = await browser.extract({
        totalPages: "number"
      });
      
      // Type assertion to handle the unknown type
      const typedPaginationInfo = paginationInfo as { totalPages?: number };
      totalPages = typedPaginationInfo.totalPages || 1;
    } catch (error) {
      console.log("Could not determine total pages, defaulting to 1");
    }
    console.log(`Found ${totalPages} pages of bikes to scrape`);
    
    // Limit to 3 pages for initial testing
    const pagesToScrape = Math.min(totalPages, 3);
    
    // Loop through each page
    for (let page = 1; page <= pagesToScrape; page++) {
      console.log(`Scraping page ${page} of ${pagesToScrape}...`);
      
      if (page > 1) {
        try {
          // Navigate to the next page
          await browser.do(`Navigate to page ${page} of the bike listings`);
          await takeScreenshot(browser, `bikes_page_${page}.png`);
        } catch (error) {
          console.error(`Error navigating to page ${page}:`, error);
          break; // Stop pagination if we can't navigate further
        }
      }
      
      // Extract bike cards on the current page
      console.log("Extracting bike data from current page...");
      let bikesOnPage: { bikes: BikeData[] } = { bikes: [] };
      
      try {
        const extractedData = await browser.extract({
          bikes: [{
            brand: "string",
            model: "string",
            price: "string?",
            category: "string?",
            url: "string"
          }]
        });
        
        // Type assertion
        bikesOnPage = extractedData as { bikes: BikeData[] };
        
        console.log(`Found ${bikesOnPage.bikes.length} bikes on page ${page}`);
        
        // Save the listing data as a checkpoint
        saveCheckpoint(bikesOnPage.bikes, `bikes_listing_page_${page}`, timestamp);
        
      } catch (error) {
        console.error("Error extracting bike listings:", error);
        await takeScreenshot(browser, `error_extract_listings_page_${page}.png`);
        continue; // Try next page if this one fails
      }
      
      // Limit the number of bikes to scrape per page for testing
      const bikesToScrape = bikesOnPage.bikes.slice(0, 5);
      
      // Visit each bike's detail page to get comprehensive data
      for (let i = 0; i < bikesToScrape.length; i++) {
        const basicBike = bikesToScrape[i];
        console.log(`Scraping details for ${basicBike.brand} ${basicBike.model} (${i+1}/${bikesToScrape.length})...`);
        
        try {
          // Navigate to the bike's detail page
          if (basicBike.url) {
            await browser.goto(basicBike.url);
            await takeScreenshot(browser, `bike_detail_${page}_${i}.png`);
            
            // Extract detailed information
            const extractedDetails = await browser.extract({
              brand: "string",
              model: "string",
              year: "string?",
              price: "string?",
              category: "string?",
              specs: "object?",
              imageUrl: "string?"
            });
            
            // Type assertion
            const detailedBike = extractedDetails as BikeData;
            
            // Merge the basic and detailed information
            const completeBike: BikeData = {
              ...basicBike,
              ...detailedBike,
              url: basicBike.url
            };
            
            // Add to our collection
            allBikes.push(completeBike);
            
            // Save individual bike data as a checkpoint
            saveCheckpoint([completeBike], `bike_${basicBike.brand}_${basicBike.model}`.replace(/[^a-z0-9]/gi, '_').toLowerCase(), timestamp);
          } else {
            console.error(`No URL available for ${basicBike.brand} ${basicBike.model}`);
            continue;
          }
          
        } catch (error) {
          console.error(`Error scraping details for ${basicBike.brand} ${basicBike.model}:`, error);
          // Still add the basic bike info we have
          allBikes.push(basicBike);
          continue; // Continue with next bike
        }
      }
      
      // Go back to the listing page for the next iteration
      if (page < pagesToScrape) {
        await browser.goto("https://99spokes.com/en-US/bikes");
      }
    }
    
    // Save the complete data to a JSON file
    const outputDir = path.join(__dirname, 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `99spokes_bikes_${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(allBikes, null, 2));
    
    console.log(`\nScraping complete! Collected data for ${allBikes.length} bikes.`);
    console.log(`Data saved to: ${outputPath}`);
    
  } catch (error) {
    console.error("Error occurred:", error);
    await takeScreenshot(browser, 'error_main.png');
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