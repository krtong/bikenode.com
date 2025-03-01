// Mock chrome API
const chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(callback => {
        // Store the callback immediately when it's registered
        chrome.runtime.onMessage.handler = callback;
      })
    }
  }
};

// Set up global chrome object
global.chrome = chrome;

// Import content script AFTER mock is set up
require('../web_extension/chrome/content.js');

describe('Chrome Extension Message Handling', () => {
  let mockSendResponse;
  
  beforeEach(() => {
    // Use the stored handler instead of accessing mock.calls
    mockSendResponse = jest.fn();
    
    // Set up DOM
    document.body.innerHTML = `<div id="titletextonly">Test Bike</div>`;
  });
  
  test('responds with data on convertToJson message', () => {
    chrome.runtime.onMessage.handler({action: 'convertToJson'}, {}, mockSendResponse);
    
    expect(mockSendResponse).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({title: 'Test Bike'})
    }));
  });
  
  test('returns error when data extraction fails', () => {
    document.body.innerHTML = ''; // Empty DOM will cause extraction to fail
    chrome.runtime.onMessage.handler({action: 'convertToJson'}, {}, mockSendResponse);
    
    expect(mockSendResponse).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.stringContaining('Could not find post title')
    }));
  });
});