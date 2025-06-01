const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

// Add the stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

/**
 * This script uses puppeteer-extra with stealth plugin to bypass Cloudflare protection
 * and scrape bicycle data from 99spokes.com
 */
async function main() {
  console.log("Starting 99spokes.com scraper with Cloudflare bypass...");
  
  // Create a timestamp for this scrape session
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const allBikes = [];
  
  // Launch browser with stealth mode
  console.log("Launching browser in stealth mode...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    
    // Set extra headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    });
    
    // Enable JavaScript
    await page.setJavaScriptEnabled(true);
    
    // Navigate to 99spokes.com
    console.log("Navigating to 99spokes.com...");
    
    // Set a longer timeout for navigation to allow Cloudflare challenge to be solved
    await page.goto("https://99spokes.com/en-US/bikes", { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait a bit to ensure Cloudflare challenge is completed
    console.log("Waiting for Cloudflare challenge to complete...");
    await page.waitForTimeout(10000);
    
    // Take a screenshot to see what we're working with
    await takeScreenshot(page, 'bikes_listing_page_cloudflare_bypass.png');
    
    // Save the HTML for debugging
    const html = await page.content();
    saveHtml(html, 'bikes_listing_page_cloudflare_bypass.html');
    
    // Check if we're still on the Cloudflare challenge page
    const pageTitle = await page.title();
    if (pageTitle.includes('Just a moment') || pageTitle.includes('Attention Required')) {
      console.log("Still on Cloudflare challenge page. Waiting longer...");
      await page.waitForTimeout(20000);
      await takeScreenshot(page, 'cloudflare_challenge_page.png');
      
      // Try to solve the challenge by clicking buttons if present
      try {
        const challengeButton = await page.$('input[type="button"], button');
        if (challengeButton) {
          console.log("Found challenge button, clicking it...");
          await challengeButton.click();
          await page.waitForTimeout(10000);
          await takeScreenshot(page, 'after_clicking_challenge_button.png');
        }
      } catch (error) {
        console.log("No challenge button found or error clicking it:", error.message);
      }
    }
    
    // Extract bike data
    console.log("Extracting bike data...");
    const bikes = await page.evaluate(() => {
      // Try different selectors that might match bike cards
      const selectors = [
        '.bike-card', 
        '[data-testid="bike-card"]', 
        '.card', 
        '.product-card',
        '.bike-list-item',
        '.bike',
        'article',
        // More generic selectors
        'a[href*="/bikes/"]',
        'div.grid > div'
      ];
      
      let bikeElements = [];
      
      // Try each selector until we find some bikes
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} bikes using selector: ${selector}`);
          bikeElements = Array.from(elements);
          break;
        }
      }
      
      // If we still don't have any bikes, try a more generic approach
      if (bikeElements.length === 0) {
        // Look for elements that might be bike cards based on content
        const allLinks = document.querySelectorAll('a');
        bikeElements = Array.from(allLinks).filter(el => {
          const text = el.textContent.toLowerCase();
          const href = el.href.toLowerCase();
          return (text.includes('bike') || text.includes('bicycle') || 
                 href.includes('/bikes/') || href.includes('/bicycle/'));
        });
      }
      
      // Extract data from the bike elements
      return bikeElements.slice(0, 5).map(el => {
        // Try different selectors for each piece of data
        const brandSelectors = ['.brand', '[data-testid="bike-brand"]', '.manufacturer', 'h3', '.title'];
        const modelSelectors = ['.model', '[data-testid="bike-model"]', '.name', 'h4', '.subtitle'];
        const priceSelectors = ['.price', '[data-testid="bike-price"]', '.price', '.cost'];
        const categorySelectors = ['.category', '[data-testid="bike-category"]', '.type', '.bike-type'];
        
        // Helper function to find text using selectors
        const findText = (element, selectors) => {
          for (const selector of selectors) {
            const el = element.querySelector(selector);
            if (el && el.textContent.trim()) {
              return el.textContent.trim();
            }
          }
          return '';
        };
        
        // Extract data
        const brand = findText(el, brandSelectors) || 'Unknown Brand';
        const model = findText(el, modelSelectors) || 'Unknown Model';
        const price = findText(el, priceSelectors) || '';
        const category = findText(el, categorySelectors) || '';
        
        // Extract URL
        let url = '';
        if (el.tagName === 'A') {
          url = el.href;
        } else {
          const linkEl = el.querySelector('a');
          if (linkEl) {
            url = linkEl.href;
          }
        }
        
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
    saveCheckpoint(bikes, `bikes_listing_page_cloudflare_bypass`, timestamp);
    
    // Add bikes to our collection
    allBikes.push(...bikes);
    
    // Visit each bike's detail page
    for (let i = 0; i < Math.min(bikes.length, 3); i++) {
      const bike = bikes[i];
      console.log(`Scraping details for ${bike.brand} ${bike.model} (${i+1}/${Math.min(bikes.length, 3)})...`);
      
      if (bike.url) {
        try {
          // Navigate to the bike's detail page
          await page.goto(bike.url, { 
            waitUntil: 'networkidle2',
            timeout: 30000
          });
          
          // Take a screenshot
          await takeScreenshot(page, `bike_detail_cloudflare_bypass_${i}.png`);
          
          // Save the HTML for debugging
          const detailHtml = await page.content();
          saveHtml(detailHtml, `bike_detail_cloudflare_bypass_${i}.html`);
          
          // Extract detailed information
          const details = await page.evaluate(() => {
            // Extract specifications
            const specRows = Array.from(document.querySelectorAll('.specs-table tr, [data-testid="specs-row"], table tr'));
            const specs = {};
            
            specRows.forEach(row => {
              const label = row.querySelector('th, [data-testid="spec-label"], td:first-child')?.textContent?.trim();
              const value = row.querySelector('td, [data-testid="spec-value"], td:last-child')?.textContent?.trim();
              
              if (label && value) {
                specs[label] = value;
              }
            });
            
            // Extract other details
            const yearSelectors = ['.year', '[data-testid="bike-year"]', '.model-year', '.year-model'];
            let year = '';
            for (const selector of yearSelectors) {
              const el = document.querySelector(selector);
              if (el && el.textContent.trim()) {
                year = el.textContent.trim();
                break;
              }
            }
            
            // Extract image URL
            const imageSelectors = ['.bike-image img', '[data-testid="bike-image"]', '.product-image img', '.main-image img', '.gallery img'];
            let imageUrl = '';
            for (const selector of imageSelectors) {
              const el = document.querySelector(selector);
              if (el && el.src) {
                imageUrl = el.src;
                break;
              }
            }
            
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
          saveCheckpoint(completeBike, `bike_${bike.brand}_${bike.model}_cloudflare_bypass`.replace(/[^a-z0-9]/gi, '_').toLowerCase(), timestamp);
          
          // Add a delay between requests to avoid triggering anti-bot measures
          console.log("Waiting before next request...");
          await page.waitForTimeout(5000);
          
        } catch (error) {
          console.error(`Error scraping details for ${bike.brand} ${bike.model}:`, error.message);
        }
      }
    }
    
    // Save the complete data to a JSON file
    const outputDir = path.join(__dirname, 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `99spokes_bikes_cloudflare_bypass_${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(allBikes, null, 2));
    
    console.log(`\nScraping complete! Collected data for ${allBikes.length} bikes.`);
    console.log(`Data saved to: ${outputPath}`);
    
  } catch (error) {
    console.error("Error occurred:", error.message);
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
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${filename}`);
  } catch (error) {
    console.error(`Failed to take screenshot ${filename}:`, error.message);
  }
}

/**
 * Saves HTML to a file for debugging
 */
function saveHtml(html, filename) {
  try {
    const htmlDir = path.join(__dirname, 'html');
    if (!fs.existsSync(htmlDir)) {
      fs.mkdirSync(htmlDir, { recursive: true });
    }
    
    const htmlPath = path.join(htmlDir, filename);
    fs.writeFileSync(htmlPath, html);
    console.log(`HTML saved: ${filename}`);
  } catch (error) {
    console.error(`Failed to save HTML ${filename}:`, error.message);
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
    console.error(`Failed to save checkpoint ${name}:`, error.message);
  }
}

// Run the main function
main().catch(err => {
  console.error("Unhandled error:", err.message);
  process.exit(1);
});