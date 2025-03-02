/**
 * Generates structured prompts for LLM to extract bike listing information
 */

/**
 * Generate a prompt for extraction of bike listing data
 * @param {string} text - The raw text content from the listing
 * @param {string} source - Source platform (craigslist, facebook, ebay, etc.)
 * @returns {string} A formatted prompt for the LLM
 */
function generateBikeListingPrompt(text, source = 'unknown') {
  return `
Extract structured data from this bike or bicycle component listing. Include all available details.

Source: ${source}

LISTING CONTENT:
${text}

Please extract the following information in a structured JSON format:
- itemType: "bike" or "bicycle component"
- make: Brand of the bike/component
- model: Model name 
- year: Year of manufacture if available
- askingPrice: Numeric price (without currency symbol)
- frameSize: For bikes, include units like "cm" or size like "M"
- frameMaterial: "Carbon", "Steel", "Aluminum", etc.
- componentGroup: Groupset like "105", "Ultegra", "GX Eagle", etc.
- wheelSize: "700c", "29", "650b", etc.
- condition: Condition description like "new", "excellent", "good", "fair", "poor"
- mileage: Any mention of usage/miles/kilometers
- damage: Any mentioned damage or issues
- location: Where the item is located
- sellerType: "private" or "shop/commercial" if evident
- additionalDetails: Any other important information

Format the response as valid JSON.
`;
}

/**
 * Generate a prompt specifically for bike components
 * @param {string} text - The raw text content from the listing
 * @param {string} source - Source platform
 * @returns {string} A formatted prompt for the LLM
 */
function generateComponentListingPrompt(text, source = 'unknown') {
  return `
Extract structured data from this bicycle component listing. Include all available details.

Source: ${source}

LISTING CONTENT:
${text}

Please extract the following information in a structured JSON format:
- itemType: "bicycle component"
- make: Brand of the component
- model: Model name/number
- componentType: Type of component (crankset, derailleur, wheelset, etc.)
- askingPrice: Numeric price (without currency symbol)
- condition: Condition description like "new", "excellent", "good", "fair", "poor"
- compatibility: Any compatibility information (groupset, speeds, bike type)
- specifications: Any specifications (weight, dimensions, material, etc.)
- usage: Any mention of previous usage/wear
- damage: Any mentioned damage or issues
- location: Where the item is located
- sellerType: "private" or "shop/commercial" if evident
- additionalDetails: Any other important information

Format the response as valid JSON.
`;
}

/**
 * Classify text content to determine if it's a bike or component listing
 * @param {string} text - The raw text content from the listing
 * @returns {string} Either 'bike', 'component', or 'unknown'
 */
function classifyListingType(text) {
  const lowercasedText = text.toLowerCase();
  
  // Check for component-specific keywords
  const componentKeywords = [
    'crankset', 'derailleur', 'shifters', 'brakes', 'wheelset', 'wheels',
    'cassette', 'chainring', 'fork', 'handlebar', 'stem', 'seatpost', 'saddle',
    'pedals', 'groupset', 'grouppo', 'drivetrain', 'bottom bracket'
  ];
  
  for (const keyword of componentKeywords) {
    // More specific checks to avoid false positives
    // Look for the keyword surrounded by whitespace or punctuation
    const pattern = new RegExp(`(^|\\s|[.,;:"'])${keyword}($|\\s|[.,;:"'])`, 'i');
    if (pattern.test(lowercasedText)) {
      return 'component';
    }
  }
  
  // Check for bike-specific patterns
  const bikePatterns = [
    // Size patterns typically indicate complete bikes
    /\b(xs|s|sm|m|md|l|lg|xl)\s+frame\b/i,
    /\b\d+\s*(cm|mm)?\s*frame\b/i,
    /\b(road|mountain|mtb|hybrid|gravel|tri|tt|bmx)\s+bike\b/i,
    /\b(full suspension|hardtail|carbon frame|aluminum frame)\b/i
  ];
  
  for (const pattern of bikePatterns) {
    if (pattern.test(lowercasedText)) {
      return 'bike';
    }
  }
  
  // If we couldn't determine specifically, default to bike
  // This is a reasonable default since complete bikes are more common in listings
  return 'bike';
}

/**
 * Generate the most appropriate prompt for the listing content
 * @param {string} text - The raw text content from the listing
 * @param {string} source - Source platform
 * @returns {string} The most appropriate prompt
 */
function generatePrompt(text, source = 'unknown') {
  const listingType = classifyListingType(text);
  
  if (listingType === 'component') {
    return generateComponentListingPrompt(text, source);
  } else {
    return generateBikeListingPrompt(text, source);
  }
}

module.exports = {
  generatePrompt,
  generateBikeListingPrompt,
  generateComponentListingPrompt,
  classifyListingType
};
