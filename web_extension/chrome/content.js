// content.js - This script runs on Craigslist pages to extract data
// It listens for messages from popup.js and converts page data to JSON

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.action === "convertToJson") {
      try {
        // Extract data from Craigslist page
        const postData = extractCraigslistData();
        sendResponse({success: true, data: postData});
      } catch (error) {
        sendResponse({success: false, error: error.message});
      }
      return true; // Required for asynchronous sendResponse
    }
  }
);

/**
 * Extracts relevant data from a Craigslist post
 * @returns {Object} Structured data from the Craigslist post
 */
function extractCraigslistData() {
  // Basic extraction - customize based on your needs
  const title = document.querySelector("#titletextonly")?.textContent.trim() || "";
  const price = document.querySelector(".price")?.textContent.trim() || "";
  const postingBody = document.querySelector("#postingbody")?.textContent.trim() || "";
  const images = Array.from(document.querySelectorAll(".gallery img"))
    .map(img => img.src);
  
  return {
    title,
    price,
    description: postingBody,
    images,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
}