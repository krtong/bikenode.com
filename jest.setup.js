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

// Mock document methods not in jsdom
document.execCommand = jest.fn();

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});