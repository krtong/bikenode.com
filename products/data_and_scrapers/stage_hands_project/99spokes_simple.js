const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * This script uses Puppeteer to scrape bicycle data from 99spokes.com
 */
async function main() {
  console.log("Starting 99spokes.com simple scraper...");
  
  // Create a timestamp for this scrape session
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const allBikes = [];
  
  // Launch browser
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to 99spokes.com
    console.log("Navigating to 99spokes.com...");
    await page.goto("https://99spokes.com/en-US/bikes", { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Take a screenshot
    await takeScreenshot(page, 'bikes_listing_page_simple.png');
    
    // Extract bike data
    console.log("Extracting bike data...");
    const bikes = await page.evaluate(() => {
      const bikeCards = Array.from(document.querySelectorAll('.bike-card, [data-testid="bike-card"]'));
      
      return bikeCards.slice(0, 5).map(card => {
        // Extract data from each card
        const brand = card.querySelector('.brand, [data-testid="bike-brand"]')?.textContent?.trim() || 'Unknown Brand';
        const model = card.querySelector('.model, [data-testid="bike-model"]')?.textContent?.trim() || 'Unknown Model';
        const price = card.querySelector('.price, [data-testid="bike-price"]')?.textContent?.trim();
        const category = card.querySelector('.category, [data-testid="bike-category"]')?.textContent?.trim();
        const url = card.querySelector('a')?.href;
        
        return {
          brand,
          model,
          price,
          category,
          url
        };
      });
    });
    
    console.log(`Found ${bikes.length} bikes on the page`);
    
    // Save the listing data as a checkpoint
    saveCheckpoint(bikes, `bikes_listing_page_simple`, timestamp);
    
    // Add bikes to our collection
    allBikes.push(...bikes);
    
    // Visit each bike's detail page
    for (let i = 0; i < Math.min(bikes.length, 3); i++) {
      const bike = bikes[i];
      console.log(`Scraping details for ${bike.brand} ${bike.model} (${i+1}/${Math.min(bikes.length, 3)})...`);
      
      if (bike.url) {
        // Navigate to the bike's detail page
        await page.goto(bike.url, { 
          waitUntil: 'networkidle2',
          timeout: 60000
        });
        
        // Take a screenshot
        await takeScreenshot(page, `bike_detail_simple_${i}.png`);
        
        // Extract detailed information
        const details = await page.evaluate(() => {
          // Extract specifications
          const specRows = Array.from(document.querySelectorAll('.specs-table tr, [data-testid="specs-row"]'));
          const specs = {};
          
          specRows.forEach(row => {
            const label = row.querySelector('th, [data-testid="spec-label"]')?.textContent?.trim();
            const value = row.querySelector('td, [data-testid="spec-value"]')?.textContent?.trim();
            
            if (label && value) {
              specs[label] = value;
            }
          });
          
          // Extract other details
          const year = document.querySelector('.year, [data-testid="bike-year"]')?.textContent?.trim();
          const imageUrl = document.querySelector('.bike-image img, [data-testid="bike-image"]')?.src;
          
          return {
            year,
            specs,
            imageUrl
          };
        });
        
        // Merge the basic and detailed information
        const completeBike = {
          ...bike,
          ...details
        };
        
        // Update the bike in our collection
        const index = allBikes.findIndex(b => 
          b.brand === bike.brand && b.model === bike.model);
        
        if (index !== -1) {
          allBikes[index] = completeBike;
        }
        
        // Save individual bike data as a checkpoint
        saveCheckpoint(completeBike, `bike_${bike.brand}_${bike.model}_simple`.replace(/[^a-z0-9]/gi, '_').toLowerCase(), timestamp);
      }
    }
    
    // Save the complete data to a JSON file
    const outputDir = path.join(__dirname, 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `99spokes_bikes_simple_${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(allBikes, null, 2));
    
    console.log(`\nScraping complete! Collected data for ${allBikes.length} bikes.`);
    console.log(`Data saved to: ${outputPath}`);
    
  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    // Always close the browser
    await browser.close();
    console.log("Browser closed.");
  }
}

/**
 * Takes a screenshot and saves it to the screenshots directory
 */
async function takeScreenshot(page, filename) {
  try {
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    const screenshotPath = path.join(screenshotsDir, filename);
    await page.screenshot({ path: screenshotPath });
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