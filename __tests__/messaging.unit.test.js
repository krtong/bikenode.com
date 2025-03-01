describe('Chrome Extension Messaging Tests', () => {
  // Mock the chrome API
  global.chrome = {
    runtime: {
      onMessage: {
        addListener: jest.fn()
      }
    }
  };
  
  // Import content script to register listener
  require('../web_extension/chrome/content.js');
  
  // Capture the message handler function
  const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
  
  beforeEach(() => {
    // Setup DOM for testing
    document.body.innerHTML = `<div id="titletextonly">Test Bike</div>`;
  });
  
  test('responds with success when extraction works', () => {
    const mockSendResponse = jest.fn();
    
    // Call the message handler with a convertToJson action
    messageHandler({action: 'convertToJson'}, {}, mockSendResponse);
    
    // Verify response
    expect(mockSendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          title: 'Test Bike'
        })
      })
    );
  });
  
  test('responds with error when extraction fails', () => {
    // Remove title element to cause extraction to fail
    document.body.innerHTML = '';
    
    const mockSendResponse = jest.fn();
    messageHandler({action: 'convertToJson'}, {}, mockSendResponse);
    
    expect(mockSendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('Could not find post title')
      })
    );
  });
});