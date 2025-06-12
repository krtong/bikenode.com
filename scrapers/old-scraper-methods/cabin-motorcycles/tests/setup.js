// Test setup file
require('dotenv').config({ path: '../.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise during tests
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}

// Global test utilities
global.testUtils = {
  // Helper to create a mock PostgreSQL client
  createMockClient: () => ({
    query: jest.fn(),
    release: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  }),
  
  // Helper to create a mock pool
  createMockPool: () => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  }),

  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Clean up after all tests
afterAll(async () => {
  // Force exit after tests complete to avoid hanging
  await new Promise(resolve => setTimeout(resolve, 1000));
});