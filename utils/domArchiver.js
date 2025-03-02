/**
 * DOM Archiver - Captures and archives real DOM data from websites for testing
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Archives DOM content from specified URLs
 * @param {Array<string>} urls - URLs to archive
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} - Array of archive results
 */
async function archiveUrls(urls, options = {}) {
  const defaultOptions = {
    outputDir: path.join(__dirname, '../__tests__/fixtures/archived-dom'),
    screenshotDir: path.join(__dirname, '../__tests__/fixtures/screenshots'),
    maxUrls: 10,
    browserOptions: {
      headless: "new"
    },
    selectors: {
      listingsPage: '.result-title', // For listings pages, selector for individual listings
      nextPage: '.button.next',      // For pagination
    }
  };
  
  const config = { ...defaultOptions, ...options };
  
  // Ensure output directories exist
  [config.outputDir, config.screenshotDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Launch the browser
  const browser = await puppeteer.launch(config.browserOptions);
  const page = await browser.newPage();
  
  const results = [];
  
  try {
    // Archive each provided URL
    for (const url of urls.slice(0, config.maxUrls)) {
      // Generate archive filenames based on URL
      const urlHash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileBaseName = `${urlHash}_${timestamp}`;
      
      console.log(`Archiving: ${url}`);
      
      try {
        // Navigate to the URL
        await page.goto(url, { waitUntil: ['domcontentloaded', 'networkidle2'] });
        
        // Determine if this is a listings page or individual listing
        const isListingsPage = await page.evaluate(
          selector => document.querySelectorAll(selector).length > 1,
          config.selectors.listingsPage
        );
        
        // For listings pages, also archive 2-3 individual listings
        const archivedListings = [];
        
        if (isListingsPage) {
          // Take screenshot of listings page
          await page.screenshot({
            path: path.join(config.screenshotDir, `${fileBaseName}_listings.png`),
            fullPage: true
          });
          
          // Save HTML of listings page
          const listingsHtml = await page.content();
          fs.writeFileSync(
            path.join(config.outputDir, `${fileBaseName}_listings.html`),
            listingsHtml
          );
          
          // Get links to individual listings
          const listingUrls = await page.evaluate(selector => {
            const links = Array.from(document.querySelectorAll(selector));
            return links.slice(0, 3).map(link => link.href);
          }, config.selectors.listingsPage);
          
          // Archive each individual listing
          for (const [index, listingUrl] of listingUrls.entries()) {
            await page.goto(listingUrl, { waitUntil: ['domcontentloaded', 'networkidle2'] });
            
            const listingFileBaseName = `${fileBaseName}_listing_${index}`;
            
            // Take screenshot
            await page.screenshot({
              path: path.join(config.screenshotDir, `${listingFileBaseName}.png`),
              fullPage: true
            });
            
            // Save HTML
            const listingHtml = await page.content();
            const listingOutputPath = path.join(config.outputDir, `${listingFileBaseName}.html`);
            fs.writeFileSync(listingOutputPath, listingHtml);
            
            // Store metadata
            const title = await page.title();
            const description = await page.evaluate(() => {
              const metaDesc = document.querySelector('meta[name="description"]');
              return metaDesc ? metaDesc.getAttribute('content') : '';
            });
            
            archivedListings.push({
              url: listingUrl,
              title,
              description,
              archivePath: listingOutputPath,
              screenshotPath: path.join(config.screenshotDir, `${listingFileBaseName}.png`)
            });
          }
          
          results.push({
            url,
            type: 'listings_page',
            archivedListings,
            archivePath: path.join(config.outputDir, `${fileBaseName}_listings.html`),
            screenshotPath: path.join(config.screenshotDir, `${fileBaseName}_listings.png`)
          });
        } else {
          // Single listing page
          // Take screenshot
          await page.screenshot({
            path: path.join(config.screenshotDir, `${fileBaseName}.png`),
            fullPage: true
          });
          
          // Save HTML
          const html = await page.content();
          const outputPath = path.join(config.outputDir, `${fileBaseName}.html`);
          fs.writeFileSync(outputPath, html);
          
          // Store metadata
          const title = await page.title();
          const description = await page.evaluate(() => {
            const metaDesc = document.querySelector('meta[name="description"]');
            return metaDesc ? metaDesc.getAttribute('content') : '';
          });
          
          results.push({
            url,
            type: 'single_listing',
            title,
            description,
            archivePath: outputPath,
            screenshotPath: path.join(config.screenshotDir, `${fileBaseName}.png`)
          });
        }
      } catch (error) {
        console.error(`Error archiving ${url}:`, error);
        results.push({
          url,
          error: error.message,
          success: false
        });
      }
    }
  } finally {
    await browser.close();
  }
  
  // Write index file with all archived content
  const indexPath = path.join(config.outputDir, 'archive-index.json');
  fs.writeFileSync(indexPath, JSON.stringify({
    createdAt: new Date().toISOString(),
    results
  }, null, 2));
  
  return results;
}

/**
 * Command line interface for archiving
 */
async function runCli() {
  // Simple argument parsing
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
DOM Archiver - Capture real DOM data for testing

Usage:
  node domArchiver.js [options] <url> [<url2> ...]

Options:
  --output-dir=PATH    Set the output directory
  --max=NUMBER         Maximum number of URLs to process
  --help               Show this help message

Examples:
  node domArchiver.js https://sfbay.craigslist.org/search/bia
  node domArchiver.js --output-dir=./my-archives --max=5 https://example.com
    `);
    return;
  }
  
  // Parse options
  const options = {};
  const urls = [];
  
  for (const arg of args) {
    if (arg.startsWith('--output-dir=')) {
      options.outputDir = arg.split('=')[1];
    } else if (arg.startsWith('--max=')) {
      options.maxUrls = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('http')) {
      urls.push(arg);
    }
  }
  
  if (urls.length === 0) {
    console.error('Error: No URLs provided');
    process.exit(1);
  }
  
  // Run the archiver
  console.log(`Archiving ${urls.length} URLs...`);
  const results = await archiveUrls(urls, options);
  
  console.log(`Archived ${results.length} URLs successfully.`);
  console.log(`Archive index saved at: ${path.join(options.outputDir || '../__tests__/fixtures/archived-dom', 'archive-index.json')}`);
}

// If this file is called directly (not imported)
if (require.main === module) {
  runCli().catch(error => {
    console.error('Error running DOM archiver:', error);
    process.exit(1);
  });
}

module.exports = { archiveUrls };
