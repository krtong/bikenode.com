// Mock Chrome API
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