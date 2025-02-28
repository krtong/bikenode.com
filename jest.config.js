module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./jest.setup.js'],
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  testPathIgnorePatterns: process.env.RUN_E2E ? [] : ['\\.e2e\\.test\\.js$'],
  moduleNameMapper: {
    "\\.(css|less)$": "<rootDir>/__mocks__/styleMock.js"
  },
  // Add these options to support ES modules
  transformIgnorePatterns: [
    "/node_modules/(?!.*\\.mjs$)"
  ]
};