/**
 * Content script for the bike listing parser extension
 * Runs on matching pages to extract bike listing information
 */

// Content script - modules will be injected by popup when needed

// Signal that the content script is ready
window.__contentScriptReady = true;

/**
 * Extract the full DOM content as text
 * @returns {string} The full DOM content as text
 */
function extractDOMContent() {
  return document.body.innerText;
}

/**
 * Handle the extraction of listing data using platform-specific extractors
 * @returns {Object} The extracted listing data
 */
async function handleGetListingData() {
  try {
    // Create the appropriate extractor for this platform
    const extractor = createExtractor(document);
    
    // Extract the raw listing data
    const rawData = extractor.extractAll();
    
    // If this isn't a bike listing, return early
    if (!rawData.isBikeListing) {
      return rawData;
    }
    
    // Generate a prompt for the LLM based on the text content
    const prompt = generatePrompt(rawData.fullText, rawData.source);
    
    // Pass the generated prompt to the LLM for structured extraction
    const structuredData = await parseWithLLM(rawData.fullText, prompt);
    
    // Combine raw data with structured data from the LLM
    return {
      ...rawData,
      ...structuredData,
      extractionMethod: 'llm+platform',
      extractionTimestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error extracting listing data:', error);
    return {
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Handle message events sent to the content script
 * @param {MessageEvent} event - The message event
 */
async function handleMessage(event) {
  // Security check - ensure message is from our extension
  if (event.source !== window) {
    return;
  }
  
  const message = event.data;
  
  // Only respond to messages with an action property
  if (!message || !message.action) {
    return;
  }
  
  console.log('Content script received message:', message.action);
  
  try {
    // Handle different message actions
    switch (message.action) {
      case 'getDom':
        // Send the full DOM text content
        window.postMessage({
          type: 'fromContentScript',
          action: 'domContent',
          data: extractDOMContent()
        }, '*');
        break;
        
      case 'getListingData':
        // Extract listing data using platform-specific extractors
        const listingData = await handleGetListingData();
        window.postMessage({
          type: 'fromContentScript',
          action: 'listingData',
          data: listingData
        }, '*');
        break;
        
      default:
        console.log('Unknown action:', message.action);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    window.postMessage({
      type: 'fromContentScript',
      action: 'error',
      error: error.toString()
    }, '*');
  }
}

// Listen for messages
window.addEventListener('message', handleMessage);

// Automatically detect and process if this is a bike listing
(async function autoDetect() {
  try {
    const extractor = createExtractor(document);
    const isBikeListing = extractor.isBikeListing();
    
    if (isBikeListing) {
      // Send message to the extension that we're on a bike listing page
      chrome.runtime.sendMessage({
        action: 'bikeListingDetected',
        url: window.location.href
      });
    }
  } catch (error) {
    console.error('Error in auto-detection:', error);
  }
})();

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = {
    extractDOMContent,
    handleGetListingData
  };
}