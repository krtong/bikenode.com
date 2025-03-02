/**
 * Bike listing validator and parser
 */
const { parseWithLLM } = require('./llmParser');

/**
 * Validate a bike listing data
 * @param {Object} data - The listing data to validate
 * @returns {Object} Validated listing data
 */
function validateListing(data) {
  // Ensure required fields exist
  const validatedData = { ...data };
  
  // Normalize item type
  if (validatedData.itemType) {
    validatedData.itemType = validatedData.itemType.toLowerCase();
    
    // Ensure it's one of our supported types
    if (!['bike', 'bicycle', 'bicycle component'].includes(validatedData.itemType)) {
      validatedData.itemType = 'unknown';
    }
  } else {
    validatedData.itemType = 'unknown';
  }
  
  // Normalize frame size (remove spaces between number and unit)
  if (validatedData.frameSize) {
    validatedData.frameSize = validatedData.frameSize.replace(/(\d+)\s+(cm|c|")/i, '$1$2');
  }
  
  // Ensure price is a number if present
  if (validatedData.askingPrice && typeof validatedData.askingPrice === 'string') {
    const priceMatch = validatedData.askingPrice.match(/(\d+)/);
    validatedData.askingPrice = priceMatch ? parseInt(priceMatch[1], 10) : null;
  }
  
  return validatedData;
}

/**
 * Parse a bike listing text
 * @param {string} text - The listing text to parse
 * @returns {Promise<Object>} Parsed and validated listing data
 */
async function parseListing(text) {
  try {
    // Parse with LLM
    const parsedData = await parseWithLLM(text);
    
    // Validate the parsed data
    return validateListing(parsedData);
  } catch (error) {
    console.error('Error parsing listing:', error);
    return {
      error: error.message || 'Unknown error parsing listing',
      itemType: 'unknown'
    };
  }
}

module.exports = {
  validateListing,
  parseListing
};
