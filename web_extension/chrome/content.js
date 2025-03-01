console.log('Content script initializing...');

// Remove ES6 module syntax which doesn't work in content scripts
function extractCraigslistData() {
  // If bikeParser is available, use it for bike listings
  if (typeof extractBikeData === 'function') {
    return extractBikeData(document);
  }
  
  // Fallback to basic data extraction
  const data = {
    title: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
  
  // Add more specific extraction logic for Craigslist posts
  if (document.querySelector('.postingtitletext')) {
    data.postTitle = document.querySelector('.postingtitletext').textContent.trim();
    data.price = document.querySelector('.price')?.textContent?.trim();
    data.description = document.querySelector('#postingbody')?.textContent?.trim();
    
    // Get images if available
    const images = Array.from(document.querySelectorAll('.gallery img'));
    data.images = images.map(img => img.src);
  }
  
  return data;
}

// Ensure we're running in the page context
function injectReadyFlag() {
  try {
    // Create and inject a script element to set the flag in the page's window context
    const script = document.createElement('script');
    script.textContent = `
      window.__contentScriptReady = true;
      console.log('Content script ready flag set in page context');
      
      // Add message handler in the page context to ensure proper communication
      window.addEventListener('message', function(event) {
        if (event.source !== window) return;
        
        console.log('Page received message:', JSON.stringify(event.data));
        
        if (event.data && event.data.action === 'getDom') {
          console.log('Page handling getDom request');
          
          // Get the DOM content directly in page context
          const domContent = document.documentElement.outerHTML;
          
          // Send the DOM back
          window.postMessage({
            type: 'fromContentScript',
            success: true,
            data: domContent
          }, '*');
          
          console.log('Page sent DOM content');
        }
      });
    `;
    (document.head || document.documentElement).appendChild(script);
    
    // Clean up the injected script element
    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }
    
    console.log('Ready flag and message handler injected');
  } catch (e) {
    console.error('Error injecting script:', e);
  }
}

// Also listen for messages in the content script context
window.addEventListener('message', function(event) {
  if (event.source !== window) return;
  
  console.log('Content script received message:', JSON.stringify(event.data));
  
  if (event.data && event.data.action === 'getDom') {
    console.log('Content script handling getDom request');
    
    try {
      // Get the DOM content
      const domContent = document.documentElement.outerHTML;
      
      // Send the DOM back to the page
      window.postMessage({
        type: 'fromContentScript',
        success: true,
        data: domContent
      }, '*');
      
      console.log('Content script sent DOM content');
    } catch (e) {
      console.error('Error processing getDom request:', e);
      window.postMessage({
        type: 'fromContentScript',
        success: false,
        error: e.message
      }, '*');
    }
  } else if (event.data && event.data.action === 'extractData') {
    try {
      // Extract data using our specialized parser
      const extractedData = extractCraigslistData();
      
      // Send the extracted data back
      window.postMessage({
        type: 'fromContentScript',
        action: 'dataExtracted',
        success: true,
        data: extractedData
      }, '*');
      
      console.log('Content script sent extracted data');
    } catch (e) {
      console.error('Error extracting data:', e);
      window.postMessage({
        type: 'fromContentScript',
        action: 'dataExtracted',
        success: false,
        error: e.message
      }, '*');
    }
  }
});

// Execute immediately and also on DOM content loaded
injectReadyFlag();

// Also run when the DOM is fully loaded to ensure it works
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectReadyFlag);
}

console.log('Content script setup complete');