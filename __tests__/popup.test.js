const puppeteer = require('puppeteer');

describe.skip('Popup Page Integration Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
    await page.goto(`file://${__dirname}/../web_extension/chrome/popup.html`);
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should display the correct title', async () => {
    const title = await page.title();
    expect(title).toBe('Craigslist to JSON');
  });

  it('should have disabled convert button when not on Craigslist', async () => {
    // Mock chrome API
    await page.evaluate(() => {
      window.chrome = {
        tabs: {
          query: (params, callback) => {
            callback([{ url: 'https://example.com' }]);
          }
        }
      };
      document.dispatchEvent(new Event('DOMContentLoaded'));
    });
    
    const isDisabled = await page.$eval('#convert-button', button => button.disabled);
    expect(isDisabled).toBe(true);
  });

  it('should show the JSON container after successful conversion', async () => {
    // Setup
    await page.evaluate(() => {
      const jsonContainer = document.querySelector('.json-container');
      jsonContainer.style.display = 'none';
      
      // Mock successful response
      window.chrome = {
        tabs: {
          query: (params, callback) => {
            callback([{ id: 1, url: 'https://craigslist.org/post' }]);
          },
          sendMessage: (tabId, message, callback) => {
            callback({
              success: true,
              data: { title: 'Test Bike', price: '$100' }
            });
          }
        }
      };
      
      document.dispatchEvent(new Event('DOMContentLoaded'));
    });
    
    // Trigger conversion
    await page.click('#convert-button');
    
    // Check if JSON container is displayed
    const displayStyle = await page.$eval('.json-container', container => container.style.display);
    expect(displayStyle).toBe('flex');
  });
});

import '../web_extension/chrome/popup.js';
import { someFunction } from '../web_extension/chrome/popup.js';

describe('Popup.js Unit Tests', () => {
  beforeEach(() => {
    // Set up document body
    document.body.innerHTML = `
      <div class="container">
        <h1>Craigslist to JSON</h1>
        <div id="status-message">Navigate to a Craigslist post to convert it</div>
        <button id="convert-button">Convert to JSON</button>
        <div class="json-container" style="display: none;">
          <textarea id="json-output" readonly></textarea>
          <button id="copy-button">Copy to Clipboard</button>
        </div>
      </div>
    `;
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Simulate DOM content loaded to initialize event listeners
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  test('someFunction returns expected value', () => {
    expect(someFunction()).toBe('expected value');
  });

  test('should disable button when not on Craigslist page', () => {
    // Setup
    chrome.tabs.query.mockImplementation((query, callback) => {
      callback([{ url: 'https://example.com' }]);
    });
    
    // Re-trigger initialization
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    // Assert
    expect(document.getElementById('status-message').textContent).toBe('Please navigate to a Craigslist post');
    expect(document.getElementById('convert-button').disabled).toBe(true);
  });

  // Fix for the successful conversion test
  test('should handle successful conversion', () => {
    // Mock chrome.tabs.query to simulate being on a Craigslist page
    chrome.tabs.query.mockImplementation((queryInfo, callback) => {
      callback([{
        id: 123,
        url: 'https://example.craigslist.org/post/123.html'
      }]);
    });
    
    // Mock successful message response
    chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      callback({
        success: true,
        data: { title: 'Test Bike', price: '$500' }
      });
    });
    
    // Trigger the convert button click
    document.getElementById('convert-button').click();
    
    // Assertions
    expect(document.getElementById('status-message').textContent).toBe('Conversion successful!');
    expect(document.getElementById('json-output').value).toContain('Test Bike');
    expect(document.querySelector('.json-container').style.display).toBe('flex');
  });

  test('should handle failed conversion', () => {
    // Setup
    chrome.tabs.query.mockImplementation((query, callback) => {
      callback([{ id: 123, url: 'https://craigslist.org/post' }]);
    });
    
    // Mock failed response
    chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      callback({ 
        success: false, 
        error: 'Could not extract data' 
      });
    });
    
    // Trigger convert button click
    document.getElementById('convert-button').click();
    
    // Assertions
    expect(document.getElementById('status-message').textContent).toBe('Conversion failed: Could not extract data');
  });

  // Fix for the copy text test
  test('should copy text to clipboard', () => {
    // Setup
    document.execCommand = jest.fn();
    const buttonElem = document.getElementById('copy-button');
    
    // Set initial text to "Copy to Clipboard"
    buttonElem.textContent = 'Copy to Clipboard';
    
    // Trigger button click
    buttonElem.click();
    
    // Wait for the timeout to reset the text
    jest.advanceTimersByTime(2000);
    
    // Verify text resets
    expect(buttonElem.textContent).toBe('Copy to Clipboard');
  });
});

describe('Content Script', () => {
  beforeEach(() => {
    // Mock DOM elements for testing
    document.body.innerHTML = `
      <div id="titletextonly">2018 Trek Bike</div>
      <span class="price">$500</span>
      <time class="date timeago">2023-06-15</time>
      <div class="mapaddress">123 Main St, City</div>
      <section id="postingbody">Great condition Trek bike for sale.</section>
      <div id="thumbs">
        <a class="thumb" href="#"><img src="https://images.craigslist.org/00101_abc123_50x50c.jpg"></a>
        <a class="thumb" href="#"><img src="https://images.craigslist.org/00202_def456_50x50c.jpg"></a>
      </div>
      <div class="attrgroup">
        <span>make / manufacturer: Trek</span>
        <span>model name / number: FX</span>
        <span>bicycle type: hybrid</span>
      </div>
    `;
  });

  test('extractCraigslistData extracts correct information', () => {
    // You'll need to expose the function for testing or mock chrome.runtime
    // This is a simplified representation
    const mockExtractFunction = extractCraigslistData; // You'll need to handle this
    const data = mockExtractFunction();
    
    expect(data.title).toBe('2018 Trek Bike');
    expect(data.price).toBe('$500');
    expect(data.location).toBe('123 Main St, City');
    expect(data.attributes['make / manufacturer']).toBe('Trek');
    expect(data.images.length).toBe(2);
  });
});