module.exports = {
  // Set up the test environment
  testEnvironment: 'jsdom',
  
  // Setup file to run before each test file
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Exclude utility files and setup files from being treated as test files
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/utils/',
    '/__tests__/fixtures/',
    '/__tests__/setup-e2e.js',
    '/__tests__/testHelper.js'
  ],
  
  // Handle timeouts better
  testTimeout: 30000,
  
  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '!**/__tests__/e2e.test.js',
    '!**/__tests__/integration.test.js',
    '!**/__tests__/extension.e2e.test.js',
    '!**/__tests__/contentExtraction.test.js',
  ],
  moduleNameMapper: {
    "\\.(css|less)$": "<rootDir>/__mocks__/styleMock.js"
  },
  // Add these options to support ES modules
  transformIgnorePatterns: [
    "/node_modules/(?!.*\\.mjs$)"
  ]
};