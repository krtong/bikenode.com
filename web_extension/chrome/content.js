// content.js - This script runs on Craigslist pages to extract data
// It listens for messages from popup.js and converts page data to JSON

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'convertToJson') {
    try {
      const data = extractCraigslistData();
      sendResponse({success: true, data: data});
    } catch (error) {
      sendResponse({success: false, error: error.message});
    }
  }
  return true; // Keeps the message channel open for async responses
});

// Extract data from Craigslist page
function extractCraigslistData() {
  try {
    // Post title
    const title = document.querySelector('#titletextonly')?.textContent.trim() || '';
    
    if (!title) {
      throw new Error('Could not find post title - may not be a valid Craigslist post');
    }
    
    // Price
    const price = document.querySelector('.price')?.textContent.trim() || '';
    
    // Post time
    const postingTime = document.querySelector('.date.timeago')?.textContent.trim() || '';
    
    // Location
    const location = document.querySelector('.mapaddress')?.textContent.trim() || '';
    
    // Description
    const description = document.querySelector('#postingbody')?.textContent.trim() || '';
    
    // Images
    const imageUrls = [];
    const thumbs = document.querySelectorAll('.thumb img');
    thumbs.forEach(img => {
      // Convert thumbnail URL to full image URL
      if (img.src) {
        const fullImageUrl = img.src.replace('50x50c', '600x450');
        imageUrls.push(fullImageUrl);
      }
    });
    
    // Attributes/details (may vary based on category)
    const attributes = {};
    const attrGroups = document.querySelectorAll('.attrgroup');
    attrGroups.forEach(group => {
      const spans = group.querySelectorAll('span');
      spans.forEach(span => {
        const text = span.textContent.trim();
        if (text.includes(':')) {
          const [key, value] = text.split(':').map(item => item.trim());
          attributes[key] = value;
        } else if (text.length > 0) {
          // For attributes without key:value format
          attributes[text] = true;
        }
      });
    });
    
    // Post ID from URL
    const postId = window.location.pathname.split('/').pop().split('.')[0];
    
    return {
      title,
      price,
      postingTime,
      location,
      description,
      images: imageUrls,
      attributes,
      postId,
      url: window.location.href,
      extractedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error extracting Craigslist data:', error);
    throw new Error(`Failed to extract data: ${error.message}`);
  }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { extractCraigslistData };
}