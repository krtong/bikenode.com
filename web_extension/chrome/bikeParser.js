/**
 * Specialized parser for Craigslist bike listings
 */

// Common bike brands for better matching
const COMMON_BIKE_BRANDS = [
  'Trek', 'Specialized', 'Giant', 'Cannondale', 'Santa Cruz', 'Cervelo',
  'Pinarello', 'Bianchi', 'Scott', 'Kona', 'Surly', 'Salsa', 'Marin',
  'GT', 'Fuji', 'Felt', 'BMC', 'Orbea', 'Colnago', 'Raleigh', 'Diamondback',
  'Schwinn', 'Yeti', 'Rocky Mountain', 'Canyon', 'Ibis', 'Pivot', 'Transition'
];

// Bike types for classification
const BIKE_TYPES = [
  'mountain', 'mtb', 'road', 'gravel', 'commuter', 'cruiser', 'hybrid', 
  'touring', 'bmx', 'fixie', 'fixed gear', 'triathlon', 'cyclocross', 'cross',
  'enduro', 'downhill', 'dh', 'hardtail', 'full suspension', 'e-bike', 'ebike'
];

/**
 * Extract bike-specific details from Craigslist listing
 * @param {Document} document - DOM document from the page
 * @returns {Object} Bike details extracted from the posting
 */
function extractBikeData(document) {
  const isVehicleListing = document.querySelector('.attrgroup');
  const isBikeListing = isBikePost(document);

  // Basic listing data
  const data = {
    title: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    isBikeListing,
  };
  
  // If we have a post title, extract it
  if (document.querySelector('.postingtitletext')) {
    data.postTitle = document.querySelector('.postingtitletext').textContent.trim();
    data.price = document.querySelector('.price')?.textContent?.trim();
    data.description = document.querySelector('#postingbody')?.textContent?.trim();
    
    // Get images if available
    const images = Array.from(document.querySelectorAll('.gallery img'));
    data.images = images.map(img => img.src);
    
    // Get posting details if available
    const postingInfoText = document.querySelector('.postinginfos')?.textContent || '';
    data.postId = extractPostId(postingInfoText);
    data.postedDate = extractPostedDate(postingInfoText);
    data.updatedDate = extractUpdatedDate(postingInfoText);
    
    // Get location info
    data.location = document.querySelector('.mapaddress')?.textContent?.trim();
    
    // If it's a bike listing, extract bike-specific details
    if (isBikeListing) {
      Object.assign(data, extractBikeSpecificDetails(document));
    }
  }
  
  return data;
}

/**
 * Determine if the current post is likely a bike listing
 * @param {Document} document - DOM document
 * @returns {Boolean} True if likely a bike listing
 */
function isBikePost(document) {
  const title = document.title.toLowerCase();
  const bodyText = document.querySelector('#postingbody')?.textContent?.toLowerCase() || '';
  const categoryText = document.querySelector('.breadcrumbs')?.textContent?.toLowerCase() || '';
  
  // Check for bike keywords in title
  const hasBikeInTitle = /\b(bike|bicycle|cycle)\b/.test(title);
  
  // Check for bike brand names in title or body
  const hasBikeBrand = COMMON_BIKE_BRANDS.some(brand => 
    title.includes(brand.toLowerCase()) || bodyText.includes(brand.toLowerCase())
  );
  
  // Check for bike types in title or body
  const hasBikeType = BIKE_TYPES.some(type => 
    title.includes(type) || bodyText.includes(type)
  );
  
  // Check if it's in a bike category
  const isInBikeCategory = categoryText.includes('bike') || categoryText.includes('bicycle');
  
  // It's likely a bike listing if it has bike in title, or a bike brand, or in bike category
  return hasBikeInTitle || hasBikeBrand || hasBikeType || isInBikeCategory;
}

/**
 * Extract bike-specific details from listing 
 * @param {Document} document - DOM document
 * @returns {Object} Extracted bike details
 */
function extractBikeSpecificDetails(document) {
  const bikeDetails = {};
  const bodyText = document.querySelector('#postingbody')?.textContent || '';
  const title = document.title;
  
  // Extract frame size
  bikeDetails.frameSize = extractFrameSize(bodyText, title);
  
  // Extract bike brand
  bikeDetails.brand = extractBikeBrand(bodyText, title);
  
  // Extract bike type
  bikeDetails.bikeType = extractBikeType(bodyText, title);
  
  // Extract frame material
  bikeDetails.frameMaterial = extractFrameMaterial(bodyText);
  
  // Extract component group
  bikeDetails.componentGroup = extractComponentGroup(bodyText);
  
  // Extract condition
  bikeDetails.condition = extractCondition(bodyText, document);
  
  // Extract wheel size
  bikeDetails.wheelSize = extractWheelSize(bodyText, title);
  
  return bikeDetails;
}

/**
 * Extract frame size from listing text
 * @param {String} bodyText - Full listing text
 * @param {String} title - Listing title
 * @returns {String} Frame size or null
 */
function extractFrameSize(bodyText, title) {
  // Common patterns for frame sizes
  const sizePatterns = [
    /\b(\d{2})["″]?\s*(frame|size|cm)\b/i,
    /\b(size|frame|frame size)[:\s]+([XS|S|M|L|XL|XXL]+)\b/i,
    /\b([XS|S|M|L|XL|XXL]+)[- ]*(frame|size)\b/i,
    /\bsize[:\s]+(\d{2})["\s]?\b/i
  ];
  
  // Try each pattern on both body and title
  for (const pattern of sizePatterns) {
    const bodyMatch = bodyText.match(pattern);
    if (bodyMatch && bodyMatch[1]) {
      return bodyMatch[1].trim();
    }
    
    const titleMatch = title.match(pattern);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }
  }
  
  return null;
}

/**
 * Extract bike brand from listing text
 * @param {String} bodyText - Full listing text
 * @param {String} title - Listing title
 * @returns {String} Brand name or null
 */
function extractBikeBrand(bodyText, title) {
  // Check for each brand in the title first (most reliable)
  for (const brand of COMMON_BIKE_BRANDS) {
    const regex = new RegExp(`\\b${brand}\\b`, 'i');
    if (regex.test(title)) {
      return brand;
    }
  }
  
  // Then check body text
  for (const brand of COMMON_BIKE_BRANDS) {
    const regex = new RegExp(`\\b${brand}\\b`, 'i');
    if (regex.test(bodyText)) {
      return brand;
    }
  }
  
  return null;
}

/**
 * Extract bike type from listing text
 * @param {String} bodyText - Full listing text
 * @param {String} title - Listing title
 * @returns {String} Bike type or null
 */
function extractBikeType(bodyText, title) {
  const combinedText = `${title.toLowerCase()} ${bodyText.toLowerCase()}`;
  
  for (const type of BIKE_TYPES) {
    if (combinedText.includes(type)) {
      return type;
    }
  }
  
  return null;
}

/**
 * Extract frame material from listing text
 * @param {String} bodyText - Full listing text
 * @returns {String} Frame material or null
 */
function extractFrameMaterial(bodyText) {
  const lowerBodyText = bodyText.toLowerCase();
  
  if (lowerBodyText.includes('carbon')) return 'Carbon';
  if (lowerBodyText.includes('aluminium') || lowerBodyText.includes('aluminum')) return 'Aluminum';
  if (lowerBodyText.includes('steel') || lowerBodyText.includes('cromoly') || 
      lowerBodyText.includes('cro-moly')) return 'Steel';
  if (lowerBodyText.includes('titanium')) return 'Titanium';
  
  return null;
}

/**
 * Extract component group info from listing text
 * @param {String} bodyText - Full listing text
 * @returns {String} Component group or null
 */
function extractComponentGroup(bodyText) {
  const lowerBodyText = bodyText.toLowerCase();
  
  // Check for common groupsets
  const groupsets = [
    'dura-ace', 'dura ace', 'ultegra', '105', 'tiagra', 'sora', 'claris', // Shimano
    'red', 'force', 'rival', 'apex', // SRAM
    'super record', 'record', 'chorus', 'potenza', 'centaur', 'veloce', // Campagnolo
    'grx', 'xt', 'xtr', 'slx', 'deore', 'saint', 'zee', // MTB Shimano
    'gx', 'nx', 'sx', 'xx1', 'x01', 'x1' // MTB SRAM
  ];
  
  for (const group of groupsets) {
    if (lowerBodyText.includes(group)) {
      return group.charAt(0).toUpperCase() + group.slice(1);
    }
  }
  
  return null;
}

/**
 * Extract bike condition from listing
 * @param {String} bodyText - Full listing text
 * @param {Document} document - DOM document
 * @returns {String} Bike condition or null
 */
function extractCondition(bodyText, document) {
  const lowerBodyText = bodyText.toLowerCase();
  
  // Check for condition in attributes (sometimes they're in structured fields)
  const attrGroups = document.querySelectorAll('.attrgroup');
  for (const group of attrGroups) {
    const text = group.textContent.toLowerCase();
    if (text.includes('condition:')) {
      const match = text.match(/condition:\s*([a-z ]+)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }
  
  // Check for condition keywords in body text
  if (lowerBodyText.includes('brand new') || lowerBodyText.includes('never ridden')) {
    return 'New';
  } else if (lowerBodyText.includes('like new') || lowerBodyText.includes('excellent condition')) {
    return 'Like New';
  } else if (lowerBodyText.includes('good condition')) {
    return 'Good';
  } else if (lowerBodyText.includes('fair condition')) {
    return 'Fair';
  }
  
  return null;
}

/**
 * Extract wheel size from listing text
 * @param {String} bodyText - Full listing text
 * @param {String} title - Listing title
 * @returns {String} Wheel size or null
 */
function extractWheelSize(bodyText, title) {
  const combinedText = `${title.toLowerCase()} ${bodyText.toLowerCase()}`;
  
  // Common wheel sizes
  const wheelSizes = [
    '26"', '27.5"', '29"', '700c', '650b', 
    '26in', '27.5in', '29in',
    '26inch', '27.5inch', '29inch'
  ];
  
  for (const size of wheelSizes) {
    if (combinedText.includes(size)) {
      return size;
    }
  }
  
  // Alternative formats
  const wheelSizePatterns = [
    /\b26[\"″ ](wheel|wheels)\b/i,
    /\b27\.5[\"″ ](wheel|wheels)\b/i,
    /\b29[\"″ ](wheel|wheels)\b/i,
    /\b700c\b/i,
    /\b650b\b/i
  ];
  
  for (const pattern of wheelSizePatterns) {
    if (pattern.test(combinedText)) {
      return pattern.toString().match(/\d+\.?\d*|700c|650b/i)[0];
    }
  }
  
  return null;
}

/**
 * Extract post ID from posting info text
 * @param {String} postingInfoText - Text from posting info section
 * @returns {String} Post ID or null
 */
function extractPostId(postingInfoText) {
  const match = postingInfoText.match(/post\s*id[:\s]+(\d+)/i);
  return match ? match[1] : null;
}

/**
 * Extract posted date from posting info text
 * @param {String} postingInfoText - Text from posting info section
 * @returns {String} Posted date or null
 */
function extractPostedDate(postingInfoText) {
  const match = postingInfoText.match(/posted[:\s]+([\w\d: ]+)/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract updated date from posting info text
 * @param {String} postingInfoText - Text from posting info section
 * @returns {String} Updated date or null
 */
function extractUpdatedDate(postingInfoText) {
  const match = postingInfoText.match(/updated[:\s]+([\w\d: ]+)/i);
  return match ? match[1].trim() : null;
}

// Export functions for use in content script
if (typeof module !== 'undefined') {
  module.exports = {
    extractBikeData,
    isBikePost
  };
}
