const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

/**
 * This script uses Axios and Cheerio to scrape bicycle data from 99spokes.com
 */
async function main() {
  console.log("Starting 99spokes.com Axios scraper...");
  
  // Create a timestamp for this scrape session
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const allBikes = [];
  
  try {
    // Set up axios with headers to mimic a browser
    const axiosInstance = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 30000
    });
    
    // Navigate to 99spokes.com
    console.log("Fetching 99spokes.com bikes page...");
    const response = await axiosInstance.get('https://99spokes.com/en-US/bikes');
    
    // Parse the HTML
    const $ = cheerio.load(response.data);
    
    // Save the HTML for debugging
    saveHtml(response.data, 'bikes_listing_page_axios.html');
    
    // Extract bike data
    console.log("Extracting bike data...");
    
    // Try different selectors that might match bike cards
    const bikeSelectors = [
      '.bike-card', 
      '[data-testid="bike-card"]', 
      '.card', 
      '.product-card',
      '.bike-list-item',
      '.bike',
      'article'
    ];
    
    let bikeElements = [];
    
    // Try each selector until we find some bikes
    for (const selector of bikeSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} bikes using selector: ${selector}`);
        bikeElements = elements;
        break;
      }
    }
    
    // If we still don't have any bikes, try a more generic approach
    if (bikeElements.length === 0) {
      console.log("No bikes found with specific selectors, trying generic approach...");
      
      // Look for elements that might be bike cards based on content
      $('a').each(function() {
        const text = $(this).text().toLowerCase();
        if (text.includes('bike') || text.includes('bicycle') || text.includes('mountain') || text.includes('road')) {
          bikeElements = bikeElements.concat($(this));
        }
      });
      
      console.log(`Found ${bikeElements.length} potential bike links using generic approach`);
    }
    
    // Extract data from the bike elements
    const bikes = [];
    
    bikeElements.slice(0, 5).each(function(i, element) {
      const el = $(element);
      
      // Try different selectors for each piece of data
      const brandSelectors = ['.brand', '[data-testid="bike-brand"]', '.manufacturer', 'h3', '.title'];
      const modelSelectors = ['.model', '[data-testid="bike-model"]', '.name', 'h4', '.subtitle'];
      const priceSelectors = ['.price', '[data-testid="bike-price"]', '.price', '.cost'];
      const categorySelectors = ['.category', '[data-testid="bike-category"]', '.type', '.bike-type'];
      
      // Extract brand
      let brand = 'Unknown Brand';
      for (const selector of brandSelectors) {
        const brandEl = el.find(selector);
        if (brandEl.length > 0) {
          brand = brandEl.text().trim();
          break;
        }
      }
      
      // Extract model
      let model = 'Unknown Model';
      for (const selector of modelSelectors) {
        const modelEl = el.find(selector);
        if (modelEl.length > 0) {
          model = modelEl.text().trim();
          break;
        }
      }
      
      // Extract price
      let price = '';
      for (const selector of priceSelectors) {
        const priceEl = el.find(selector);
        if (priceEl.length > 0) {
          price = priceEl.text().trim();
          break;
        }
      }
      
      // Extract category
      let category = '';
      for (const selector of categorySelectors) {
        const categoryEl = el.find(selector);
        if (categoryEl.length > 0) {
          category = categoryEl.text().trim();
          break;
        }
      }
      
      // Extract URL
      let url = '';
      const linkEl = el.is('a') ? el : el.find('a');
      if (linkEl.length > 0) {
        url = linkEl.attr('href');
        // Make sure URL is absolute
        if (url && !url.startsWith('http')) {
          url = `https://99spokes.com${url.startsWith('/') ? '' : '/'}${url}`;
        }
      }
      
      bikes.push({
        brand,
        model,
        price,
        category,
        url
      });
    });
    
    console.log(`Extracted data for ${bikes.length} bikes`);
    
    // Save the listing data as a checkpoint
    saveCheckpoint(bikes, `bikes_listing_page_axios`, timestamp);
    
    // Add bikes to our collection
    allBikes.push(...bikes);
    
    // Visit each bike's detail page
    for (let i = 0; i < Math.min(bikes.length, 3); i++) {
      const bike = bikes[i];
      console.log(`Scraping details for ${bike.brand} ${bike.model} (${i+1}/${Math.min(bikes.length, 3)})...`);
      
      if (bike.url) {
        try {
          // Fetch the bike's detail page
          const detailResponse = await axiosInstance.get(bike.url);
          
          // Parse the HTML
          const detailPage = cheerio.load(detailResponse.data);
          
          // Save the HTML for debugging
          saveHtml(detailResponse.data, `bike_detail_axios_${i}.html`);
          
          // Extract specifications
          const specs = {};
          
          // Try different selectors for spec tables
          const specTableSelectors = [
            '.specs-table', 
            '[data-testid="specs-table"]', 
            'table',
            '.specifications',
            '.specs'
          ];
          
          let specTable;
          for (const selector of specTableSelectors) {
            specTable = detailPage(selector);
            if (specTable.length > 0) {
              break;
            }
          }
          
          if (specTable && specTable.length > 0) {
            specTable.find('tr').each(function() {
              const row = detailPage(this);
              const label = row.find('th, td:first-child').text().trim();
              const value = row.find('td, td:last-child').text().trim();
              
              if (label && value) {
                specs[label] = value;
              }
            });
          }
          
          // Extract year
          let year = '';
          const yearSelectors = [
            '.year', 
            '[data-testid="bike-year"]', 
            '.model-year',
            '.year-model'
          ];
          
          for (const selector of yearSelectors) {
            const yearEl = detailPage(selector);
            if (yearEl.length > 0) {
              year = yearEl.text().trim();
              break;
            }
          }
          
          // Extract image URL
          let imageUrl = '';
          const imageSelectors = [
            '.bike-image img', 
            '[data-testid="bike-image"]', 
            '.product-image img',
            '.main-image img',
            '.gallery img'
          ];
          
          for (const selector of imageSelectors) {
            const imageEl = detailPage(selector);
            if (imageEl.length > 0) {
              imageUrl = imageEl.attr('src');
              break;
            }
          }
          
          // Merge the basic and detailed information
          const completeBike = {
            ...bike,
            year,
            specs,
            imageUrl
          };
          
          // Update the bike in our collection
          const index = allBikes.findIndex(b => 
            b.brand === bike.brand && b.model === bike.model);
          
          if (index !== -1) {
            allBikes[index] = completeBike;
          }
          
          // Save individual bike data as a checkpoint
          saveCheckpoint(completeBike, `bike_${bike.brand}_${bike.model}_axios`.replace(/[^a-z0-9]/gi, '_').toLowerCase(), timestamp);
          
        } catch (error) {
          console.error(`Error fetching details for ${bike.brand} ${bike.model}:`, error.message);
        }
      }
    }
    
    // Save the complete data to a JSON file
    const outputDir = path.join(__dirname, 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `99spokes_bikes_axios_${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(allBikes, null, 2));
    
    console.log(`\nScraping complete! Collected data for ${allBikes.length} bikes.`);
    console.log(`Data saved to: ${outputPath}`);
    
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