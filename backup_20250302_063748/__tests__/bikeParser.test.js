const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Load the bikeParser module directly
const bikeParserPath = path.join(__dirname, '../web_extension/chrome/bikeParser.js');
const bikeParserCode = fs.readFileSync(bikeParserPath, 'utf8');

// Create a mock environment to test the parser
function setupMockEnvironment(htmlContent) {
  // Create a mock DOM with proper error handling
  try {
    const dom = new JSDOM(htmlContent);
    const { window } = dom;
    const { document } = window;
    
    // Enhanced console for debugging
    const mockConsole = {
      log: (...args) => console.log('TEST ENV:', ...args),
      error: (...args) => console.error('TEST ENV ERROR:', ...args),
      warn: (...args) => console.warn('TEST ENV WARN:', ...args),
    };
    
    // Create a global context for our parser functions
    const context = {
      window,
      document,
      console: mockConsole,
      extractBikeData: null,
      isBikePost: null,
    };
    
    // Evaluate the parser code in our context with proper error handling
    try {
      const script = new Function('window', 'document', 'console', `
        ${bikeParserCode};
        this.extractBikeData = extractBikeData;
        this.isBikePost = isBikePost;
        this.extractFrameSize = extractFrameSize;
        this.extractBikeBrand = extractBikeBrand;
        this.extractBikeType = extractBikeType;
        this.extractComponentGroup = extractComponentGroup;
        this.extractFrameMaterial = extractFrameMaterial;
        this.extractWheelSize = extractWheelSize;
        this.extractCondition = extractCondition;
      `);
      script.call(context, window, document, mockConsole);
    } catch (err) {
      console.error('Error evaluating parser script:', err);
      context.scriptError = err;
    }
    
    return context;
  } catch (err) {
    console.error('Error creating mock DOM:', err);
    return {
      scriptError: err,
      window: null,
      document: null
    };
  }
}

// Test fixtures - HTML snippets simulating Craigslist listings
const BIKE_LISTING_HTML = `
  <html>
    <head>
      <title>Trek Domane SL 5 Road Bike - 54cm - $2200 (Berkeley)</title>
    </head>
    <body>
      <section class="breadcrumbs">bikes</section>
      <h1 class="postingtitletext">Trek Domane SL 5 Road Bike - 54cm</h1>
      <span class="price">$2200</span>
      <div id="postingbody">
        Up for sale is my 2019 Trek Domane SL 5. Excellent condition with only 1500 miles.
        54cm frame size, carbon frame, full Shimano 105 groupset.
        700c wheels, perfect for long road rides.
      </div>
      <div class="mapaddress">Berkeley, CA</div>
      <div class="postinginfos">
        post id: 12345678
        posted: 2023-05-15 10:30
        updated: 2023-05-16 12:45
      </div>
      <div class="gallery">
        <img src="image1.jpg">
        <img src="image2.jpg">
      </div>
    </body>
  </html>
`;

const NON_BIKE_LISTING_HTML = `
  <html>
    <head>
      <title>Coffee Table - $100 (San Francisco)</title>
    </head>
    <body>
      <section class="breadcrumbs">furniture</section>
      <h1 class="postingtitletext">Coffee Table - Good Condition</h1>
      <span class="price">$100</span>
      <div id="postingbody">
        Sturdy coffee table, wood finish. 48 inches long by 24 inches wide.
        Minor scratches but overall good condition. Must pick up.
      </div>
      <div class="mapaddress">San Francisco, CA</div>
      <div class="postinginfos">
        post id: 87654321
        posted: 2023-05-14 15:20
      </div>
      <div class="gallery">
        <img src="table.jpg">
      </div>
    </body>
  </html>
`;

const MOUNTAIN_BIKE_HTML = `
  <html>
    <head>
      <title>Specialized Stumpjumper MTB - L - $3500 (Mill Valley)</title>
    </head>
    <body>
      <section class="breadcrumbs">bikes</section>
      <h1 class="postingtitletext">Specialized Stumpjumper MTB - L</h1>
      <span class="price">$3500</span>
      <div id="postingbody">
        2021 Specialized Stumpjumper FSR, large frame size.
        Carbon frame, Fox suspension, SRAM GX Eagle groupset.
        29" wheels, excellent condition, low miles.
      </div>
      <div class="attrgroup">
        <span>condition: like new</span>
      </div>
      <div class="mapaddress">Mill Valley, CA</div>
      <div class="postinginfos">
        post id: 13579246
        posted: 2023-05-10 09:15
      </div>
    </body>
  </html>
`;

describe('Bike Parser Tests', () => {
  test('Should correctly identify a bike listing', () => {
    const env = setupMockEnvironment(BIKE_LISTING_HTML);
    
    // Check if there was an error during setup
    if (env.scriptError) {
      console.error('Script error in test setup:', env.scriptError);
      expect(env.scriptError).toBeUndefined();
      return;
    }
    
    const isBike = env.isBikePost(env.document);
    expect(isBike).toBe(true);
  });
  
  test('Should correctly identify a non-bike listing', () => {
    const env = setupMockEnvironment(NON_BIKE_LISTING_HTML);
    
    // Check if there was an error during setup
    if (env.scriptError) {
      console.error('Script error in test setup:', env.scriptError);
      expect(env.scriptError).toBeUndefined();
      return;
    }
    
    const isBike = env.isBikePost(env.document);
    expect(isBike).toBe(false);
  });
  
  test('Should extract basic listing details', () => {
    const env = setupMockEnvironment(BIKE_LISTING_HTML);
    
    // Check if there was an error during setup
    if (env.scriptError) {
      console.error('Script error in test setup:', env.scriptError);
      expect(env.scriptError).toBeUndefined();
      return;
    }
    
    const data = env.extractBikeData(env.document);
    
    expect(data.title).toContain('Trek Domane SL 5');
    expect(data.isBikeListing).toBe(true);
    expect(data.postId).toBe('12345678');
    expect(data.price).toBe('$2200');
    expect(data.location).toBe('Berkeley, CA');
    expect(data.images).toHaveLength(2);
  });
  
  test('Should extract specific road bike details', () => {
    const env = setupMockEnvironment(BIKE_LISTING_HTML);
    
    // Check if there was an error during setup
    if (env.scriptError) {
      console.error('Script error in test setup:', env.scriptError);
      expect(env.scriptError).toBeUndefined();
      return;
    }
    
    const data = env.extractBikeData(env.document);
    
    expect(data.brand).toBe('Trek');
    expect(data.bikeType).toBe('road');
    expect(data.frameSize).toBe('54cm');
    expect(data.frameMaterial).toBe('Carbon');
    expect(data.componentGroup).toBe('105');
    expect(data.wheelSize).toBe('700c');
  });
  
  test('Should extract specific mountain bike details', () => {
    const env = setupMockEnvironment(MOUNTAIN_BIKE_HTML);
    
    // Check if there was an error during setup
    if (env.scriptError) {
      console.error('Script error in test setup:', env.scriptError);
      expect(env.scriptError).toBeUndefined();
      return;
    }
    
    const data = env.extractBikeData(env.document);
    
    expect(data.brand).toBe('Specialized');
    expect(data.bikeType).toBe('mountain');
    expect(data.frameSize).toBe('L');
    expect(data.frameMaterial).toBe('Carbon');
    // SRAM GX instead of just GX
    expect(['GX', 'GX Eagle', 'SRAM GX', 'SRAM GX Eagle'].includes(data.componentGroup)).toBeTruthy();
    expect(data.wheelSize).toBe('29"');
    expect(data.condition).toBe('like new');
  });
});
