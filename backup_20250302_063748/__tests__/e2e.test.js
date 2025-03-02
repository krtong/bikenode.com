const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// Skip if running with Selenium without browser env flag
const shouldSkip = process.env.CI || (global.RUNNING_WITH_SELENIUM && !process.env.BROWSER_ENV);
const runTest = shouldSkip ? describe.skip : describe;

runTest('Bike Extension E2E Tests', () => {
  let browser;
  let ownsBrowser = false;
  let page;
  const extensionPath = path.resolve(__dirname, '../web_extension/chrome');
  const extensionId = 'EXTENSION_ID'; // This would need to be dynamically determined
  
  // Create a mock bike listing page
  const mockBikeListingPath = path.join(__dirname, 'fixtures', 'bike-listing-e2e.html');
  const mockBikeListingUrl = `file://${mockBikeListingPath}`;
  
  beforeAll(async () => {
    const fixturesDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    
    // Create a mock bike listing page for E2E testing
    const bikeListingHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cannondale SuperSix EVO - 54cm - $3200 (Oakland)</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; }
            .postingtitletext { font-size: 24px; font-weight: bold; }
            .price { font-size: 20px; color: #090; }
            #postingbody { margin: 20px 0; line-height: 1.5; }
            .gallery { display: flex; flex-wrap: wrap; gap: 10px; }
            .gallery img { width: 200px; height: auto; }
          </style>
        </head>
        <body>
          <section class="breadcrumbs">bikes > road bike</section>
          <h1 class="postingtitletext">Cannondale SuperSix EVO - 54cm</h1>
          <span class="price">$3200</span>
          <div id="postingbody">
            2021 Cannondale SuperSix EVO in excellent condition.
            Carbon frame, Shimano Ultegra groupset, 54cm frame size.
            700c wheels, hydraulic disc brakes.
            Very light and fast road bike. Only selling because I'm getting a different size.
          </div>
          <div class="attrgroup">
            <span>condition: excellent</span>
            <span>make: Cannondale</span>
            <span>model: SuperSix EVO</span>
          </div>
          <div class="mapaddress">Oakland, CA</div>
          <div class="postinginfos">
            post id: 98761234
            posted: 2023-06-10 09:45
          </div>
          <div class="gallery">
            <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='150'><rect width='100%' height='100%' fill='%23ddd'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23555'>Bike Image 1</text></svg>">
            <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='150'><rect width='100%' height='100%' fill='%23ddd'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23555'>Bike Image 2</text></svg>">
          </div>
        </body>
      </html>
    `;
    
    fs.writeFileSync(mockBikeListingPath, bikeListingHtml);
    
    // This test requires manual setup as we need the extension ID
    console.log("⚠️ NOTE: This test requires a manual run of the extension to get the extension ID.");
    console.log("Skipping browser launch since this test is incomplete");
    
    // Only launch a browser if we're really going to use it
    if (!process.env.SKIP_BROWSER_LAUNCH) {
      try {
        // Use shared browser if running with Selenium and a shared browser exists
        if (global.RUNNING_WITH_SELENIUM && global.sharedBrowser) {
          browser = global.sharedBrowser;
          console.log('Using shared browser instance');
        } else {
          // Create a unique user data dir
          const tmpDir = os.tmpdir();
          const randomId = crypto.randomBytes(8).toString('hex');
          const userDataDir = path.join(tmpDir, `puppeteer_e2e_ext_${randomId}`);
          
          browser = await puppeteer.launch({
            headless: "new",
            args: [
              `--disable-extensions-except=${extensionPath}`,
              `--load-extension=${extensionPath}`,
              '--no-sandbox',
              '--disable-dev-shm-usage',
              `--user-data-dir=${userDataDir}`
            ]
          });
          ownsBrowser = true;
          
          // Store for other tests if running with Selenium
          if (global.RUNNING_WITH_SELENIUM) {
            global.sharedBrowser = browser;
            console.log('Created shared browser instance');
          }
        }
      } catch (err) {
        console.error('Failed to launch browser:', err);
      }
    }
  }, 30000);
  
  afterAll(async () => {
    // Only close if we created it and not running with Selenium
    if (ownsBrowser && !global.RUNNING_WITH_SELENIUM && browser) {
      await browser.close();
    }
    
    // Clean up the fixture file
    if (fs.existsSync(mockBikeListingPath)) {
      fs.unlinkSync(mockBikeListingPath);
    }
  });
  
  // This is a placeholder test - e2e testing with extension popups is complex
  test.skip('Extension should identify and parse bike data when button clicked', async () => {
    // This would require complex setup with extension handling
    // Left as a placeholder for manual testing
  }, 30000);
});
