const BIKE_CATEGORIES = ['bikes', 'bicycle', 'bicycles', 'bike', 'cycle', 'cycling'];

const BIKE_KEYWORDS = [
  'bike', 'bicycle', 'cycling', 'cycle', 
  'mtb', 'mountain bike', 'road bike', 'gravel', 'cyclocross',
  'trek', 'specialized', 'giant', 'cannondale', 'santa cruz', 
  'cervelo', 'bianchi', 'pinarello', 'colnago', 'bmc'
];

/**
 * Extract the category from the document
 * 
 * @param {Document} document - The DOM document
 * @returns {string|null} - The category text or null if not found
 */
function extractCategory(document) {
  const categoryElement = document.querySelector('.crumb');
  return categoryElement ? categoryElement.textContent.trim() : null;
}

/**
 * Determines if the posting is a bike listing by analyzing category, title and content
 * 
 * @param {Document} document - The DOM document
 * @returns {boolean} - True if the post appears to be a bike listing
 */
function isBikeListing(document) {
  try {
    // Check category first
    const category = extractCategory(document);
    if (category && BIKE_CATEGORIES.some(c => category.toLowerCase().includes(c))) {
      return true;
    }
    
    // Check title 
    const title = document.querySelector('h1.postingtitle span.titletextonly')?.textContent || 
                  document.querySelector('h1')?.textContent || '';
                  
    if (BIKE_KEYWORDS.some(keyword => title.toLowerCase().includes(keyword))) {
      return true;
    }
    
    // Check post body as a last resort
    const postBody = document.querySelector('#postingbody')?.textContent || 
                    document.querySelector('.body')?.textContent || '';
                    
    return BIKE_KEYWORDS.some(keyword => postBody.toLowerCase().includes(keyword));
  } catch (e) {
    console.error('Error in isBikeListing:', e);
    return false;
  }
}

module.exports = {
  isBikeListing,
  extractCategory,
  BIKE_CATEGORIES,
  BIKE_KEYWORDS
};
