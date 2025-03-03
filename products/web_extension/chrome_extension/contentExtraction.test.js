const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// Skip if running with Selenium and no browser env flag is set
const shouldSkip = process.env.CI || (global.RUNNING_WITH_SELENIUM && !process.env.BROWSER_ENV);
const runTest = shouldSkip ? describe.skip : describe;

runTest('Content Extraction and LLM Parsing Integration', () => {
  let browser;
  let ownsBrowser = false;
  let page;
  const extensionPath = path.resolve(__dirname, '../web_extension/chrome');
  
  // Create test fixtures
  const fixturesDir = path.join(__dirname, 'fixtures');
  const testListingPath = path.join(fixturesDir, 'test-listing.html');
  const testListingUrl = `file://${testListingPath}`;
  
  beforeAll(async () => {
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    
    // Create test fixture HTML
    const bikeListingHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cannondale SuperSix Evo - 54cm - $2800</title>
        </head>
        <body>
          <section class="breadcrumbs">bikes &gt; road bike</section>
          <h1 class="postingtitletext">Cannondale SuperSix Evo - 54cm</h1>
          <span class="price">$2800</span>
          <div id="postingbody">
            Selling my 2020 Cannondale SuperSix Evo. Size 54cm.
            Carbon frame, Ultegra groupset, 700c wheels.
            Excellent condition, only 1000 miles on it.
            No crashes or damage.
          </div>
          <div class="attrgroup">
            <span>condition: excellent</span>
            <span>make: Cannondale</span>
            <span>model: SuperSix Evo</span>
          </div>
          <div class="mapaddress">Berkeley, CA</div>
        </body>
      </html>
    `;
    
    fs.writeFileSync(testListingPath, bikeListingHtml);
    
    try {
      // Use shared browser if running with Selenium and a shared browser exists
      if (global.RUNNING_WITH_SELENIUM && global.sharedBrowser) {
        browser = global.sharedBrowser;
        console.log('Using shared browser instance');
      } else {
        // Create a unique user data dir
        const tmpDir = os.tmpdir();
        const randomId = crypto.randomBytes(8).toString('hex');
        const userDataDir = path.join(tmpDir, `puppeteer_content_${randomId}`);
        
        // Launch browser with selenium-compatible settings
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
      return null;
    }
  });
  
  afterAll(async () => {
    // Only close if we created it and not running with Selenium
    if (ownsBrowser && !global.RUNNING_WITH_SELENIUM && browser) {
      await browser.close();
    }
    
    // Clean up fixtures
    if (fs.existsSync(testListingPath)) {
      fs.unlinkSync(testListingPath);
    }
  });
  
  test('Should extract DOM text and parse it through LLM', async () => {
    page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    await page.goto(testListingUrl, { waitUntil: ['domcontentloaded', 'networkidle0'] });
    
    // Inject necessary scripts
    await page.addScriptTag({ path: path.join(extensionPath, 'llmParser.js') });
    await page.addScriptTag({ path: path.join(extensionPath, 'content.js') });
    
    // Wait for scripts to initialize
    await page.waitForFunction(() => window.__contentScriptReady === true, { timeout: 5000 });
    
    // Test the handleGetListingData function which will extract text and call the LLM
    const result = await page.evaluate(async () => {
      // Get the full text content
      const fullText = document.body.innerText;
      
      // Call the function that would pass this to the LLM
      return await handleGetListingData();
    });
    
    // Verify the structure and content of the result
    expect(result).toHaveProperty('itemType', 'bike');
    expect(result).toHaveProperty('make', 'Cannondale');
    expect(result).toHaveProperty('model', 'SuperSix Evo');
    expect(result).toHaveProperty('askingPrice');
    expect(typeof result.askingPrice).toBe('number');
  }, 20000);
});
