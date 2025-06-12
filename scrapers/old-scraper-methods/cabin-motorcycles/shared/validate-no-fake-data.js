/**
 * Validation to ensure no fake/generated data
 * This MUST be used before returning any scraped data
 */

const BANNED_PATTERNS = [
  'PLACEHOLDER',
  'DEVELOPMENT',
  'SEED',
  'MOCK',
  'FAKE',
  'DUMMY',
  'TEST',
  'EXAMPLE',
  'generated',
  'fallback',
  'synthetic',
  'interpolated',
  'seed_data',
  'historical_generation',
  'generated_from_pattern'
];

/**
 * Validate that scraped data contains no fake/generated content
 * @param {Array} data - Array of scraped models
 * @throws {Error} If fake data is detected
 */
function validateNoFakeData(data) {
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array');
  }
  
  // Check each item
  data.forEach((item, index) => {
    // Convert to string to search for patterns
    const serialized = JSON.stringify(item).toLowerCase();
    
    // Check for banned patterns
    BANNED_PATTERNS.forEach(pattern => {
      if (serialized.includes(pattern.toLowerCase())) {
        throw new Error(
          `Fake data detected in item ${index}: contains banned pattern "${pattern}". ` +
          `Item: ${JSON.stringify(item, null, 2)}`
        );
      }
    });
    
    // Require source attribution
    if (!item.specifications?.source_url) {
      throw new Error(
        `Item ${index} missing required source_url. ` +
        `All scraped data must include the URL it was scraped from.`
      );
    }
    
    if (!item.specifications?.scraped_at) {
      throw new Error(
        `Item ${index} missing required scraped_at timestamp. ` +
        `All scraped data must include when it was scraped.`
      );
    }
    
    if (item.specifications?.source_type !== 'web_scraping') {
      throw new Error(
        `Item ${index} has invalid source_type: "${item.specifications?.source_type}". ` +
        `Must be "web_scraping" only.`
      );
    }
    
    // Check for suspicious patterns
    if (item.specifications?.source === 'historical_generation') {
      throw new Error(
        `Item ${index} was generated, not scraped. Source: "historical_generation"`
      );
    }
    
    if (item.specifications?.generated_from_pattern === true) {
      throw new Error(
        `Item ${index} was generated from a pattern, not scraped from a website.`
      );
    }
  });
  
  // Check for suspicious patterns in the dataset
  checkForGeneratedPatterns(data);
}

/**
 * Check for patterns that suggest data was generated rather than scraped
 */
function checkForGeneratedPatterns(data) {
  // Check for sequential years with identical data
  const yearGroups = {};
  
  data.forEach(item => {
    if (item.year) {
      const key = `${item.make}-${item.model}-${item.package || 'base'}`;
      if (!yearGroups[key]) {
        yearGroups[key] = [];
      }
      yearGroups[key].push(item.year);
    }
  });
  
  // Check each group for suspicious patterns
  Object.entries(yearGroups).forEach(([key, years]) => {
    if (years.length > 10) {
      // Check if years are perfectly sequential
      const sorted = years.sort((a, b) => a - b);
      let isSequential = true;
      
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i-1] + 1) {
          isSequential = false;
          break;
        }
      }
      
      if (isSequential && sorted.length > 15) {
        throw new Error(
          `Suspicious pattern detected for ${key}: ` +
          `${sorted.length} perfectly sequential years from ${sorted[0]} to ${sorted[sorted.length-1]}. ` +
          `This suggests generated data rather than scraped data.`
        );
      }
    }
  });
}

/**
 * Validate a single model object
 */
function validateModel(model) {
  validateNoFakeData([model]);
}

/**
 * Clean validation - ensures data passes all checks
 */
function ensureRealData(data) {
  try {
    validateNoFakeData(data);
    return true;
  } catch (error) {
    console.error('❌ VALIDATION FAILED:', error.message);
    return false;
  }
}

module.exports = {
  validateNoFakeData,
  validateModel,
  ensureRealData,
  BANNED_PATTERNS
};