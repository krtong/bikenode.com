/**
 * Background script for the bike listing parser extension
 */

// Mapping of hostname patterns to their platform types
const PLATFORM_MAPPINGS = [
  { pattern: /craigslist\.org/, platform: 'craigslist' },
  { pattern: /facebook\.com\/marketplace/, platform: 'facebook' },
  { pattern: /ebay\.com/, platform: 'ebay' },
  { pattern: /pinkbike\.com/, platform: 'pinkbike' },
  { pattern: /offerup\.com/, platform: 'offerup' },
  { pattern: /letgo\.com/, platform: 'letgo' }
];

/**
 * Determine the platform type from a URL
 * @param {string} url - The URL to check
 * @returns {string|null} The platform type, or null if not recognized
 */
function getPlatformType(url) {
  try {
    const hostname = new URL(url).hostname;
    
    for (const { pattern, platform } of PLATFORM_MAPPINGS) {
      if (pattern.test(hostname)) {
        return platform;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}

/**
 * Initialize the extension when installed or updated
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('Bike Listing Parser extension installed/updated');
  
  // Set default extension state
  chrome.storage.local.set({
    enabledPlatforms: {
      craigslist: true,
      facebook: true,
      ebay: true,
      pinkbike: true,
      offerup: true,
      letgo: true
    },
    autoDetectBikes: true,
    notifyOnBikeListings: true
  });
});

/**
 * Inject content scripts if URL matches patterns
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process if the page has completely loaded
  if (changeInfo.status !== 'complete') {
    return;
  }
  
  // Check if this is a supported platform
  const platform = getPlatformType(tab.url);
  if (!platform) {
    return;
  }
  
  // Check if this platform is enabled
  chrome.storage.local.get(['enabledPlatforms'], (result) => {
    const { enabledPlatforms = {} } = result;
    
    if (enabledPlatforms[platform]) {
      // Inject content scripts
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['bikeParser.js', 'platformHandlers.js', 'llmPromptGenerator.js', 'llmParser.js', 'content.js']
      });
    }
  });
});

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'bikeListingDetected') {
    // A bike listing was detected on the page
    chrome.storage.local.get(['notifyOnBikeListings'], (result) => {
      if (result.notifyOnBikeListings) {
        // Show a notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon128.png',
          title: 'Bike Listing Detected',
          message: 'Found a bike listing on this page. Click the extension icon to extract details.'
        });
        
        // Update the extension badge
        chrome.action.setBadgeText({
          text: 'BIKE',
          tabId: sender.tab.id
        });
        
        chrome.action.setBadgeBackgroundColor({
          color: '#4CAF50',
          tabId: sender.tab.id
        });
      }
    });
    
    sendResponse({ status: 'notification_sent' });
    return true;
  }
  
  if (message.action === 'saveBikeData') {
    // Save extracted bike data to local storage
    const { bikeData } = message;
    
    chrome.storage.local.get(['savedBikes'], (result) => {
      const savedBikes = result.savedBikes || [];
      
      // Add the new bike data
      savedBikes.push({
        ...bikeData,
        savedAt: new Date().toISOString()
      });
      
      // Save back to storage
      chrome.storage.local.set({ savedBikes }, () => {
        sendResponse({ status: 'saved', count: savedBikes.length });
      });
    });
    
    return true; // Keep the message channel open for the async response
  }
});

/**
 * Context menu setup for right-click functionality
 */
chrome.contextMenus.create({
  id: 'extractBikeData',
  