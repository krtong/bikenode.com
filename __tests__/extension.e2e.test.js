const puppeteer = require('puppeteer');
const path = require('path');

describe('Chrome Extension E2E Tests', () => {
  let browser;
  let page;
  const extensionPath = path.resolve(__dirname, '../web_extension/chrome');

  beforeAll(async () => {
    // Launch browser with the system Chrome/Chromium instead
    browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // Path to Chrome on macOS
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
    // Find the extension background page or service worker
    const targets = await browser.targets();
    const extTarget = targets.find(target => 
      target.type() === 'background_page' || 
      (target.type() === 'service_worker' && target.url().includes('chrome-extension://'))
    );
    
    if (!extTarget) {
      throw new Error('Extension background page not found');
    }
    
    // Extract extension ID from URL
    const extensionUrl = extTarget.url();
    const extensionID = extensionUrl.split('/')[2];
    
    // Open extension popup
    page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionID}/popup.html`);
    
    // Verify popup contents
    const title = await page.$eval('h1', el => el.textContent);
    expect(title).toBe('Craigslist to JSON');
  }, 15000);
});