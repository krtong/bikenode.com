const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

/**
 * This script uses a combination of techniques to bypass Cloudflare protection
 * and scrape bicycle data from 99spokes.com
 */
async function main() {
  console.log("Starting 99spokes.com scraper with alternative Cloudflare bypass...");
  
  // Create a timestamp for this scrape session
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  
  try {
    // Create directories for output
    const outputDirs = ['data', 'html', 'screenshots', 'checkpoints'];
    for (const dir of outputDirs) {
      const dirPath = path.join(__dirname, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
    
    // Use curl with specific headers to bypass Cloudflare
    console.log("Fetching 99spokes.com with curl...");
    const curlCommand = `curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36" -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8" -H "Accept-Language: en-US,en;q=0.9" -H "Accept-Encoding: gzip, deflate, br" -H "Connection: keep-alive" -H "Upgrade-Insecure-Requests: 1" -H "Sec-Fetch-Dest: document" -H "Sec-Fetch-Mode: navigate" -H "Sec-Fetch-Site: none" -H "Sec-Fetch-User: ?1" -H "Cache-Control: max-age=0" --compressed "https://99spokes.com/en-US/bikes"`;
    
    let html = '';
    try {
      html = execSync(curlCommand).toString();
      console.log(`Received HTML response (${html.length} bytes)`);
      
      // Save the HTML for debugging
      saveHtml(html, 'bikes_listing_page_curl.html');
      
      // Check if we got the Cloudflare challenge page
      if (html.includes('Just a moment') || html.includes('Attention Required')) {
        console.log("Received Cloudflare challenge page. Trying alternative approach...");
        
        // Try with a different user agent
        const altCurlCommand = `curl -s -L -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15" -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" -H "Accept-Language: en-US,en;q=0.9" --compressed "https://99spokes.com/en-US/bikes"`;
        
        html = execSync(altCurlCommand).toString();
        console.log(`Received HTML response with alternative user agent (${html.length} bytes)`);
        
        // Save the HTML for debugging
        saveHtml(html, 'bikes_listing_page_curl_alt.html');
      }
    } catch (error) {
      console.error("Error executing curl command:", error.message);
    }
    
    // Parse the HTML to extract bike data
    console.log("Parsing HTML to extract bike data...");
    
    // Simple HTML parsing function
    function extractBikes(html) {
      const bikes = [];
      
      // Extract bike cards using regex patterns
      const bikeCardPattern = /<div[^>]*class="[^"]*bike-card[^"]*"[^>]*>(.*?)<\/div>/gs;
      const bikeCards = html.match(bikeCardPattern) || [];
      
      console.log(`Found ${bikeCards.length} potential bike cards`);
      
      // Extract data from each bike card
      for (let i = 0; i < Math.min(bikeCards.length, 5); i++) {
        const card = bikeCards[i];
        
        // Extract brand
        const brandPattern = /<[^>]*class="[^"]*brand[^"]*"[^>]*>(.*?)<\/[^>]*>/s;
        const brandMatch = card.match(brandPattern);
        const brand = brandMatch ? cleanHtml(brandMatch[1]) : 'Unknown Brand';
        
        // Extract model
        const modelPattern = /<[^>]*class="[^"]*model[^"]*"[^>]*>(.*?)<\/[^>]*>/s;
        const modelMatch = card.match(modelPattern);
        const model = modelMatch ? cleanHtml(modelMatch[1]) : 'Unknown Model';
        
        // Extract price
        const pricePattern = /<[^>]*class="[^"]*price[^"]*"[^>]*>(.*?)<\/[^>]*>/s;
        const priceMatch = card.match(pricePattern);
        const price = priceMatch ? cleanHtml(priceMatch[1]) : '';
        
        // Extract category
        const categoryPattern = /<[^>]*class="[^"]*category[^"]*"[^>]*>(.*?)<\/[^>]*>/s;
        const categoryMatch = card.match(categoryPattern);
        const category = categoryMatch ? cleanHtml(categoryMatch[1]) : '';
        
        // Extract URL
        const urlPattern = /<a[^>]*href="([^"]*)"[^>]*>/s;
        const urlMatch = card.match(urlPattern);
        let url = urlMatch ? urlMatch[1] : '';
        
        // Make sure URL is absolute
        if (url && !url.startsWith('http')) {
          url = `https://99spokes.com${url.startsWith('/') ? '' : '/'}${url}`;
        }
        
        bikes.push({
          brand,
          model,
          price,
          category,
          url
        });
      }
      
      return bikes;
    }
    
    // Helper function to clean HTML
    function cleanHtml(html) {
      return html.replace(/<[^>]*>/g, '').trim();
    }
    
    // Extract bikes from the HTML
    const bikes = extractBikes(html);
    console.log(`Extracted data for ${bikes.length} bikes`);
    
    // Save the bike data
    if (bikes.length > 0) {
      // Save as checkpoint
      saveCheckpoint(bikes, `bikes_listing_page_alt_cloudflare`, timestamp);
      
      // Save to data directory
      const outputPath = path.join(__dirname, 'data', `99spokes_bikes_alt_cloudflare_${timestamp}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(bikes, null, 2));
      
      console.log(`\nScraping complete! Collected data for ${bikes.length} bikes.`);
      console.log(`Data saved to: ${outputPath}`);
    } else {
      console.log("No bikes found in the HTML. Check the saved HTML files for debugging.");
    }
    
  } catch (error) {
    console.error("Error occurred:", error.message);
  }
}

/**
 * Saves HTML to a file for debugging
 */
function saveHtml(html, filename) {
  try {
    const htmlDir = path.join(__dirname, 'html');
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