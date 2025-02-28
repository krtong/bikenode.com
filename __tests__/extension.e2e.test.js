const puppeteer = require('puppeteer');
const path = require('path');

describe('Chrome Extension E2E Tests', () => {
  let browser;
  let page;
  const extensionPath = path.resolve(__dirname, '../web_extension/chrome');

  beforeAll(async () => {
    // Launch browser with the extension loaded
    browser = await puppeteer.launch({
      headless: false, // Extensions require non-headless mode
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox'
      ]
    });
    
    // Wait for extension to load fully
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 30000);

  afterAll(async () => {
    if (browser) await browser.close();
  });

  test('Extension loads and popup displays correctly', async () => {
    // Get the extension background page target
    const targets = await browser.targets();
    const extTarget = targets.find(target => 
      target.type() === 'background_page' || 
      (target.type() === 'service_worker' && target.url().includes('chrome-extension://'))
    );
    
    if (!extTarget) {
      throw new Error('Extension background page not found');
    }
    
    // Get extension ID from the background page URL
    const extensionUrl = extTarget.url();
    const extensionID = extensionUrl.split('/')[2];
    
    // Open extension popup
    page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionID}/popup.html`);
    
    // Verify popup contents
    const title = await page.$eval('h1', el => el.textContent);
    expect(title).toBe('Craigslist to JSON');
    
    const buttonText = await page.$eval('#convert-button', button => button.textContent);
    expect(buttonText).toBe('Convert to JSON');
    
    const statusMessage = await page.$eval('#status-message', el => el.textContent);
    expect(statusMessage).toContain('Navigate to a Craigslist post');
  }, 15000);
});