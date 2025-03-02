// Add Puppeteer wait function if it's missing
beforeAll(() => {
  // Add waitForTimeout to page if it doesn't exist
  if (global.page && !global.page.waitForTimeout) {
    global.page.waitForTimeout = function(timeout) {
      return this.evaluate(timeout => new Promise(resolve => setTimeout(resolve, timeout)), timeout);
    };
  }
});

// Increase timeout for all tests
jest.setTimeout(60000);
