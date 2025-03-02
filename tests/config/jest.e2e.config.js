module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  testMatch: [
    "**/__tests__/**/*.e2e.test.js",
    "**/__tests__/**/integration.test.js",
    "**/__tests__/**/bikeParser.test.js",
    "**/__tests__/**/bikeParser.robustness.test.js"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/utils/"
  ],
  setupFilesAfterEnv: [
    "<rootDir>/__tests__/setup-e2e.js"
  ]
};
