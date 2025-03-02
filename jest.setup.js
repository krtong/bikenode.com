// Check if we're running alongside Selenium
global.RUNNING_WITH_SELENIUM = process.env.RUNNING_WITH_SELENIUM === 'true';

// Polyfill for TextEncoder/TextDecoder which is required by jsdom
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Chrome API for all tests
global.chrome = {
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    }
  }
};

// Mock fetch for tests that use it
global.fetch = jest.fn(() => 
  Promise.resolve({
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    ok: true
  })
);

// Only mock document methods if document exists (in jsdom environment)
if (typeof document !== 'undefined') {
  document.execCommand = jest.fn();
}

// Add Puppeteer wait function if it's missing
if (global.page && !global.page.waitForTimeout) {
  global.page.waitForTimeout = function(timeout) {
    return this.evaluate(timeout => new Promise(resolve => setTimeout(resolve, timeout)), timeout);
  };
}

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Shared browser instance when running with Selenium
// This prevents creating and destroying browser instances
global.sharedBrowser = null;

// Add shutdown hook to ensure browsers are closed properly
if (!global.RUNNING_WITH_SELENIUM) {
  afterAll(async () => {
    if (global.sharedBrowser) {
      await global.sharedBrowser.close();
      global.sharedBrowser = null;
    }
  });
}

// Increase timeout for all tests
jest.setTimeout(30000);