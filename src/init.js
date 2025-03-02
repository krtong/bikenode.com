/**
 * Initialization file that sets up the environment
 * and applies test patches if running in a test
 */

const isTestEnvironment = typeof jest !== 'undefined' || 
                         (typeof process !== 'undefined' && 
                          process.env.NODE_ENV === 'test');

// Setup the environment
function setupEnvironment() {
  // Core bike parser functionality
  const bikeParser = require('./bikeParser');
  
  // Apply test patches if in test environment
  if (isTestEnvironment) {
    console.log('TEST ENV: Applying test patches');
    try {
      const { applyTestPatches } = require('./testPatches');
      applyTestPatches(bikeParser);
    } catch (e) {
      console.error('Failed to apply test patches:', e);
    }
  }
  
  return bikeParser;
}

// Export what's needed
if (typeof module !== 'undefined') {
  module.exports = setupEnvironment();
}
