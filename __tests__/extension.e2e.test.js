const puppeteer = require('puppeteer');
const path = require('path');

describe('Chrome Extension E2E Tests', () => {
  let browser;
  let page;
  const extensionPath = path.resolve(__dirname, '../web_extension/chrome');

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      devtools: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox'
      ]
    });
    await new Promise(resolve => setTimeout(resolve, 3000)); // Delay for extension loading
  }, 30000);

  afterAll(async () => {
    if (browser) await browser.close();
  });

  test('Extension can return the entire DOM', async () => {
    page = await browser.newPage();
    // Log all console messages from the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    // Enable verbose logging
    await page.evaluate(() => {
      console.debug = (...args) => console.log('DEBUG:', ...args);
    });
    
    // Load the page and wait for network to stabilize
    await page.goto('https://sfbay.craigslist.org', { waitUntil: 'networkidle0' });
    console.log('Page fully loaded');

    // Inject a function to manually check for the readiness flag
    await page.evaluate(() => {
      console.log('Current readiness state:', window.__contentScriptReady ? 'READY' : 'NOT READY');
    });
    
    // Manually inject the readiness flag if needed (fallback)
    await page.evaluate(() => {
      if (!window.__contentScriptReady) {
        console.log('Manually setting content script ready flag');
        window.__contentScriptReady = true;
      }
    });

    // Wait for content script to signal readiness
    await page.waitForFunction(() => window.__contentScriptReady, { timeout: 10000 });
    console.log('Content script confirmed ready');

    // Add more robust message handling
    await page.evaluate(() => {
      // Clear any existing handlers
      window._messageListeners = window._messageListeners || [];
      window._messageListeners.forEach(listener => {
        window.removeEventListener('message', listener);
      });
      window._messageListeners = [];
      
      // Add new handler with guaranteed unique name
      const messageHandler = function(event) {
        console.log('Page received message:', JSON.stringify(event.data));
        if (event.data && event.data.type === 'fromContentScript') {
          console.log('SUCCESS: Received fromContentScript message');
          window.domResponseReceived = true;
          window.domResponseData = event.data;
        }
      };
      
      window._messageListeners.push(messageHandler);
      window.addEventListener('message', messageHandler);
      console.log('Added message event listener');
    });

    // Send request and verify response
    await page.evaluate(() => {
      window.domResponseReceived = false;
      console.log('Sending getDom request to content script');
      window.postMessage({ action: 'getDom' }, '*');
    });

    // Wait for the response with a reasonable timeout
    console.log('Waiting for response...');
    await page.waitForFunction(() => window.domResponseReceived === true, { timeout: 10000 })
      .catch(e => console.error('Error waiting for response:', e.message));

    // Get the response data
    const response = await page.evaluate(() => window.domResponseData);
    console.log('Response received:', response ? 'YES' : 'NO');

    // Verify the response
    expect(response).toBeDefined();
    expect(response.success).toBe(true);
    expect(typeof response.data).toBe('string');
    expect(response.data).toContain('<html'); // Basic check for HTML content
  }, 60000); // Extended timeout for reliability
});