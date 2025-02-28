// Replace ES module imports with CommonJS require
const popupModule = require('../web_extension/chrome/popup.js');
const { someFunction } = popupModule;

// Setup chrome API mock for all tests
global.chrome = {
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  }
};

// Mock document methods not in jsdom
document.execCommand = jest.fn();

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

  test('should handle successful conversion', () => {
    // Setup - simulate on Craigslist page
    chrome.tabs.query.mockImplementation((query, callback) => {
      callback([{ id: 123, url: 'https://craigslist.org/post' }]);
    });
    
    // Mock successful response from content script
    chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      expect(message.action).toBe('convertToJson');
      callback({ 
        success: true, 
        data: { title: 'Test Bike', price: '$100' } 
      });
    });
    
    // Trigger convert button click
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

  test('should copy text to clipboard', () => {
    // Set up textarea content
    document.getElementById('json-output').value = '{"test": "data"}';
    
    // Click copy button
    document.getElementById('copy-button').click();
    
    // Verify execCommand was called
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    
    // Verify button text changed
    expect(document.getElementById('copy-button').textContent).toBe('Copied!');
    
    // Fast-forward timers
    jest.useFakeTimers();
    jest.advanceTimersByTime(1500);
    
    // Verify text resets
    expect(document.getElementById('copy-button').textContent).toBe('Copy to Clipboard');
  });
});