/**
 * Data generator utilities for bike parser testing
 */
const { BIKE_FIXTURES, NON_BIKE_FIXTURES, PROBLEMATIC_HTML_FIXTURES } = require('./testFixtures');
const { createMockBikeListing, createMockNonBikeListing } = require('./testHelpers');

/**
 * Generates a random bike listing HTML
 * @param {Object} options - Options to customize the generation
 * @returns {string} Generated HTML content
 */
function generateRandomBikeListing(options = {}) {
  const bikeTypes = Object.keys(BIKE_FIXTURES);
  const randomType = bikeTypes[Math.floor(Math.random() * bikeTypes.length)];
  
  // Get the base bike fixture
  const baseFixture = { ...BIKE_FIXTURES[randomType] };
  
  // Apply any custom options
  const mergedDetails = { ...baseFixture, ...options };
  
  return createMockBikeListing(mergedDetails);
}

/**
 * Generates a random non-bike listing HTML
 * @param {Object} options - Options to customize the generation
 * @returns {string} Generated HTML content
 */
function generateRandomNonBikeListing(options = {}) {
  const nonBikeTypes = Object.keys(NON_BIKE_FIXTURES);
  const randomType = nonBikeTypes[Math.floor(Math.random() * nonBikeTypes.length)];
  
  // Get the base fixture
  const baseFixture = { ...NON_BIKE_FIXTURES[randomType] };
  
  // Apply any custom options
  const mergedDetails = { ...baseFixture, ...options };
  
  return createMockNonBikeListing(mergedDetails);
}

/**
 * Generates a dataset of bike listings for testing
 * @param {number} count - Number of listings to generate
 * @param {Object} options - Options to customize generation
 * @returns {Array<Object>} Array of generated listings with their data
 */
function generateBikeDataset(count = 10, options = {}) {
  const dataset = [];
  const bikeTypes = Object.keys(BIKE_FIXTURES);
  
  for (let i = 0; i < count; i++) {
    // Cycle through bike types
    const bikeType = bikeTypes[i % bikeTypes.length];
    const baseFixture = { ...BIKE_FIXTURES[bikeType] };
    
    // Apply variations for diversity
    const modifiedFixture = {
      ...baseFixture,
      price: `$${(Math.random() * 5000 + 500).toFixed(0)}`,
      postId: Math.floor(Math.random() * 100000000).toString(),
      postedDate: new Date().toISOString().split('T')[0]
    };
    
    // Apply any custom options
    const finalDetails = { ...modifiedFixture, ...options };
    
    // Generate HTML
    const html = createMockBikeListing(finalDetails);
    
    dataset.push({
      details: finalDetails,
      html: html
    });
  }
  
  return dataset;
}

/**
 * Generates various HTML fixtures with specific challenges for testing
 * @param {string} challenge - Type of challenge ('missing', 'malformed', etc.)
 * @returns {string} Generated HTML with the specific challenge
 */
function generateChallengeFixture(challenge) {
  const baseFixture = BIKE_FIXTURES.roadBike;
  let html = createMockBikeListing(baseFixture);
  
  switch (challenge) {
    case 'missing-price':
      html = html.replace(/<span class="price">\$[^<]+<\/span>/, '');
      break;
    case 'missing-title':
      html = html.replace(/<h1 class="postingtitletext">[^<]+<\/h1>/, '');
      break;
    case 'empty-body':
      html = html.replace(/<div id="postingbody">[^<]+<\/div>/, '<div id="postingbody"></div>');
      break;
    case 'no-brand':
      html = html.replace(/Trek/g, 'Unknown Brand');
      break;
    case 'unusual-size':
      html = html.replace(/56cm/, 'Size Medium-Large');
      break;
    case 'mixed-case-attributes':
      html = html.replace(/condition: excellent/i, 'Condition: ExCeLLeNt');
      break;
  }
  
  return html;
}

/**
 * Creates a varied set of test cases with multiple parameters
 * @returns {Array<Object>} Array of test case objects
 */
function generateParamTestCases() {
  return [
    {
      name: 'road bike with standard attributes',
      fixture: BIKE_FIXTURES.roadBike,
      expected: {
        brand: 'Trek',
        bikeType: 'road',
        frameSize: '56cm',
        wheelSize: '700c'
      }
    },
    {
      name: 'mountain bike with large frame',
      fixture: BIKE_FIXTURES.mountainBike,
      expected: {
        brand: 'Specialized',
        bikeType: 'mountain',
        frameSize: 'L',
        wheelSize: '29'
      }
    },
    {
      name: 'problematic bike with missing elements',
      fixture: { ...BIKE_FIXTURES.roadBike, price: null, frameSize: '?' },
      expected: {
        brand: 'Trek',
        bikeType: 'road',
        frameSize: null,
        price: null
      }
    }
  ];
}

module.exports = {
  generateRandomBikeListing,
  generateRandomNonBikeListing,
  generateBikeDataset,
  generateChallengeFixture,
  generateParamTestCases
};
