console.log('Content script initializing...');

const { parseWithLLM } = require('./llmParser');

// Core extraction function - used by tests
function extractCraigslistData() {
  console.log('Running extractCraigslistData');
  
  try {
    // Use specialized bike parser if available
    if (typeof extractBikeData === 'function') {
      console.log('Using specialized bike parser');
      return extractBikeData(document);
    }
    
    // Fallback to basic data extraction
    const data = {
      title: document.title,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      isBikeListing: false
    };
    
    // Check if this is a post page
    if (document.querySelector('.postingtitletext')) {
      data.postTitle = document.querySelector('.postingtitletext').textContent.trim();
      data.price = document.querySelector('.price')?.textContent?.trim();
      data.description = document.querySelector('#postingbody')?.textContent?.trim();
      
      // Get images
      const images = Array.from(document.querySelectorAll('.gallery img'));
      data.images = images.map(img => img.src);
    }
    
    return data;
  } catch (error) {
    console.error('Error in extractCraigslistData:', error);
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function handleGetListingData() {
  const fullText = document.body.innerText;
  const parsed = await parseWithLLM(fullText);
  return parsed;
}

// Set a flag that the content script is ready
window.__contentScriptReady = true;
console.log('Setting content script ready flag');

// Listen for messages from popup or test scripts
window.addEventListener('message', function(event) {
  // Only respond to messages from this page
  if (event.source !== window) return;
  
  console.log('Content script received message:', event.data?.action || 'unknown');
  
  if (event.data && event.data.action === 'getDom') {
    console.log('Handling getDom request');
    
    try {
      // Get the DOM content
      const domContent = document.documentElement.outerHTML;
      
      // Send response
      window.postMessage({
        type: 'fromContentScript',
        success: true,
        data: domContent,
        timestamp: new Date().toISOString()
      }, '*');
      
      console.log('Sent DOM content');
    } catch (e) {
      console.error('Error getting DOM:', e);
      window.postMessage({
        type: 'fromContentScript',
        success: false,
        error: e.message,
        timestamp: new Date().toISOString()
      }, '*');
    }
  } else if (event.data && event.data.action === 'extractData') {
    console.log('Handling extractData request');
    
    try {
      const extractedData = extractCraigslistData();
      
      window.postMessage({
        type: 'fromContentScript',
        action: 'dataExtracted',
        success: true,
        data: extractedData,
        timestamp: new Date().toISOString()
      }, '*');
      
      console.log('Sent extracted data');
    } catch (e) {
      console.error('Error extracting data:', e);
      window.postMessage({
        type: 'fromContentScript',
        action: 'dataExtracted',
        success: false,
        error: e.message,
        timestamp: new Date().toISOString()
      }, '*');
    }
  }
});

// Inject a script to add communication capabilities to the page context
function injectHelperScript() {
  const script = document.createElement('script');
  script.textContent = `
    window.__contentScriptReady = true;
    window.__contentScriptInjected = true;
    
    // Add message handler in the page context
    window.addEventListener('message', function(event) {
      if (event.source !== window) return;
      if (event.data && event.data.action === 'getDom') {
        const domContent = document.documentElement.outerHTML;
        window.postMessage({
          type: 'fromContentScript',
          success: true,
          data: domContent
        }, '*');
      }
    });
    console.log('Page context helper script injected');
  `;
  
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

// Run injection immediately
injectHelperScript();

// Also run when DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectHelperScript);
}

console.log('Content script setup complete');