/**
 * Test utilities for bike parser extension testing
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

/**
 * Creates a fixture file with the provided HTML content
 * @param {string} filename - The fixture filename
 * @param {string} htmlContent - The HTML content to write
 * @returns {string} The full path to the created fixture
 */
function createFixtureFile(filename, htmlContent) {
  const fixturesDir = path.join(__dirname, '..', 'fixtures');
  
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }
  
  const filePath = path.join(fixturesDir, filename);
  fs.writeFileSync(filePath, htmlContent);
  
  return filePath;
}

/**
 * Deletes a fixture file
 * @param {string} filename - The fixture filename
 */
function deleteFixtureFile(filename) {
  const filePath = path.join(__dirname, '..', 'fixtures', filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Creates a mock Craigslist bike listing HTML
 * @param {Object} bikeDetails - Details about the bike listing
 * @returns {string} Generated HTML content
 */
function createMockBikeListing(bikeDetails = {}) {
  const {
    title = 'Trek Domane SL5 Road Bike - 56cm - $2500 (San Francisco)',
    brand = 'Trek',
    model = 'Domane SL5',
    bikeType = 'road bike',
    frameSize = '56cm',
    frameMaterial = 'Carbon',
    componentGroup = '105',
    wheelSize = '700c',
    price = '$2500',
    condition = 'excellent',
    location = 'San Francisco, CA',
    postId = '12348765',
    postedDate = '2023-06-01 14:30',
    description = 'Trek Domane SL5 in excellent condition, 56cm frame size. Carbon frame, Shimano 105 groupset. 700c wheels, hydraulic disc brakes. Low miles, no crashes.'
  } = bikeDetails;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
      </head>
      <body>
        <section class="breadcrumbs">bikes > ${bikeType}</section>
        <h1 class="postingtitletext">${brand} ${model} - ${frameSize}</h1>
        <span class="price">${price}</span>
        <div id="postingbody">
          ${description}
        </div>
        <div class="attrgroup">
          <span>condition: ${condition}</span>
          <span>make: ${brand}</span>
          <span>model: ${model}</span>
        </div>
        <div class="mapaddress">${location}</div>
        <div class="postinginfos">
          post id: ${postId}
          posted: ${postedDate}
        </div>
        <div class="gallery">
          <img src="bike1.jpg">
          <img src="bike2.jpg">
        </div>
      </body>
    </html>
  `;
}

/**
 * Creates a mock non-bike listing HTML
 * @param {Object} listingDetails - Details about the listing
 * @returns {string} Generated HTML content
 */
function createMockNonBikeListing(listingDetails = {}) {
  const {
    title = 'Coffee Table - $100 (San Francisco)',
    itemType = 'furniture',
    price = '$100',
    condition = 'good',
    location = 'San Francisco, CA',
    postId = '98765432',
    postedDate = '2023-06-02 10:45',
    description = 'Modern coffee table in good condition. Wood and glass. 48" long, 24" wide, 18" tall.'
  } = listingDetails;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
      </head>
      <body>
        <section class="breadcrumbs">${itemType}</section>
        <h1 class="postingtitletext">${title.split(' - ')[0]}</h1>
        <span class="price">${price}</span>
        <div id="postingbody">
          ${description}
        </div>
        <div class="attrgroup">
          <span>condition: ${condition}</span>
        </div>
        <div class="mapaddress">${location}</div>
        <div class="postinginfos">
          post id: ${postId}
          posted: ${postedDate}
        </div>
        <div class="gallery">
          <img src="table.jpg">
        </div>
      </body>
    </html>
  `;
}

/**
 * Creates a mock environment for testing the parser with a provided HTML
 * @param {string} htmlContent - HTML content to create mock environment with
 * @returns {Object} Context with parser functions
 */
function setupMockEnvironment(htmlContent) {
  const bikeParserPath = path.join(__dirname, '../../web_extension/chrome/bikeParser.js');
  const bikeParserCode = fs.readFileSync(bikeParserPath, 'utf8');
  
  // Create a mock DOM
  const dom = new JSDOM(htmlContent, { runScripts: "outside-only" });
  const { window } = dom;
  const { document } = window;
  
  // Set up console mock to capture logs
  const consoleLogs = {
    log: [],
    error: [],
    warn: [],
    info: []
  };
  
  const mockConsole = {
    log: (...args) => {
      consoleLogs.log.push(args);
    },
    error: (...args) => {
      consoleLogs.error.push(args);
    },
    warn: (...args) => {
      consoleLogs.warn.push(args);
    },
    info: (...args) => {
      consoleLogs.info.push(args);
    }
  };
  
  // Create a global context for our parser functions
  const context = {
    window,
    document,
    console: mockConsole,
    extractBikeData: null,
    isBikePost: null,
    extractFrameSize: null,
    extractBikeBrand: null,
    extractBikeType: null,
    extractWheelSize: null,
    consoleLogs
  };
  
  // Evaluate the parser code in our context
  const script = new Function('window', 'document', 'console', `
    ${bikeParserCode};
    this.extractBikeData = extractBikeData;
    this.isBikePost = isBikePost;
    this.extractFrameSize = extractFrameSize;
    this.extractBikeBrand = extractBikeBrand;
    this.extractBikeType = extractBikeType;
    this.extractWheelSize = extractWheelSize;
    this.COMMON_BIKE_BRANDS = COMMON_BIKE_BRANDS;
    this.BIKE_TYPES = BIKE_TYPES;
  `);
  
  try {
    script.call(context, window, document, mockConsole);
  } catch (e) {
    console.error('Error evaluating script:', e);
    context.scriptError = e;
  }
  
  return context;
}

/**
 * Wait for a specific time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the specified time
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 * @param {Function} conditionFn - Function that returns a boolean
 * @param {Object} options - Options
 * @param {number} options.timeout - Timeout in ms
 * @param {number} options.interval - Check interval in ms
 * @returns {Promise} Promise that resolves when condition is true
 */
async function waitForCondition(conditionFn, options = {}) {
  const { timeout = 10000, interval = 100 } = options;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await conditionFn()) {
      return true;
    }
    await wait(interval);
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

module.exports = {
  createFixtureFile,
  deleteFixtureFile,
  createMockBikeListing,
  createMockNonBikeListing,
  setupMockEnvironment,
  wait,
  waitForCondition
};
