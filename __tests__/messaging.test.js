// Mock chrome API
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
    }
  }
};

const contentScript = require('../web_extension/chrome/content.js');

describe('Chrome Extension Message Handling', () => {
  let mockSendResponse;
  let messageListener;
  
  beforeEach(() => {
    // Capture the message listener function
    messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    mockSendResponse = jest.fn();
    
    // Set up DOM
    document.body.innerHTML = `<div id="titletextonly">Test Bike</div>`;
  });
  
  test('responds with data on convertToJson message', () => {
    messageListener({action: 'convertToJson'}, {}, mockSendResponse);
    expect(mockSendResponse).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({title: 'Test Bike'})
    }));
  });
  
  test('returns error when data extraction fails', () => {
    document.body.innerHTML = ''; // Empty DOM will cause extraction to fail
    messageListener({action: 'convertToJson'}, {}, mockSendResponse);
    expect(mockSendResponse).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.any(String)
    }));
  });
});